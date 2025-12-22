FROM node:20-alpine

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma/ ./prisma/

# Install dependencies (postinstall will generate Prisma client and run migrations)
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

ENV NODE_ENV=production

# Expose port
EXPOSE 5000

CMD ["node", "src/server.js"]
RUN npx prisma generate || true

ENV PORT 4000

# run migrations at container start, then start server
CMD ["sh","-c","npx prisma migrate deploy && node src/server.js"]
