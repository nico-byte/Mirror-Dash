FROM node:22.15

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

EXPOSE 9000

CMD [ "node", "server.js" ]