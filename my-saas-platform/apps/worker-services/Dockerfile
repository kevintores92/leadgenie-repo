FROM node:18-alpine

WORKDIR /app

# Copy the entire repo first
COPY . ./

# Now change to worker service directory
WORKDIR /app/my-saas-platform/apps/worker-services

# Generate Prisma client BEFORE installing dependencies (which have postinstall hooks)
RUN npx prisma@5.5.0 generate --schema=./prisma/schema.prisma

# NOW install all dependencies (which won't re-generate Prisma)
RUN npm ci --ignore-scripts

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
