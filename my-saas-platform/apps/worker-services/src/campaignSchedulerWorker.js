require('dotenv').config();

const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const { checkScheduledCampaigns } = require('./campaignScheduler');

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

const queueName = 'campaign:scheduler';
const queue = new Queue(queueName, { connection });
new QueueScheduler(queueName, { connection });

// Ensure a repeatable job exists that runs every minute
(async function ensureRepeatable() {
  try {
    await queue.add('campaign:check-scheduled', {}, {
      repeat: { every: 60000 }, // Every 60 seconds
      removeOnComplete: true,
      removeOnFail: false
    });
  } catch (e) {
    // ignore duplicate job errors
  }
})();

// Worker to process campaign scheduling jobs
new Worker(queueName, async job => {
  if (job.name === 'campaign:check-scheduled') {
    try {
      await checkScheduledCampaigns();
    } catch (error) {
      console.error('[Campaign Scheduler Worker] Error:', error);
      throw error;
    }
  }
});

console.log('[Campaign Scheduler] Started - checking for scheduled campaigns every minute');