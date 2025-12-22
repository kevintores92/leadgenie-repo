# Backend API Dockerfile - Updated for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install ALL dependencies (including dev deps needed for Prisma)
RUN npm ci

ENV NODE_ENV=production

# Expose port
EXPOSE 5000

CMD ["node", "src/server.js"]
RUN npx prisma generate || true

ENV PORT 4000

# run migrations at container start, then start server
CMD ["sh","-c","npx prisma migrate deploy && node src/server.js"]
