import RedisClient from "../redis/redisClient";
import { VapiClient } from "./vapiClient";

type Contact = { phone: string; [k: string]: any };

export class CampaignManager {
  vapi: VapiClient;
  redis: RedisClient;
  lists: Map<string, Contact[]> = new Map();
  queues: Map<string, Contact[]> = new Map();
  status: Map<string, { queued: number; inProgress: number; completed: number; failed: number }> = new Map();
  rateMs: number = 2000; // default 1 call per 2s
  workers: Map<string, boolean> = new Map();

  constructor(vapi: VapiClient, redis: RedisClient) {
    this.vapi = vapi;
    this.redis = redis;
  }

  async uploadList(campaignId: string, rows: Contact[]) {
    this.lists.set(campaignId, rows.slice());
    // ensure in-memory queue reference exists so startCampaign can run
    this.queues.set(campaignId, rows.slice());
    // persist into redis queue
    const key = `campaign:${campaignId}:queue`;
    for (const r of rows) {
      await this.redis.rpush(key, JSON.stringify(r));
    }
    this.status.set(campaignId, { queued: rows.length, inProgress: 0, completed: 0, failed: 0 });
    await this.redis.hset(`campaign:${campaignId}:meta`, "count", String(rows.length));
    return { ok: true, count: rows.length };
  }

  async startCampaign(campaignId: string) {
    const key = `campaign:${campaignId}:queue`;
    try {
      let queued = Number((await this.redis.llen(key)) as number) || 0;
      // fallback: if redis list length is 0, check persisted meta count (upload may have set meta)
      if (queued === 0) {
        try {
          const meta = await this.redis.hgetall(`campaign:${campaignId}:meta`);
          const metaCount = Number(meta.count || 0);
          if (metaCount > 0) queued = metaCount;
        } catch (e) {
          // ignore meta read errors here; we'll treat queued as-is
        }
      }
      if (queued === 0) return { ok: false, error: "no list uploaded" };
    } catch (err) {
      console.error('startCampaign failed to read queue length', err);
      return { ok: false, error: 'failed to read queue' };
    }
    if (this.workers.get(campaignId)) return { ok: false, error: "campaign already running" };
    this.workers.set(campaignId, true);
    this.runWorker(campaignId).catch((err) => console.error("worker error", err));
    return { ok: true, scheduled: (await this.redis.llen(key)) || 0 };
  }

  async runWorker(campaignId: string) {
    const key = `campaign:${campaignId}:queue`;
    while (true) {
      const raw = await this.redis.lpop(key);
      if (!raw) break;
      let contact: Contact;
      try {
        contact = JSON.parse(raw);
      } catch (_e) {
        contact = { phone: String(raw) } as Contact;
      }
      const stat = this.status.get(campaignId)!;
      stat.queued = await this.redis.llen(key) as number;
      stat.inProgress += 1;
      try {
        await this.dialContact(contact, campaignId);
        stat.completed += 1;
      } catch (err) {
        stat.failed += 1;
        // push back to queue for retry
        await this.redis.rpush(key, JSON.stringify(contact));
        console.error("dial error", err);
      } finally {
        stat.inProgress -= 1;
      }
      await new Promise((r) => setTimeout(r, this.rateMs));
    }
    this.workers.set(campaignId, false);
  }

  async dialContact(contact: Contact, campaignId?: string) {
    const callId = `${Date.now()}:${Math.floor(Math.random() * 10000)}`;
    const callKey = `call:${callId}`;
    const res = await this.vapi.createCall(contact.phone, { meta: contact, campaignId });
    await this.redis.set(callKey, JSON.stringify({ phone: contact.phone, res, campaignId, ts: Date.now() }), 60 * 60 * 24);
    if (campaignId) {
      await this.redis.rpush(`campaign:${campaignId}:calls`, callKey);
    }
    return { callId, res };
  }

  async handleVapiEvent(event: any) {
    const id = event?.callId || event?.sessionId || `evt_${Date.now()}`;
    await this.redis.set(`vapi:event:${id}`, JSON.stringify(event), 60 * 60);
  }

  async getStatus(campaignId: string) {
    const s = this.status.get(campaignId);
    if (!s) {
      // try to read meta from redis
      const meta = await this.redis.hgetall(`campaign:${campaignId}:meta`);
      const queued = (await this.redis.llen(`campaign:${campaignId}:queue`)) || 0;
      const status = { queued: Number(queued), inProgress: 0, completed: Number(meta.completed || 0), failed: Number(meta.failed || 0) };
      return { ok: true, status };
    }
    // refresh queued from redis
    s.queued = (await this.redis.llen(`campaign:${campaignId}:queue`)) as number;
    return { ok: true, status: s };
  }
}
