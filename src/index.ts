import fs from 'node:fs';
import * as core from '@actions/core';
import * as cheerio from 'cheerio';

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
    jsonFileName: 'index.json',
    jsonOutputDir: 'docs/json/',
    rssFileName: 'feed.rss',
    rssOutputDir: 'docs/rss/',
  };

  // read in previous results to use for comparison
  const lastResults: ResultsObject = JSON.parse(
    fs.readFileSync(`${config.jsonOutputDir}${config.jsonFileName}`, 'utf-8')
  );

  // make http call to fetch html of updates page
  const markup = await fetch(config.url).then((response) => response.text());

  // object to hold JSON items
  const updatesList: ResultsObject = {
    lastUpdated: undefined,
    posts: [],
  };

  // instantiate cheerio with markup from earlier http request
  const $ = cheerio.load(markup);

  // array to hold RSS items
  const rssItems: string[] = [];

  // helper function to encode HTML entities
  const encodeHtmlEntities = (str: string) => {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, (i) => {
      return `&#${i.charCodeAt(0)};`;
    });
  };

  // loop over updates and add to array in results object
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

    // if all data is present, add to results objects
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
        title,
        category,
        description,
      });
      const rssItem = `    <item>
      <title>${encodeHtmlEntities(title)}</title>
      <link>${link}</link>
      <description>${encodeHtmlEntities(description)}</description>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      <guid>${link}</guid>
    </item>`;
      rssItems.push(rssItem);
    } else {
      // output missing data to run logs
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

  // set last updated date string and add it to results object
  updatesList.lastUpdated = new Date().toUTCString();

  // var with opening XML for RSS feed
  const rssStart = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Azure Updates Feed</title>
    <link>https://azure.microsoft.com/en-us/updates/</link>
    <description>Currently the Azure Updates page has no RSS enabled - this is a temp feed made by scraping that page for updates</description>
    <language>en-us</language>
    <atom:link href="https://mikesprague.github.io/azure-updates-feed/rss/feed.rss" rel="self" type="application/rss+xml" />
    <pubDate>${updatesList.lastUpdated}</pubDate>
`;

  // var with closing XML for RSS feed
  const rssEnd = `  </channel>
</rss>
`;

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
    console.log('No changes to Azure Updates page, nothing to process');
  }

  // output execution time
  const debugEnd = hrtime(debugStart);
  console.log(
    `Execution time: ${debugEnd[0] * 1000 + debugEnd[1] / 1000000}ms`
  );
})();
