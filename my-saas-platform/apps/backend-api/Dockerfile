FROM node:18-alpine

WORKDIR /app

# install dependencies (including dev for prisma CLI on build)
COPY package.json package-lock.json ./
RUN npm ci

# copy app source
COPY . ./

# generate Prisma client
RUN npx prisma generate || true

ENV PORT 4000

# run migrations at container start, then start server
CMD ["sh","-c","npx prisma migrate deploy && node src/server.js"]
