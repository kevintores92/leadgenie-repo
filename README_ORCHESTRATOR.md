Orchestrator scaffold

Files added under `src/` provide a minimal TypeScript orchestrator with:
- Express server at `/src/server.ts`
- Webhook route at `/vapi/webhooks`
- `Orchestrator`, `CampaignManager`, and `VapiClient` with a simple paced dialer
- `RedisClient` with optional ioredis or in-memory fallback

How to run locally (dev):

1. Install deps:

```bash
npm ci
```

2. Build:

```bash
npm run build
```

3. Start:

```bash
npm start
```

Environment variables:
- `REDIS_URL` (optional)
- `VAPI_API_KEY` (required for dialing)
- `VAPI_BASE_URL` (optional)
