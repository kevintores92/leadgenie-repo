# Backend API Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev deps for Prisma)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node src/server.js"]
