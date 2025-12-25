# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage - use Node to serve with 'serve'
FROM node:20-alpine

WORKDIR /app

# Install serve globally for serving static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Railway sets PORT env var)
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
