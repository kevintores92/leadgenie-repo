# Worker Services Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
