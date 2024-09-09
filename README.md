# aws-bedrock-foundation-models

[![Build AWS Bedrock Foundation Models List](https://github.com/cu-cit-cloud-team/aws-bedrock-foundation-models/actions/workflows/build-models-list.yml/badge.svg)](https://github.com/cu-cit-cloud-team/aws-bedrock-foundation-models/actions/workflows/build-models-list.yml)

Workflow/script that collects the current list of AWS Bedrock Foundation Models that have
Marketplace costs associated with using them and then generates and serves a JSON file
with that list.

## Contents

- `./src/index.ts`
  - main script
- `./package.json`/`./package-lock.json`
  - script dependencies and dev/linter config
- `./docs/` (served via HTTPS by GH Pages)
  - `./docs/list/index.json`
    - JSON file generated and used by script
    - <https://cu-cit-cloud-team.github.io/aws-bedrock-foundation-models/list/>
- `./.github/dependabot.yml`
  - Dependabot config set to check daily for GH Actions and npm dependency updates
- `./.github/workflows/build-services-list.yml`
  - GH Action Workflow used to execute script/update repo
- Misc Development Related Files
  - Docker-related files included to help with local dev
    - `./Dockerfile`
    - `./.dockerignore`
    - `./docker-compose.yml`
  - Editor config files
    - `./.editorConfig`
    - `./tsconfig.json`

## Prerequisites

To run locally for testing, development, etc.

- Node.js >= v20.x (with npm >= v10.x)

OR

- Docker

## Behavior

1. Script makes HTTP call to AWS Bedrock Foundation Models page and checks for updates to the page since the last time it ran
1. Script outputs a JSON file
    - JSON is used by the script and served via GH Pages
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
