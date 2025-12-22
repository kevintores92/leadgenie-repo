FROM node:20-alpine

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma/ ./prisma/

# Install dependencies (this will also run postinstall and generate Prisma client)
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
