# Worker Services Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
