import IORedis from "ioredis";

type InMemoryEntry = { value: string; expiresAt?: number };

export default class RedisClient {
  client: any;
  memory: Map<string, InMemoryEntry> | null = null;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.client = new IORedis(redisUrl);
        this.client.on("error", (e: any) => console.error("ioredis error", e));
      } catch (err) {
        console.warn("Failed to init ioredis, falling back to memory", err);
        this.memory = new Map();
      }
    } else {
      this.memory = new Map();
    }
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (this.client) {
      if (ttlSeconds) return this.client.set(key, value, "EX", ttlSeconds);
      return this.client.set(key, value);
    }
    const entry: InMemoryEntry = { value };
    if (ttlSeconds) entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.memory!.set(key, entry);
    return "OK";
  }

  async get(key: string) {
    if (this.client) return this.client.get(key);
    const e = this.memory!.get(key);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) {
      this.memory!.delete(key);
      return null;
    }
    return e.value;
  }

  async del(key: string) {
    if (this.client) return this.client.del(key);
    return this.memory!.delete(key);
  }
}
