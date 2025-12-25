Railway + DNS Checklist — LeadGenie

Overview
- This checklist shows exact Railway import steps, required env vars (marked REQUIRED), and DNS entries to point `leadgenie.online` to the signup static site and `app.leadgenie.online` to the dashboard app.

1) Import / create Railway projects
- Option A: Import the repo using `railway import` or Railway UI and use `railway.json` in the repo.
- Option B: Create two Railway services manually:
  - Service: `signup-standalone` (static)
    - Root directory: `apps/signup-standalone`
    - Build command: `npm install && npm run build`
    - Publish directory: `dist`
    - BEFORE you deploy, set the `VITE_API_URL` variable to the deployed backend API URL.
  - Service: `signup-service` (Node)
    - Root directory: `apps/signup-service`
    - Build command: `npm install --omit=dev && npm run prisma:generate` (uses service-local Prisma and `prisma/schema.signup.prisma`)
    - Start command: `npm start`

2) Required environment variables
- For `signup-service` (REQUIRED):
  - DATABASE_URL (REQUIRED)
  - JWT_SECRET (REQUIRED)
  - TWILIO_ACCOUNT_SID (REQUIRED)
  - TWILIO_AUTH_TOKEN (REQUIRED)
  - PAYPAL_CLIENT_ID (REQUIRED)
  - PAYPAL_CLIENT_SECRET (REQUIRED)
  - PAYPAL_WEBHOOK_ID (REQUIRED)
  - APP_URL (REQUIRED) — set to https://app.leadgenie.online
  - BASE_URL (REQUIRED) — set to https://api.leadgenie.online
- For `signup-standalone` (REQUIRED before build):
  - VITE_API_URL (REQUIRED) — the public URL of the signup-service (e.g. https://api.leadgenie.online)
  - VITE_PAYPAL_CLIENT_ID (REQUIRED) — PayPal client id (public)
  - VITE_PAYPAL_PLAN_ID (REQUIRED) — PayPal plan id for subscriptions
- Optional helpers (backend):
  - REDIS_URL, TWILIO_MASTER_ACCOUNT_SID, TWILIO_MASTER_AUTH_TOKEN, VAPI_API_KEY, RESEND_API_KEY, UPLOAD/EXPORT paths, VERIFICATION_FROM_EMAIL

3) Railway setup order (important)
- Deploy `signup-service` first so you know its public URL.
  - Add required secrets in Railway UI (Project → Settings → Variables).
  - Run DB migrations: either add a deploy step or run a one-off command:

    # Use the service-specific schema for signup-service:
    railway run -- prisma migrate deploy --schema=./prisma/schema.signup.prisma

- Deploy `signup-standalone` AFTER `signup-service` is live.
  - In `signup-standalone` project settings set `VITE_API_URL` to the `signup-service` public URL.
  - Trigger a build (Railway will run `npm install && npm run build`).

4) DNS records (example)
- After Railway assigns domains you can map your custom domains in Railway UI.
- Recommended DNS records:
  - For root domain `leadgenie.online` (pointing to signup static site):
    - If your DNS provider supports ALIAS/ANAME for root→ set ALIAS/ANAME to Railway's target host provided during domain mapping.
    - If not, some providers recommend using an A record pointing to Railway-provided IPs (Railway may provide an IP or recommended approach in the UI). Use Railway's domain mapping instructions.
  - For subdomain `app.leadgenie.online` (dashboard):
    - Create a CNAME for `app` -> the Railway host provided (e.g., `paul-svc.up.railway.app`) or follow Railway's instructions in the domain mapping UI.
- After adding records, verify in Railway domain mapping and wait for DNS propagation.

5) CORS and allowed origins
- In `signup-service` environment, set `APP_URL` and `BASE_URL` as above.
- Ensure server CORS allows `https://leadgenie.online` (frontend) and `https://app.leadgenie.online` (dashboard) as needed.
  - In `apps/signup-service/src/index.js` CORS is applied globally — add/update allowed origins if you have origin checks.

6) Verification / smoke tests
- Once both deployed and domains mapped:
  - Visit https://leadgenie.online — you should see the signup landing (static site).
  - Sign up via the combined signup+subscribe button. PayPal flow should complete and on approval the `/auth/signup` call should succeed and redirect to the dashboard domain.
  - Visit https://app.leadgenie.online — it should require authentication and load dashboard routes.

7) Rollback plan
- If the frontend calls the wrong backend URL, set `VITE_API_URL` to the correct API URL and re-deploy the frontend.
- If backend needs immediate secret rotation, update Railway variables and redeploy.

8) Railway CLI quick commands (examples)
- Set variables (replace `<value>`):

  railway variables set VITE_API_URL="https://api.leadgenie.online" VITE_PAYPAL_CLIENT_ID="<id>" VITE_PAYPAL_PLAN_ID="<plan>"

  railway variables set DATABASE_URL="postgresql://..." JWT_SECRET="<secret>" PAYPAL_CLIENT_ID="<id>" PAYPAL_CLIENT_SECRET="<secret>" PAYPAL_WEBHOOK_ID="<id>"

- Run migrations:

  railway run -- prisma migrate deploy --schema=./prisma/schema.signup.prisma

9) Notes & security
- Do not commit secrets. Keep secrets only in Railway variables and local `.env` files that are gitignored.
- `VITE_` env vars are compiled into the static bundle and are public; do not put private keys there.

If you want, I can generate DNS record text you can paste to your DNS provider (Cloudflare/Namecheap/Route53) once Railway gives you the exact target hostnames.
