require('dotenv').config();

const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const { runWarmupOnce } = require('./warmupJob');

function parseRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTLS = u.protocol === 'rediss:' || u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number(u.port) || (isTLS ? 6380 : 6379),
        password: u.password || process.env.REDIS_PASSWORD || undefined,
        tls: isTLS ? {} : undefined,
      };
    } catch (e) {
      console.warn('Invalid REDIS_URL, falling back to parts', e && e.message);
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

const redisConnection = parseRedisConnection();
const connection = new IORedis(redisConnection);

const queueName = 'warmup:jobs';
const queue = new Queue(queueName, { connection });
new QueueScheduler(queueName, { connection });

// Ensure a repeatable job exists that runs once per day
(async function ensureRepeatable() {
  try {
    await queue.add('warmup:run', {}, { repeat: { cron: process.env.WARMUP_CRON || '0 4 * * *' }, removeOnComplete: true, removeOnFail: false });
  } catch (e) {
    // ignore duplicate job errors
  }
})();

// Worker to process warmup jobs
new Worker(queueName, async job => {
  if (job.name === 'warmup:run') {
    try {
      await runWarmupOnce();
    } catch (e) {
      console.warn('warmup job failed', e && e.message);
      throw e;
    }
  }
}, { connection });

module.exports = { queue };
