FROM node:18-alpine

WORKDIR /app

# Copy entire repo to preserve monorepo structure
COPY . ./

# Set working directory to worker service
WORKDIR /app/my-saas-platform/apps/worker-services

RUN npm ci --ignore-scripts

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
