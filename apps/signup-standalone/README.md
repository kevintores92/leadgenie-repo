This is a minimal standalone signup service for LeadGenie.

Environment variables
- VITE_API_URL - full backend URL (e.g. https://api.leadgenie.online)

Run locally

```bash
cd apps/signup-standalone
npm install
npm run dev
```

Deploy
- Deploy to Railway or any static host. Set `VITE_API_URL` to your backend's public URL.
