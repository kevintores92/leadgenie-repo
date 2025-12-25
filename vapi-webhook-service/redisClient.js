let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  Redis = null;
}

class InMemoryRedis {
  constructor() { this.store = new Map(); }
  async get(k) { return this.store.has(k) ? this.store.get(k) : null; }
  async set(k, v) { this.store.set(k, String(v)); return 'OK'; }
  async del(k) { this.store.delete(k); }
  // minimal zadd/zrange/zrem wrappers could be added if needed
}

let client;
if (Redis && process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL);
  client.on('error', (err) => console.error('[ioredis] error', err));
} else {
  // Do not attempt to connect to Redis if no REDIS_URL is provided.
  client = new InMemoryRedis();
}

module.exports = {
  get: (k) => client.get(k),
  set: (k, v) => client.set(k, v),
  del: (k) => client.del(k),
  _raw: client,
};
