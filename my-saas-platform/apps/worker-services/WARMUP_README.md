Warmup scheduling and operational notes

Overview
- The worker includes a daily warm-up job which increases `phoneNumber.warmupLevel` for numbers in `WARMING` state.
- There are two mechanisms that ensure warmup runs daily:
  1. An immediate startup run + setInterval inside `src/campaignSender.js` (fallback). 
  2. A BullMQ repeatable job implemented in `src/warmupScheduler.js` that schedules `warmup:run` daily via cron (default 04:00 UTC). This is the recommended production mechanism.

Configuration
- REDIS_URL or REDIS_HOST/REDIS_PORT must be set for BullMQ to work.
- Override cron schedule with `WARMUP_CRON` (cron expression). Default: `0 4 * * *` (every day at 04:00 UTC).

Run (dev)
- Ensure Redis is running locally.
- Start the worker (this starts campaign sender and warmup scheduler):

```bash
cd my-saas-platform/apps/worker-services
npm start
```

Run (production)
- Run `npm start` under a process manager (systemd, pm2, docker) and ensure only one instance controls the repeatable job (Bull repeatable jobs are stored in Redis; multiple instances are ok but will share the job state).

Notes
- The startup `setInterval` remains to provide warmup behavior when BullMQ is not available; however for robust scheduling prefer BullMQ repeatable job.
- `runWarmupOnce()` is idempotent and safe to call concurrently; the job uses Prisma updates per-number.
