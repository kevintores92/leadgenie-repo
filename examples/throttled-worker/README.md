Throttled Worker Example

This is a minimal Node.js demo of a token-bucket throttled task consumer suitable for phone validation or delivery tasks.

Requirements
- Node 14+

Run
```bash
cd examples/throttled-worker
npm start
```

What it demonstrates
- Per-organization `TokenBucket` rate limiting
- A `TaskQueue` with concurrency limit + token check
- Simulated external validation calls with random latency and failures
- Simple monitoring output showing queue lengths and available tokens

How to adapt to real system
- Replace `simulatedValidationCall` with real API calls and proper error handling.
- Persist task results to DB (Prisma) and push events to next queue for delivery.
- Implement retry/backoff and poison-queue handling for permanent failures.
- Use a distributed queue (Redis, RabbitMQ, or a managed queue) instead of in-memory queue for resilience.
