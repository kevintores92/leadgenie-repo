FROM node:18-alpine

WORKDIR /app

COPY . ./

RUN npm ci

# Ensure Prisma can find schema
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/query-engine-linux-musl

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
