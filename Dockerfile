# In 23.1 npm gets stuck
FROM node:23-alpine3.19

# ARGs are scoped to this FROM
ARG NODE_ENV=production
ARG EM_METRICS_VERSION=-1

WORKDIR /app

COPY . /app

ENV NODE_ENV=$NODE_ENV
RUN npm i --cpu x86

ENV EM_METRICS_VERSION=$EM_METRICS_VERSION

CMD npm start
