# Worker Services Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies (this will also run postinstall and generate Prisma client)
RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
