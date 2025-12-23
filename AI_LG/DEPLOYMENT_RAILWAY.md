Deploying to Railway — step-by-step

Overview
This repo contains two deployable services for Railway:
- `backend-api` (Express + Prisma) — web service
- `worker-services` (BullMQ worker) — background worker

Railway setup (recommended)
1. Create a new Railway project.
2. Add a PostgreSQL plugin (or connect your Neon/managed Postgres). Note the `DATABASE_URL` Railway provides.
3. Add a Redis plugin (or external Redis) and set `REDIS_URL`.
4. Create two services in Railway: one for `backend-api`, one for `worker-services`.
   - For each service choose "Deploy from repo" and select the corresponding folder.
   - Alternatively use Docker: both services include Dockerfiles.

Required environment variables (set in Railway > Variables)
- DATABASE_URL (Postgres)
- REDIS_URL (redis://...)
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_API_KEY (optional)
- TWILIO_API_SECRET (optional)
- WEBHOOK_SUFFIX (e.g., random suffix for security)
- FAKE_TWILIO (set to 1 for testing without Twilio)
- NODE_ENV=production
- Any other env used by your app (e.g., SMTP creds)

Service configuration notes
- `backend-api` (web):
  - Build: Dockerfile is provided at `apps/backend-api/Dockerfile`.
  - The Dockerfile runs `npx prisma migrate deploy` on startup to apply migrations.
  - Railway will expose the `PORT` via env — the app uses `process.env.PORT`.
- `worker-services` (worker):
  - Build: Dockerfile is provided at `apps/worker-services/Dockerfile`.
  - This service will connect to Redis and process queues. Run as a background service (one instance recommended).

Running migrations
- Migrations are executed by the backend Dockerfile at container start (`npx prisma migrate deploy`). Ensure `DATABASE_URL` is correctly set in Railway before starting the `backend-api` service.
- If you prefer to run migrations manually from Railway Console:
  - Open a one-off shell and run: `npx prisma migrate deploy`

Auto-number purchase & billing
- Auto-buy of numbers is not enabled by default. If you implement auto-purchase, ensure strict org-level caps are enforced and record every purchase in `ComplianceAuditLog`.

Local Docker testing
- Build backend image:
```bash
cd apps/backend-api
docker build -t leadgenie-backend:dev .
```
- Run locally (you must pass DATABASE_URL and REDIS_URL):
```bash
docker run --rm -p 4000:4000 -e DATABASE_URL="postgresql://..." -e REDIS_URL="redis://..." leadgenie-backend:dev
```

Operational checklist after deploy
- Verify `GET /auth/ping` returns `{ ok: true }`.
- Confirm repeatable warmup job exists (check Redis keys or logs for `warmup:run`).
- Test message flow with `FAKE_TWILIO=1` before enabling live Twilio.
- Monitor `ComplianceAuditLog` for blocked/paused events.

If you want, I can:
- Add Railway `service.json` or `railway.json` helper files (optional).
- Create a GitHub Actions workflow to build and push images to Railway (or Docker registry).
- Walk through adding env vars in your Railway project and activating services step-by-step.
