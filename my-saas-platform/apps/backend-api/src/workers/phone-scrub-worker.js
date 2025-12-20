const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parseUploadFile } = require('../utils/parseFile');
const { createLandlineZip } = require('../utils/createLandlineZip');
const { normalizePhone } = require('../utils/normalizePhone');
const phoneCheckService = require('../services/phoneCheck.service');

const prisma = new PrismaClient();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

console.log('[Phone Scrub Worker] Starting...');
console.log('[Phone Scrub Worker] Redis Config:', redisConfig);

/**
 * Phone scrub background job processor
 */
async function phoneScrubJobHandler(job) {
  const { jobId, userId, orgId, filePath, filename } = job.data;

  console.log(`[${jobId}] Starting phone scrub job for ${filename}`);

  try {
    // Update job status to PROCESSING
    await updateJobStatus(jobId, 'PROCESSING');

    // Parse file
    console.log(`[${jobId}] Parsing file...`);
    const rows = await parseUploadFile(filePath);
    const totalRows = rows.length;
    console.log(`[${jobId}] Parsed ${totalRows} rows`);

    // Update total rows
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { totalRows },
    });

    // Extract and normalize phone numbers
    console.log(`[${jobId}] Normalizing phone numbers...`);
    const normalizedPhones = rows.map((row) => {
      const normalized = normalizePhone(row.phone, 'US');
      return {
        original: row.phone,
        normalized,
      };
    });

    // Collect only valid normalized phones
    const validNormalizedPhones = normalizedPhones
      .filter((result) => result.normalized !== null)
      .map((result) => result.normalized);

    console.log(`[${jobId}] Valid normalized phones: ${validNormalizedPhones.length}/${totalRows}`);

    // Validate phone numbers via phone-check.app API with caching
    console.log(`[${jobId}] Validating phones (batch processing with cache)...`);
    const validationResults = await phoneCheckService.validatePhones(validNormalizedPhones);
    console.log(`[${jobId}] Validation complete: ${validationResults.length} results`);

    // Map results back to original rows
    const resultsMap = new Map();
    for (const result of validationResults) {
      resultsMap.set(result.phone, result);
    }

    // Split results into mobile and landline
    const mobiles = [];
    const landlines = [];
    let processedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalization = normalizedPhones[i];

      // Skip if phone couldn't be normalized
      if (!normalization.normalized) {
        continue;
      }

      // Get validation result
      const validation = resultsMap.get(normalization.normalized);
      if (!validation) {
        continue;
      }

      processedCount++;

      const phoneData = {
        phone: validation.phone,
        phone_type: validation.phone_type || 'unknown',
        carrier: validation.carrier,
        country: validation.country,
        is_valid: validation.is_valid,
      };

      // Split by phone type and validity
      // Mobile = valid AND phone_type === 'mobile'
      if (validation.is_valid && validation.phone_type === 'mobile') {
        mobiles.push({
          ...row,
          ...phoneData,
        });
      }
      // Landline = phone_type === 'landline' (regardless of validity)
      else if (validation.phone_type === 'landline') {
        landlines.push(phoneData);
      }
      // Everything else is ignored

      if (processedCount % 100 === 0) {
        console.log(
          `[${jobId}] Progress: ${processedCount}/${totalRows} processed`
        );
      }
    }

    console.log(`[${jobId}] Results split: ${mobiles.length} mobile, ${landlines.length} landline`);

    // Insert mobile contacts into database
    if (mobiles.length > 0) {
      console.log(`[${jobId}] Inserting ${mobiles.length} mobile contacts...`);
      await insertMobileContacts(jobId, orgId, mobiles);
    }

    // Create ZIP with landlines
    let zipPath = null;
    if (landlines.length > 0) {
      console.log(`[${jobId}] Creating landline ZIP...`);
      const exportPath = process.env.EXPORT_STORAGE_PATH || 'storage/exports';
      zipPath = await createLandlineZip(landlines, jobId, exportPath);
      console.log(`[${jobId}] ZIP created: ${zipPath}`);
    }

    // Update job status to COMPLETED
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        totalRows,
        mobileCount: mobiles.length,
        landlineCount: landlines.length,
        zipPath,
        updatedAt: new Date(),
      },
    });

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[${jobId}] Cleaned up uploaded file`);
      }
    } catch (error) {
      console.warn(`[${jobId}] Failed to delete upload file:`, error.message);
    }

    console.log(`[${jobId}] Job completed successfully`);

    return {
      jobId,
      totalRows,
      mobileCount: mobiles.length,
      landlineCount: landlines.length,
      zipPath,
    };
  } catch (error) {
    console.error(`[${jobId}] Job failed:`, error.message, error.stack);

    // Update job status to FAILED
    try {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          updatedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error(`[${jobId}] Failed to update job status:`, updateError.message);
    }

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[${jobId}] Failed to delete upload file:`, err.message);
    }

    throw error;
  }
}

