FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Copy prisma schema
COPY prisma ./prisma

# Install dependencies and generate Prisma client
RUN npm ci --omit=dev

# Copy everything else
COPY . .

ENV NODE_ENV=production

# Expose port
EXPOSE 5000

CMD ["node", "src/server.js"]
RUN npx prisma generate || true

ENV PORT 4000

# run migrations at container start, then start server
CMD ["sh","-c","npx prisma migrate deploy && node src/server.js"]
