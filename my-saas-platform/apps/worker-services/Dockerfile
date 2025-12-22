FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci

RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
