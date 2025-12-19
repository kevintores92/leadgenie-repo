FROM node:18-alpine

WORKDIR /app

# Copy the entire repo first
COPY . ./

# Install dependencies from root
RUN npm ci --omit=dev

# Change to worker service directory
WORKDIR /app/my-saas-platform/apps/worker-services

# Install worker-services specific dependencies
RUN npm ci --omit=dev

# Generate Prisma client from correct directory
RUN npx prisma generate

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
