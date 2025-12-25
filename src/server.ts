import express from "express";
import bodyParser from "body-parser";
import WebhookRouter from "./routes/webhook";
import CampaignsRouter from "./routes/campaigns";
import { Orchestrator } from "./orchestrator/Orchestrator";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function main() {
  const app = express();
  app.use(bodyParser.json());

  const orchestrator = new Orchestrator({
    redisUrl: process.env.REDIS_URL,
    vapiApiKey: process.env.VAPI_API_KEY,
    vapiBaseUrl: process.env.VAPI_BASE_URL || "https://api.vapi.ai"
  });

  app.use("/vapi/webhooks", WebhookRouter(orchestrator));
  app.use("/campaigns", CampaignsRouter(orchestrator));

  app.get("/health", (_req, res) => res.status(200).send({ ok: true }));

  app.listen(PORT, () => {
    console.log(`Orchestrator listening on ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start orchestrator", err);
  process.exit(1);
});
