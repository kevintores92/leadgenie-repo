# Backend API Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node src/server.js"]
