FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci

RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production
ENV PORT=5000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node src/server.js"]
