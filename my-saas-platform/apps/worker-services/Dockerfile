FROM node:18-alpine

WORKDIR /app

COPY . ./

RUN npm ci

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
