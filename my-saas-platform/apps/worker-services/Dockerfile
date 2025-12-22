FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Copy prisma schema
COPY prisma ./prisma

# Install dependencies (this will also run postinstall and generate Prisma client)
RUN npm ci --omit=dev

# Copy everything else
COPY . .

ENV NODE_ENV=production

CMD ["node", "src/campaignSender.js"]
