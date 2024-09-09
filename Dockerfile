FROM node:22-alpine as base
RUN npm install --global npm --silent
WORKDIR /usr/src/app
COPY package*.json ./

FROM base as production
ENV NODE_ENV=production
RUN npm i -g npm --slent && npm ci --silent
COPY . .
CMD ["npm", "start"]

FROM base as dev
ENV NODE_ENV=development \
  LOCAL_DEV=true
RUN npm i -g npm && npm install
COPY . .
CMD ["npm", "run", "dev"]
