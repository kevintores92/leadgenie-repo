Setup & run

- Install dependencies: `npm install`
- Generate Prisma client: `npm run prisma:generate`
- Apply migrations: `npm run migrate:dev`
	- After schema changes (e.g. Contact audit) re-run migrations: `npm run migrate:dev` and `npm run prisma:generate`
- Seed demo data: `npm run seed`
- Start API: `npm start`

Worker
- Start the worker process from `apps/worker-services` (install deps and run the process that imports `campaignSender.js`), or run your existing worker manager.

Notes
- Set environment variables via `.env` (see `.env.example`) for `WEBHOOK_SUFFIX`, Twilio creds, and Redis host/port.

Quick tests

- Enqueue campaign:

```bash
curl -X POST -H "Content-Type: application/json" -H "x-organization-id: <orgId>" -d '{"batchSize":50,"intervalMinutes":30}' http://localhost:4000/campaigns/<campaignId>/start
```

- Twilio inbound webhook (replace suffix):

```bash
curl -X POST -d "To=+15551234567&From=+1555000101&Body=Hello" http://localhost:4000/webhooks/twilio/inbound-f3a9c2d4e5b6
```

- Update a contact (example):

```bash
curl -X PUT -H "Content-Type: application/json" -H "x-organization-id: <orgId>" -d '{"firstName":"Herman","lastName":"Ringer","phone":"(614) 496-4360","propertyAddress":"415 S Highland Ave"}' http://localhost:4000/contacts/<contactId>
```
