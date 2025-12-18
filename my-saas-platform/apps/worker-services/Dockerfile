FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
