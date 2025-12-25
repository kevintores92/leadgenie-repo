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
    this.queues.set(campaignId, rows.slice());
    this.status.set(campaignId, { queued: rows.length, inProgress: 0, completed: 0, failed: 0 });
    await this.redis.set(`campaign:${campaignId}:count`, String(rows.length));
    return { ok: true, count: rows.length };
  }

  async startCampaign(campaignId: string) {
    if (!this.queues.has(campaignId)) return { ok: false, error: "no list uploaded" };
    if (this.workers.get(campaignId)) return { ok: false, error: "campaign already running" };
    this.workers.set(campaignId, true);
    this.runWorker(campaignId).catch((err) => console.error("worker error", err));
    return { ok: true, scheduled: this.queues.get(campaignId)?.length || 0 };
  }

  async runWorker(campaignId: string) {
    const queue = this.queues.get(campaignId) || [];
    while ((this.queues.get(campaignId) || []).length > 0) {
      const q = this.queues.get(campaignId)!;
      const contact = q.shift()!;
      const stat = this.status.get(campaignId)!;
      stat.queued = q.length;
      stat.inProgress += 1;
      try {
        await this.dialContact(contact, campaignId);
        stat.completed += 1;
      } catch (err) {
        stat.failed += 1;
        console.error("dial error", err);
      } finally {
        stat.inProgress -= 1;
      }
      // rate limiting pause
      await new Promise((r) => setTimeout(r, this.rateMs));
    }
    this.workers.set(campaignId, false);
  }

  async dialContact(contact: Contact, campaignId?: string) {
    const callKey = `call:${Date.now()}:${Math.floor(Math.random() * 10000)}`;
    const res = await this.vapi.createCall(contact.phone, { meta: contact, campaignId });
    await this.redis.set(callKey, JSON.stringify({ phone: contact.phone, res }), 60 * 60 * 24);
    return res;
  }

  async handleVapiEvent(event: any) {
    const id = event?.callId || event?.sessionId || `evt_${Date.now()}`;
    await this.redis.set(`vapi:event:${id}`, JSON.stringify(event), 60 * 60);
  }

  async getStatus(campaignId: string) {
    const s = this.status.get(campaignId);
    if (!s) return { ok: false, error: "not found" };
    return { ok: true, status: s };
  }
}
