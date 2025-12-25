import express from "express";
import { Orchestrator } from "../orchestrator/Orchestrator";

export default function (orchestrator: Orchestrator) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const event = req.body;
      // fire-and-forget processing; respond quickly to Vapi
      orchestrator.handleWebhook(event).catch((err) => {
        console.error("orchestrator.handleWebhook error:", err);
      });
      res.status(200).send({ received: true });
    } catch (err) {
      console.error("webhook handler error", err);
      res.status(500).send({ ok: false });
    }
  });

  return router;
}
