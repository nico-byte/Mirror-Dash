FROM node:22-alpine3.19.1

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

EXPOSE 9000

CMD [ "node", "server.js" ]