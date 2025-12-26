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

        // verify connection quickly; if unreachable, fall back to in-memory store
        (async () => {
          try {
            // ping will reject if connection fails
            await this.client.ping();
            console.log("Connected to Redis at", redisUrl);
          } catch (err) {
            console.error("Failed to connect to Redis, falling back to memory", err);
            try {
              this.client.disconnect?.();
            } catch (_e) {}
            this.client = null;
            this.memory = new Map();
          }
        })();
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

  // list operations
  async rpush(key: string, ...values: string[]) {
    if (this.client) return this.client.rpush(key, ...values);
    for (const v of values) this.memory!.set(`${key}:${Math.random()}`, { value: v });
    return values.length;
  }

  async lpop(key: string) {
    if (this.client) return this.client.lpop(key);
    // naive: iterate keys
    for (const k of Array.from(this.memory!.keys())) {
      if (k.startsWith(`${key}:`)) {
        const e = this.memory!.get(k)!;
        this.memory!.delete(k);
        return e.value;
      }
    }
    return null;
  }

  async llen(key: string) {
    if (this.client) return this.client.llen(key);
    let count = 0;
    for (const k of Array.from(this.memory!.keys())) if (k.startsWith(`${key}:`)) count++;
    return count;
  }

  async lrange(key: string, start = 0, stop = -1) {
    if (this.client) return this.client.lrange(key, start, stop);
    const items: string[] = [];
    // naive memory implementation: collect keys matching prefix in insertion order
    for (const k of Array.from(this.memory!.keys())) {
      if (k.startsWith(`${key}:`)) items.push(this.memory!.get(k)!.value);
    }
    if (stop === -1) stop = items.length - 1;
    return items.slice(start, stop + 1);
  }

  // hash helpers
  async hset(key: string, field: string, value: string) {
    if (this.client) return this.client.hset(key, field, value);
    const existing = JSON.parse((this.memory!.get(key)?.value) || "{}");
    existing[field] = value;
    this.memory!.set(key, { value: JSON.stringify(existing) });
    return 1;
  }

  async hgetall(key: string) {
    if (this.client) return this.client.hgetall(key);
    const e = this.memory!.get(key);
    if (!e) return {};
    try {
      return JSON.parse(e.value);
    } catch (_e) {
      return {};
    }
  }
}
