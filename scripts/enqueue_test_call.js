#!/usr/bin/env node
/**
 * Enqueue a single voice call job to the `voice-calls` queue used by the worker.
 * Usage:
 *   node scripts/enqueue_test_call.js --contactId=<CONTACT_ID> --orgId=<ORG_ID> [--callType=cold] [--env=.env.signup]
 *
 * Ensure you have `bullmq` and `ioredis` available (they are in the repo dependencies).
 */

require('dotenv').config({ path: process.env.ENV_PATH || process.argv.find(a => a.startsWith('--env='))?.split('=')[1] || '.env.signup' });

const { Queue } = require('bullmq');

function parseRedisConnectionFromEnv() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTLS = u.protocol === 'rediss:';
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

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--contactId=')) args.contactId = arg.split('=')[1];
    else if (arg.startsWith('--orgId=')) args.organizationId = arg.split('=')[1];
    else if (arg.startsWith('--callType=')) args.callType = arg.split('=')[1];
    else if (arg.startsWith('--env=')) args.env = arg.split('=')[1];
  }
  return args;
}

async function main() {
  const { contactId, organizationId, callType = 'cold', env } = parseArgs();
  if (!contactId || !organizationId) {
    console.error('Usage: node scripts/enqueue_test_call.js --contactId=<CONTACT_ID> --orgId=<ORG_ID> [--callType=cold] [--env=.env.signup]');
    process.exit(1);
  }

  const connection = parseRedisConnectionFromEnv();
  const queue = new Queue('voice-calls', { connection });

  try {
    console.log('Enqueuing test job to voice-calls queue with:', { contactId, organizationId, callType });
    const job = await queue.add('test-call', { contactId, organizationId, callType });
    console.log('Job enqueued:', job.id);
    console.log('Now tail the voice worker logs and watch DB `callRecord` entries.');
    await queue.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to enqueue job:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