/**
 * Insert mobile contacts into database
 * Skips duplicates based on unique constraint (brandId, phone)
 */
async function insertMobileContacts(jobId, organizationId, mobileRecords) {
  const batchSize = 1000;
  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < mobileRecords.length; i += batchSize) {
    const batch = mobileRecords.slice(i, i + batchSize);

    const contactsData = batch.map((record) => ({
      organizationId,
      brandId: '', // Will be empty - frontend can assign later
      firstName: record.firstName || 'Import',
      lastName: record.lastName || '',
      phone: record.phone,
      phoneType: record.phone_type,
      carrier: record.carrier,
      country: record.country,
      isPhoneValid: true,
      status: 'ACTIVE',
      // Optional fields if present in original record
      ...(record.originalRecord?.propertyAddress && { propertyAddress: record.originalRecord.propertyAddress }),
      ...(record.originalRecord?.propertyCity && { propertyCity: record.originalRecord.propertyCity }),
      ...(record.originalRecord?.propertyState && { propertyState: record.originalRecord.propertyState }),
      ...(record.originalRecord?.propertyZip && { propertyZip: record.originalRecord.propertyZip }),
      ...(record.originalRecord?.mailingAddress && { mailingAddress: record.originalRecord.mailingAddress }),
      ...(record.originalRecord?.mailingCity && { mailingCity: record.originalRecord.mailingCity }),
      ...(record.originalRecord?.mailingState && { mailingState: record.originalRecord.mailingState }),
      ...(record.originalRecord?.mailingZip && { mailingZip: record.originalRecord.mailingZip }),
    }));

    try {
      const result = await prisma.contact.createMany({
        data: contactsData,
        skipDuplicates: true,
      });
      insertedCount += result.count;
      skippedCount += batch.length - result.count;
      console.log(`[${jobId}] Batch inserted: ${result.count} new, ${batch.length - result.count} skipped (duplicates)`);
    } catch (error) {
      console.error(`[${jobId}] Batch insert error:`, error.message);
      // Continue with next batch even if one fails
    }
  }

  console.log(`[${jobId}] Insert complete: ${insertedCount} inserted, ${skippedCount} skipped`);
}

/**
 * Update job status
 */
async function updateJobStatus(jobId, status) {
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: { 
      status,
      updatedAt: new Date(),
    },
  });
}

// Create and start worker
const worker = new Worker('phone-scrub', phoneScrubJobHandler, {
  connection: redisConfig,
  concurrency: 2, // Process 2 jobs concurrently
  settings: {
    maxStalledCount: 2,
    stalledInterval: 5000,
    maxStalledTimeout: 30000,
  },
});

worker.on('completed', (job) => {
  console.log(`[Worker] ✓ Job ${job.id} completed`, job.returnvalue);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] ✗ Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[Worker] Error event:', error.message);
});

worker.on('stalled', (job) => {
  console.warn(`[Worker] Job ${job.id} stalled, will retry`);
});

console.log('[Phone Scrub Worker] Ready to process jobs');

// Graceful shutdown
async function shutdown() {
  console.log('[Worker] Shutting down gracefully...');
  try {
    await worker.close();
    await prisma.$disconnect();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

