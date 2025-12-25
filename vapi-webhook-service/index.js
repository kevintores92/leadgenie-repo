const express = require('express');
const orchestrator = require('./orchestrator');

const app = express();
app.use(express.json());

app.post('/vapi/webhooks', (req, res) => {
  const payload = req.body;
  // fire-and-forget handling so webhook returns fast
  orchestrator.handleEvent(payload).catch(err => console.error('orchestrator error', err));
  res.sendStatus(200);
});

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`vapi-webhook-service listening on ${port}`));
