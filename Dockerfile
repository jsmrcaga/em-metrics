# In 23.1 npm gets stuck
FROM node:23-alpine3.19

WORKDIR /app

COPY . /app

RUN npm i --cpu x86

CMD npm start
