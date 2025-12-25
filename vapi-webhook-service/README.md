# Vapi Webhook Service

Minimal webhook listener for Vapi events. Quick start:

```bash
cd vapi-webhook-service
npm install
npm start
```

Endpoints:
- `POST /vapi/webhooks` — receives webhook payloads and forwards to a small orchestrator.
- `GET /health` — simple liveness probe.

Set `REDIS_URL` to connect to an external Redis instance; otherwise an in-memory store is used.
