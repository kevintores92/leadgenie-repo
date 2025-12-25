# Worker Services Setup & Troubleshooting

## Overview
The worker-services component handles background jobs, SMS campaigns, and inbound message processing using BullMQ and Redis.

## Prerequisites
- Node.js 18+
- Redis running and accessible
- PostgreSQL database running
- Environment variables properly configured

## Environment Setup

### 1. Create `.env` file
Copy the `.env.example` and update with your actual values:

```bash
cp .env.example .env
```

### 2. Configure Required Environment Variables

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/leadgenie"

# Redis configuration
REDIS_URL="redis://localhost:6379"
# OR individual parts:
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="" (if needed)
REDIS_TLS="false" (set to "true" for TLS connections)

# Twilio configuration
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"

# LLM API key
LLM_API_KEY="your_api_key"

# Node environment
NODE_ENV="production"
```

## Installation & Setup

### Local Development

```bash
# Install dependencies (automatically generates Prisma client)
npm install

# Run the worker service
npm start

# Seed database (if needed)
npm run seed
```

### Docker Setup

The Dockerfile is configured to:
1. Copy the entire repo
2. Install root dependencies
3. Install worker-services dependencies (which triggers Prisma client generation via postinstall hook)
4. Run the campaign sender

```bash
docker build -t worker-services .
docker run --env-file .env worker-services
```

## Prisma Configuration

The worker-services uses Prisma to interact with the database:

- **Schema Location**: `./prisma/schema.prisma`
- **Configuration**: Added `"prisma": { "schema": "./prisma/schema.prisma" }` to package.json
- **Client Generation**: Automatic via `postinstall` script in package.json
- **Error Format**: Set to 'pretty' for better debugging

### If Prisma Client Generation Fails

1. **Check DATABASE_URL is set**:
   ```bash
   echo $DATABASE_URL
   ```

2. **Manually regenerate**:
   ```bash
   npx prisma generate
   ```

3. **Verify schema location**:
   ```bash
   ls -la ./prisma/schema.prisma
   ```

## Common Issues & Solutions

### Error: "Could not find Prisma Schema"

**Cause**: Prisma cannot locate the schema file or DATABASE_URL is not set

**Solutions**:
1. Ensure `.env` file exists with `DATABASE_URL` set
2. Run `npm install` from the worker-services directory
3. Verify `./prisma/schema.prisma` exists
4. Check working directory is `/app/my-saas-platform/apps/worker-services`

### Error: "Cannot find module '@prisma/client'"

**Cause**: Dependencies not installed or Prisma client not generated

**Solutions**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Ensure postinstall hook runs successfully

### Redis Connection Issues

**Cause**: Redis not running or connection parameters incorrect

**Solutions**:
1. Verify Redis is running: `redis-cli ping` (should return "PONG")
2. Check `REDIS_URL` or individual `REDIS_HOST`/`REDIS_PORT` settings
3. For TLS connections, ensure `REDIS_TLS="true"` and certificate paths are correct

### Service Crashes on Startup

**Debugging**:
1. Check logs: `npm start 2>&1 | tee service.log`
2. Verify all environment variables are set: `env | grep -E "DATABASE|REDIS|TWILIO"`
3. Test database connection: `npm run seed`

## Service Components

### campaignSender.js
Main service that:
- Monitors Redis queue for campaign jobs
- Processes SMS campaigns
- Manages warmup schedules
- Routes messages to Twilio

### inboundProcessor.ts
Processes incoming messages:
- Receives inbound SMS
- Classifies with AI
- Updates contact status
- Triggers auto-replies if enabled

### warmupJob.js
Phone number warmup schedule:
- Gradually increases sending volume
- Transitions phones from WARMING → ACTIVE
- Follows configurable warmup schedule

### ai-classifier-worker.js
AI-based message classification:
- Uses LLM to classify messages
- Extracts flags and intent
- Updates conversation state

## Monitoring

The service includes logging for:
- Startup initialization
- Queue processing
- Error conditions
- Prisma query issues

Enable detailed logging:
```bash
DEBUG=* npm start
```

## Version Information

- Node: 18-alpine (Docker)
- Prisma Client: ^5.22.0
- Prisma CLI: ^5.22.0
- BullMQ: ^1.82.0
- Redis: ^5.3.2
- Twilio: ^4.3.0

## Related Documentation

- [Backend API Setup](../backend-api/README.md)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
