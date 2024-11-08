ARG EM_METRICS_VERSION=-1

# In 23.1 npm gets stuck
FROM node:23-alpine3.19

WORKDIR /app

COPY . /app

RUN npm i --cpu x86

ENV EM_METRICS_VERSION=$EM_METRICS_VERSION

CMD npm start
