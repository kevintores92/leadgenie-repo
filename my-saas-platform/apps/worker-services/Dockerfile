FROM node:18-alpine

WORKDIR /app

# Copy the entire repo first
COPY . ./

# Install all dependencies (including Prisma client generation via postinstall)
RUN npm ci

# Change to worker service directory
WORKDIR /app/my-saas-platform/apps/worker-services

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
