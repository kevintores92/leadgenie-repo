/**
 * Phone Scrub Worker Service
 * Runs the BullMQ worker for processing phone list uploads
 * Can be started independently with: node src/workers/phoneScrubWorker.js
 */

import { Worker } from 'bullmq';
import { createPhoneScrubWorker } from './phoneScrub.worker';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

console.log('Starting Phone Scrub Worker...');
console.log('Redis Config:', redisConfig);

// Create and start worker
const worker = new Worker('phone-scrub', createPhoneScrubWorker(), {
  connection: redisConfig,
  concurrency: 2, // Process 2 jobs in parallel
});

worker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed:`, job.returnvalue);
});

worker.on('failed', (job, error) => {
  console.error(`✗ Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

console.log('Phone Scrub Worker is ready to process jobs');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});
