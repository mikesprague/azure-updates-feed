import fs from 'node:fs';
import * as core from '@actions/core';
import * as cheerio from 'cheerio';
import * as playwright from 'playwright';

const { hrtime } = process;

export type PostsObject = {
  date: string;
  linkId: string;
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
    linkId: string;
    title: string;
    category: string;
    description: string;
  };
  userAgent?: string;
  jsonFileName: string;
  jsonOutputDir: string;
  rssFileName: string;
  rssOutputDir: string;
  linkPrefix: string;
}

(async () => {
  const debugStart = hrtime();

  // object with defaults/settings used in script
  const config: Config = {
    url: 'https://azure.microsoft.com/en-us/updates/',
    selectors: {
      updateRow: 'ul#accordion-container > li',
      date: 'div.updated_dates > div.modified_date > span',
      linkId:
        'div.all_sections.col-sm-9.pl-0 > div.roadMapId_section > div.value',
      title: 'button > div.ocr-faq-item__header--title > p.lead',
      category:
        'div.all_sections.col-sm-9.pl-0 > div.platforms_section > div.value',
      description: 'div.accordion-item.col-xl-8',
    },
    jsonFileName: 'index.json',
    jsonOutputDir: 'docs/json/',
    rssFileName: 'feed.rss',
    rssOutputDir: 'docs/rss/',
    linkPrefix: 'https://azure.microsoft.com/en-us/updates/?id=',
  };

  // read in previous results to use for comparison
  const lastResults: ResultsObject = JSON.parse(
    fs.readFileSync(`${config.jsonOutputDir}${config.jsonFileName}`, 'utf-8')
  );

  // object to hold JSON items
  const updatesList: ResultsObject = {
    lastUpdated: undefined,
    posts: [],
  };

  // array to hold RSS items
  const rssItems: string[] = [];

  // helper function to encode HTML entities
  const encodeHtmlEntities = (str: string) => {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, (i) => {
      return `&#${i.charCodeAt(0)};`;
    });
  };

  // instantiate playwright
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // go to URL and wait for content to load
  await page.goto(config.url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector(config.selectors.updateRow);

  // get page content
  const markup = await page.content();

  // close browser
  await browser.close();

  // instantiate cheerio with markup from earlier http request
  const $ = cheerio.load(markup);

  // loop over updates and add to array in results object
  console.log($(config.selectors.updateRow).length);
  $(config.selectors.updateRow).each((i, elem) => {
    const date = $(elem).find(config.selectors.date).text().trim();
    const linkId = $(elem).find(config.selectors.linkId).text().trim();
    const title = $(elem).find(config.selectors.title).text().trim();
    const category = $(elem).find(config.selectors.category).text().trim();
    const description = $(elem)
      .find(config.selectors.description)
      .text()
      .trim();
    // if all data is present, add to results objects
    if (
      date?.length &&
      linkId?.length &&
      category?.length &&
      title?.length &&
      description?.length
    ) {
      updatesList.posts.push({
        date,
        linkId,
        title,
        category,
        description,
      });
      const rssItem = `    <item>
      <title>${encodeHtmlEntities(title)}</title>
      <link>${config.linkPrefix}${linkId}</link>
      <description>${encodeHtmlEntities(description)}</description>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      <guid>${config.linkPrefix}${linkId}</guid>
    </item>`;
      rssItems.push(rssItem);
    } else {
      // output missing data to run logs
      console.log(
        'Missing data for update:\n',
        `date: ${date}\n`,
        `title: ${title}\n`,
        `linkId: ${linkId}\n`,
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
