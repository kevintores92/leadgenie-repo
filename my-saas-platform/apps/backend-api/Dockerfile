FROM node:18-bullseye-slim

WORKDIR /app

# Install system deps required by Prisma and for building native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	openssl \
	build-essential \
	python3 \
 && rm -rf /var/lib/apt/lists/*

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
