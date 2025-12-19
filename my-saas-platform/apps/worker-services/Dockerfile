FROM node:18-alpine

WORKDIR /app

COPY . ./

RUN npm ci --ignore-scripts

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
