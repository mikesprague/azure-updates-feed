# azure-product-updates-feed

[![Build Azure Product Updates Feed](https://github.com/mikesprague/azure-product-updates-feed/actions/workflows/build-feed.yml/badge.svg)](https://github.com/mikesprague/azure-product-updates-feed/actions/workflows/build-feed.yml)

Workflow/script that collects the current list of Azure Product Updates and then
generates and serves an RSS and a JSON file with that list.

## Contents

- `./src/index.ts`
  - main script
- `./package.json`/`./package-lock.json`
  - script dependencies and dev/linter config
- `./docs/` (served via HTTPS by GH Pages)
  - `./docs/json/index.json`
    - JSON file generated and used by script
    - <https://mikesprague.github.io/azure-product-updates-feed/json/>
  - `./docs/feed/index.rss`
    - RSS feed generated and used by script
    - <https://mikesprague.github.io/azure-product-updates-feed/feed/>
- `./.github/dependabot.yml`
  - Dependabot config set to check daily for GH Actions and npm dependency updates
- `./.github/workflows/build-feed.yml`
  - GH Action Workflow used to execute script/update repo
- Misc Development Related Files
  - Docker-related files included to help with local dev
    - `./Dockerfile`
    - `./.dockerignore`
    - `./docker-compose.yml`
  - Config files
    - `./.editorConfig`
    - `./.gitignore`
    - `./biome.json`
    - `./tsconfig.json`

## Prerequisites

To run locally for testing, development, etc.

- Node.js >= v20.x (with npm >= v10.x)

OR

- Docker

## Behavior

1. Script makes HTTP call to Azure Product Updates page and checks for updates to the page since the last time it ran
1. Script outputs a JSON file
    - JSON is used by the script and served via GH Pages
1. Script outputs an RSS feed
    - RSS is served via GH Pages
1. Script only updates (writes new files) if the content has been updated.

## Local Development

- via Node.js/npm
  1. Install dependencies
      - `npm install`
  1. Execute script
      - `npm run dev` (or `npm start`)
- via Docker/docker-compose
  - `docker-compose up`
  - notes:
    - installs dependencies automatically while bringing container up
    - run to cleanup when you are done
      - `docker-compose down --rmi 'all'`
    - if both Docker and Node are installed, you can optionally use
      - `npm run docker-up`
        - the above command will  automatically call `npm run postdocker-up` when done and clean up after itself
