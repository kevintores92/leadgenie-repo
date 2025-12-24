Signup Service — Deployment to Railway (no Docker)

Overview
- This file describes minimal steps to deploy `apps/signup-service` to Railway as a Node service.

Railway setup (backend)
1. Create a new Railway project → Add a new service → Choose "Deploy from GitHub" and point the root to this monorepo.
2. Configure the service to use the folder: `apps/signup-service`.
3. Set the start command:

   node src/index.js

4. Add a Postgres plugin in Railway and attach it to the service (this provides `DATABASE_URL`).
5. Add the required environment variables in Railway (Settings → Variables). Example keys taken from local `.env.signup`:

- DATABASE_URL
- JWT_SECRET (or APP_JWT_SECRET)
- REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS, REDIS_URL (if using Redis)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET
- TWILIO_MASTER_ACCOUNT_SID, TWILIO_MASTER_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
- PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
- APP_URL, BASE_URL
- VAPI_API_KEY
- RESEND_API_KEY
- UPLOAD_STORAGE_PATH, EXPORT_STORAGE_PATH
- VERIFICATION_FROM_EMAIL

Make sure any `TWILIO_*` / `PAYPAL_*` values are the production credentials you want to use.

6. Database migrations
- Ensure the database schema is applied. On the Railway service deploy you can either run a migration step or use Prisma's `migrate deploy` during build.
- This service uses a trimmed schema file `prisma/schema.signup.prisma`.
- Recommended build step (Railway):

  npm install && npm run prisma:generate

- To run migrations once the DB is attached (example):

  npx prisma migrate deploy --schema=./prisma/schema.signup.prisma

7. Deploy: Railway will build and start the service. Verify `signup-service` health at `/health`.

Local development notes
- `apps/signup-service` reads `.env` via `require('dotenv').config()`.
- To reuse your `.env.signup` locally:

  Copy-Item .env.signup .env -Force
  node src/index.js

Security
- Never commit real secrets. Keep `.env.signup` out of git (add to `.gitignore`). Rotate secrets if they leak.

Railway CLI examples
- Set variables from terminal (replace values):

  railway variables set DATABASE_URL="postgresql://..." JWT_SECRET="SOME_SECRET"

- Open a one-off shell on the service to run migrations:

  railway run -- service <service-id> -- "npx prisma migrate deploy --schema=./prisma/schema.signup.prisma"

Notes
- Do not rely on local files on your laptop for production. Railway must hold all runtime secrets.
- If you use attachments (S3/volume), ensure storage is configured and accessible from the Railway service.
