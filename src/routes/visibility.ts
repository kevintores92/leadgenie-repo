import express from "express";
import RedisClient from "../redis/redisClient";

export default function (redis: RedisClient) {
  const router = express.Router();

  // List calls for a campaign
  router.get("/campaigns/:campaignId/calls", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const keys = (await redis.lrange(`campaign:${campaignId}:calls`, 0, -1)) as string[];
      const items: any[] = [];
      for (const k of keys) {
        const v = await redis.get(k);
        try {
          items.push({ key: k, data: v ? JSON.parse(v) : null });
        } catch (_e) {
          items.push({ key: k, data: v });
        }
      }
      res.status(200).send({ ok: true, calls: items });
    } catch (err) {
      console.error("visibility calls error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  // Get single call detail by callId (or full key)
  router.get("/calls/:callId", async (req, res) => {
    try {
      let { callId } = req.params;
      let key = callId;
      if (!key.startsWith("call:")) key = `call:${callId}`;
      const v = await redis.get(key);
      if (!v) return res.status(404).send({ ok: false, error: "not found" });
      res.status(200).send({ ok: true, call: JSON.parse(v) });
    } catch (err) {
      console.error("visibility call error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  // Get Vapi event(s) for a callId
  router.get("/events/:callId", async (req, res) => {
    try {
      const { callId } = req.params;
      const key = `vapi:event:${callId}`;
      const v = await redis.get(key);
      if (!v) return res.status(404).send({ ok: false, error: "not found" });
      try {
        res.status(200).send({ ok: true, event: JSON.parse(v) });
      } catch (_e) {
        res.status(200).send({ ok: true, event: v });
      }
    } catch (err) {
      console.error("visibility events error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  return router;
}
