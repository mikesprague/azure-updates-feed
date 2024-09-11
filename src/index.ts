import fs from 'node:fs';
import * as core from '@actions/core';
import * as cheerio from 'cheerio';
import got from 'got';

const { hrtime } = process;

export type PostsObject = {
  date: string;
  link: string;
  title: string;
  category: string;
  description: string;
};

export type ResultsObject = {
  lastUpdated: string | undefined;
  posts: PostsObject[];
};

export interface Config {
  url: string;
  selectors: {
    updateRow: string;
    date: string;
    link: string;
    linkAlt: string;
    title: string;
    category: string;
    description: string;
  };
  userAgent?: string;
  jsonFileName: string;
  jsonOutputDir: string;
  rssFileName: string;
  rssOutputDir: string;
}

(async () => {
  const debugStart = hrtime();

  // object with defaults/settings used in script
  const config: Config = {
    url: 'https://azure.microsoft.com/en-us/updates/',
    selectors: {
      updateRow:
        '#layout-container-uidc0d6 > div > div > div.col.text-md-left.no-gutters.col-12.col-md-9 > div',
      date: '#areaheading-oc925a > div > div.col-12.col-md-8.col-xl-6 > div > p',
      link: 'h3 > span > a',
      linkAlt: 'section h3 > a',
      title: 'h3',
      category: '#richtext-oc8284 > div',
      description: '#richtext-oc7ca0 > div > p',
    },
    // userAgent: 'Script - Get Current AWS HIPAA Services List',
    jsonFileName: 'index.json',
    jsonOutputDir: 'docs/json/',
    rssFileName: 'index.rss',
    rssOutputDir: 'docs/feed/',
  };

  // read in previous results to get date for comparison
  const lastResults: ResultsObject = JSON.parse(
    fs.readFileSync(`${config.jsonOutputDir}${config.jsonFileName}`, 'utf-8')
  );

  // make http call to fetch html
  const markup = await got
    .get(config.url, {
      // headers: {
      //   'User-Agent': config.userAgent,
      // },
    })
    .then((response) => response.body);

  // create object to hold results
  const updatesList: ResultsObject = {
    lastUpdated: undefined,
    posts: [],
  };

  // instantiate cheerio with markup from earlier http request
  const $ = cheerio.load(markup);

  const rssStart = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Azure Product Updates Feed</title>
    <link>https://azure.microsoft.com/en-us/updates/</link>
    <description>Currently the Azure Product Updates page has no RSS enabled - this is a temp feed made by scraping that page for updates</description>
    <language>en-us</language>
    <pubDate>${new Date().toISOString()}</pubDate>
`;
  const rssEnd = `  </channel>
</rss>
`;

  const rssItems: string[] = [];

  const encodeHtmlEntities = (str: string) => {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, (i) => {
      return `&#${i.charCodeAt(0)};`;
    });
  };

  // if date strings are different, proceed with update
  // loop over services list and add to array in results object
  $(config.selectors.updateRow).each((i, elem) => {
    let date = $(elem).find(config.selectors.date).text().trim();
    date = `${date}, ${new Date().getFullYear()}`;
    let link = $(elem).find(config.selectors.link).attr('href');
    if (link === undefined) {
      link = $(elem).find(config.selectors.linkAlt).attr('href');
    }
    const title = $(elem).find(config.selectors.title).text().trim();
    const category = $(elem).find(config.selectors.category).text().trim();
    const description = $(elem)
      .find(config.selectors.description)
      .text()
      .trim();
    if (
      date?.length &&
      link?.length &&
      category?.length &&
      title?.length &&
      description?.length
    ) {
      updatesList.posts.push({
        date,
        link,
        title: encodeHtmlEntities(title),
        category,
        description: encodeHtmlEntities(description),
      });
      const rssItem = `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${date}</pubDate>
    </item>`;
      rssItems.push(rssItem);
    } else {
      console.log(
        'Missing data for update:\n',
        `date: ${date}\n`,
        `title: ${title}\n`,
        `link: ${link}\n`,
        `category: ${category}\n`,
        `description: ${description}\n`,
        'full element:',
        $(elem).text(),
        '\n'
      );
    }
  });

  // set last updated date string and add to results object
  updatesList.lastUpdated = new Date().toISOString();

  // console.log(updatesList);
  // console.log(rssStart);
  // console.log(rssItems.join('\n'));
  // console.log(rssEnd);

  // set var indicating if there are updates to process+
  const hasUpdates =
    JSON.stringify(lastResults.posts) !== JSON.stringify(updatesList.posts);

  if (hasUpdates) {
    // create JSON string from object data to write to file
    const jsonDataAsString = `${JSON.stringify(updatesList, null, 2)}\n`;

    // write json file
    const jsonFile = `${config.jsonOutputDir}${config.jsonFileName}`;
    await fs.writeFileSync(jsonFile, jsonDataAsString, {
      encoding: 'utf-8',
    });
    console.log(`JSON file written: ${jsonFile}`);

    // create string from RSS data to write to file
    const rssDataAsString = `${rssStart}${rssItems.join('\n')}\n${rssEnd}`;

    // write RSS file
    const rssFile = `${config.rssOutputDir}${config.rssFileName}`;
    await fs.writeFileSync(rssFile, rssDataAsString, {
      encoding: 'utf-8',
    });
    console.log(`RSS file written: ${rssFile}`);

    // set env var that workflow can use for conditional processing
    core.exportVariable('HAS_UPDATES', true);
  } else {
    // output to run logs
    console.log('No updates to services page, nothing to process');
  }

  // output execution time
  const debugEnd = hrtime(debugStart);
  console.log(
    `Execution time: ${debugEnd[0] * 1000 + debugEnd[1] / 1000000}ms`
  );
})();
