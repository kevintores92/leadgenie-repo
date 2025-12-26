import { CampaignManager } from "./CampaignManager";
import { VapiClient } from "./vapiClient";
import RedisClient from "../redis/redisClient";

type OrchestratorOpts = {
  redisUrl?: string;
  vapiApiKey?: string;
  vapiBaseUrl?: string;
};

export class Orchestrator {
  redis: RedisClient;
  campaignManager: CampaignManager;
  vapi: VapiClient;

  constructor(opts: OrchestratorOpts) {
    const envRedisUrl = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL ||
      (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : undefined);
    this.redis = new RedisClient(opts.redisUrl || envRedisUrl);
    this.vapi = new VapiClient(opts.vapiApiKey || "", opts.vapiBaseUrl);
    this.campaignManager = new CampaignManager(this.vapi, this.redis);
  }

  async handleWebhook(event: any): Promise<void> {
    // Minimal mapping: save event and forward to campaign manager
    try {
      const id = event?.callId || event?.sessionId || `evt_${Date.now()}`;
      await this.redis.set(`vapi:event:${id}`, JSON.stringify(event), 60 * 60);
      await this.campaignManager.handleVapiEvent(event);
    } catch (err) {
      console.error("Orchestrator.handleWebhook error", err);
    }
  }

  async uploadList(campaignId: string, rows: Array<{ phone: string; [k: string]: any }>) {
    return this.campaignManager.uploadList(campaignId, rows);
  }

  async startCampaign(campaignId: string) {
    return this.campaignManager.startCampaign(campaignId);
  }
}
