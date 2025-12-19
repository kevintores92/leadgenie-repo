FROM node:18-alpine

WORKDIR /app

# Copy the entire repo
COPY . ./

# Install root dependencies
RUN npm ci --omit=dev

# Install worker-services dependencies (postinstall generates Prisma client)
RUN cd my-saas-platform/apps/worker-services && npm ci --omit=dev

ENV NODE_ENV=production

WORKDIR /app/my-saas-platform/apps/worker-services

CMD ["node", "src/campaignSender.js"]
