Signup Standalone (Vite) — Deployment to Railway (no Docker)

Overview
- Deploy `apps/signup-standalone` as a static site (Vite build) on Railway.
- Important: set `VITE_API_URL` in Railway BEFORE build so production bundle calls the correct backend.

Railway setup (frontend)
1. Create a Railway project/service and point it to `apps/signup-standalone` in your repo.
2. Set these environment variables in the Railway service (Settings → Variables):
   - VITE_API_URL = https://<your-signup-service-url>
   - Any other `VITE_` prefixed variables the frontend needs.
3. Build command (Railway build step):

   npm install
   npm run build

4. Publish directory: `dist` (Vite default).

Notes and examples
- Example Railway CLI to set the API URL before building:

  railway variables set VITE_API_URL="https://signup-service.up.railway.app"

- Local dev uses the Vite dev server which reads `.env` files and `vite.config.ts` dev proxy. For local testing you can copy your `.env.signup` to `.env` and run:

  cd apps/signup-standalone
  npm install
  npm run dev

Security
- Never commit `VITE_` secrets that must remain private. Browser-visible `VITE_` keys are public by design.

Troubleshooting
- If frontend is calling the wrong endpoint in production, verify `VITE_API_URL` in Railway and rebuild.
- If you do not want to use Railway's build pipeline, you can locally build (`npm run build`) and deploy the `dist` folder to any static host.
