// import fs from 'node:fs';
// import * as core from '@actions/core';
import * as cheerio from 'cheerio';
import got from 'got';

const { hrtime } = process;

export type ModelsObject = {
  name: string;
  productId: string;
};

export type ResultsObject = {
  lastUpdated: string | undefined;
  models: ModelsObject[];
};

export interface Config {
  url: string;
  selectors: {
    container: string;
    updates: string;
  };
  // userAgent: string;
  outputDir: string;
  fileName: string;
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
      tag: '#richtext-oc8284 > div',
      text: '#richtext-oc7ca0 > div > p',
    },
    // userAgent: 'Script - Get Current AWS HIPAA Services List',
    outputDir: 'docs/rss/',
    fileName: 'index.rss',
  };

  // read in previous results to get date for comparison
  // const lastResults = JSON.parse(
  //   fs.readFileSync('docs/list/index.json', 'utf-8')
  // );

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
    updates: [],
  };

  // instantiate cheerio with markup from earlier http request
  const $ = cheerio.load(markup);

  // if date strings are different, proceed with update
  // loop over services list and add to array in results object
  $(config.selectors.updateRow).each((i, elem) => {
    let date = $(elem).find(config.selectors.date).text().trim();
    date = `${date}, ${new Date().getFullYear()}`;
    let link = $(elem).find(config.selectors.link).attr('href');
    if (link === undefined) {
      link = $(elem).find(config.selectors.linkAlt).attr('href');
    }
    const tag = $(elem).find(config.selectors.tag).text().trim();
    const text = $(elem).find(config.selectors.text).text().trim();
    if (date?.length && link?.length && tag?.length && text?.length) {
      updatesList.updates.push({ date, link, tag, text });
    } else {
      console.log(
        'Missing data for update:\n',
        `date: ${date}\n`,
        `link: ${link}\n`,
        `tag: ${tag}\n`,
        `text: ${text}\n`,
        'full element:',
        $(elem).text(),
        '\n'
      );
    }
  });

  // set last updated date string and add to results object
  updatesList.lastUpdated = new Date().toISOString();

  console.log(updatesList);

  // set var indicating if there are updates to process
  // const hasUpdates =
  //   JSON.stringify(lastResults).models !==
  //   JSON.stringify(updatesList).models;

  // if (hasUpdates) {
  //   // create JSON string from object data to write to file
  //   const jsonDataAsString = `${JSON.stringify(updatesList, null, 2)}\n`;

  //   // write json file
  //   const jsonFileName = `${config.outputDir}${config.fileName}.json`;
  //   await fs.writeFileSync(jsonFileName, jsonDataAsString);
  //   console.log(`JSON file written: ${jsonFileName}`);

  //   // set env var that workflow can use for conditional processing
  //   core.exportVariable('HAS_UPDATES', true);
  // } else {
  //   // output to run logs
  //   console.log('No updates to services page, nothing to process');
  // }

  // output execution time
  const debugEnd = hrtime(debugStart);
  console.log(
    `Execution time: ${debugEnd[0] * 1000 + debugEnd[1] / 1000000}ms`
  );
})();
