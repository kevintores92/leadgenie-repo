const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parseUploadFile } = require('../utils/parseFile');
const { createLandlineZip } = require('../utils/createLandlineZip');
const { normalizePhone } = require('../utils/normalizePhone');
const { normalizeAddress } = require('../utils/normalizeAddress');
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
  const {
    jobId,
    userId,
    orgId,
    filePath,
    filename,
    mapping,
    brandId: requestedBrandId,
    storeUnmappedCustomFields,
  } = job.data;

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
      await insertMobileContacts(jobId, orgId, mobiles, {
        brandId: requestedBrandId || null,
        mapping: mapping || null,
        storeUnmappedCustomFields: storeUnmappedCustomFields !== false,
      });
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
  const opts = arguments.length >= 4 ? arguments[3] : { brandId: null, mapping: null, storeUnmappedCustomFields: true };
  const brandId = await resolveBrandId(organizationId, opts.brandId);

  const batchSize = 1000;
  let insertedCount = 0;
  let skippedCount = 0;

  const mappingObj = opts.mapping;
  const supportedTargets = new Set([
    'firstName',
    'lastName',
    'phone',
    'propertyAddress',
    'propertyCity',
    'propertyState',
    'propertyZip',
    'mailingAddress',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'status',
    'tags',
  ]);

  function pickMappedValue(originalRecord, target) {
    if (!mappingObj || !originalRecord) return undefined;
    const headers = Object.keys(mappingObj).filter((h) => mappingObj[h] === target);
    for (const header of headers) {
      const v = originalRecord[header];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
  }

  function buildCustomFields(originalRecord) {
    if (!opts.storeUnmappedCustomFields || !originalRecord || typeof originalRecord !== 'object') return {};
    const out = {};
    for (const header of Object.keys(originalRecord)) {
      const name = String(header || '').trim();
      if (!name) continue;
      if (mappingObj && supportedTargets.has(mappingObj[header] || '')) continue;
      const value = originalRecord[header];
      if (value === undefined || value === null) continue;
      const v = typeof value === 'string' ? value.trim() : value;
      if (v === '') continue;
      out[name] = v;
    }
    return out;
  }

  for (let i = 0; i < mobileRecords.length; i += batchSize) {
    const batch = mobileRecords.slice(i, i + batchSize);

    const contactsData = batch.map((record) => {
      const original = record.originalRecord || record;
      const mappedFirstName = pickMappedValue(original, 'firstName');
      const mappedLastName = pickMappedValue(original, 'lastName');
      const mappedStatus = pickMappedValue(original, 'status');
      const mappedTags = pickMappedValue(original, 'tags');

      const tags =
        typeof mappedTags === 'string'
          ? mappedTags
              .split(/[,;|]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : Array.isArray(mappedTags)
            ? mappedTags
            : undefined;

      const propertyAddress = pickMappedValue(original, 'propertyAddress') ?? record.originalRecord?.propertyAddress;
      const mailingAddress = pickMappedValue(original, 'mailingAddress') ?? record.originalRecord?.mailingAddress;

      return {
      organizationId,
      brandId,
      firstName: String(record.firstName || mappedFirstName || 'Import'),
      lastName: String(record.lastName || mappedLastName || ''),
      phone: record.phone,
      phoneType: record.phone_type,
      carrier: record.carrier,
      country: record.country,
      isPhoneValid: true,
      status: 'ACTIVE',
      // Optional fields if present in original record
      ...(mappedStatus ? { status: String(mappedStatus) } : {}),
      ...(tags ? { tags } : {}),
      ...(propertyAddress ? { propertyAddress: normalizeAddress(String(propertyAddress)) } : {}),
      ...(pickMappedValue(original, 'propertyCity') ?? record.originalRecord?.propertyCity
        ? { propertyCity: String(pickMappedValue(original, 'propertyCity') ?? record.originalRecord?.propertyCity) }
        : {}),
      ...(pickMappedValue(original, 'propertyState') ?? record.originalRecord?.propertyState
        ? { propertyState: String(pickMappedValue(original, 'propertyState') ?? record.originalRecord?.propertyState) }
        : {}),
      ...(pickMappedValue(original, 'propertyZip') ?? record.originalRecord?.propertyZip
        ? { propertyZip: String(pickMappedValue(original, 'propertyZip') ?? record.originalRecord?.propertyZip) }
        : {}),
      ...(mailingAddress ? { mailingAddress: normalizeAddress(String(mailingAddress)) } : {}),
      ...(pickMappedValue(original, 'mailingCity') ?? record.originalRecord?.mailingCity
        ? { mailingCity: String(pickMappedValue(original, 'mailingCity') ?? record.originalRecord?.mailingCity) }
        : {}),
      ...(pickMappedValue(original, 'mailingState') ?? record.originalRecord?.mailingState
        ? { mailingState: String(pickMappedValue(original, 'mailingState') ?? record.originalRecord?.mailingState) }
        : {}),
      ...(pickMappedValue(original, 'mailingZip') ?? record.originalRecord?.mailingZip
        ? { mailingZip: String(pickMappedValue(original, 'mailingZip') ?? record.originalRecord?.mailingZip) }
        : {}),
      };
    });

    try {
      const result = await prisma.contact.createMany({
        data: contactsData,
        skipDuplicates: true,
      });
      insertedCount += result.count;
      skippedCount += batch.length - result.count;
      console.log(`[${jobId}] Batch inserted: ${result.count} new, ${batch.length - result.count} skipped (duplicates)`);

      // Store unmapped columns as custom fields (delete+recreate per batch to avoid duplicates)
      if (opts.storeUnmappedCustomFields) {
        const phones = contactsData.map((c) => c.phone).filter(Boolean);
        const contacts = await prisma.contact.findMany({
          where: { brandId, phone: { in: phones } },
          select: { id: true, phone: true },
        });
        const contactIdByPhone = new Map(contacts.map((c) => [c.phone, c.id]));

        const perRecord = batch.map((record) => ({
          phone: record.phone,
          customFields: buildCustomFields(record.originalRecord),
        }));

        const allFieldNames = Array.from(
          new Set(
            perRecord
              .flatMap((r) => Object.keys(r.customFields || {}))
              .map((n) => String(n).trim())
              .filter(Boolean)
          )
        ).slice(0, 500);

        if (allFieldNames.length > 0) {
          const existingDefs = await prisma.customFieldDefinition.findMany({
            where: { brandId, name: { in: allFieldNames } },
          });
          const defByName = new Map(existingDefs.map((d) => [d.name, d]));

          for (const name of allFieldNames) {
            if (!defByName.has(name)) {
              const created = await prisma.customFieldDefinition.create({
                data: { brandId, name, type: 'STRING' },
              });
              defByName.set(name, created);
            }
          }

          const defs = Array.from(defByName.values());
          const defIdByName = new Map(defs.map((d) => [d.name, d.id]));
          const defIds = defs.map((d) => d.id);

          const contactIds = Array.from(
            new Set(
              perRecord
                .map((r) => contactIdByPhone.get(r.phone))
                .filter(Boolean)
            )
          );

          if (contactIds.length > 0) {
            await prisma.contactCustomField.deleteMany({
              where: {
                contactId: { in: contactIds },
                fieldDefinitionId: { in: defIds },
              },
            });

            const valuesToInsert = [];
            for (const r of perRecord) {
              const contactId = contactIdByPhone.get(r.phone);
              if (!contactId) continue;
              for (const [name, value] of Object.entries(r.customFields || {})) {
                const defId = defIdByName.get(name);
                if (!defId) continue;
                valuesToInsert.push({ contactId, fieldDefinitionId: defId, value });
              }
            }

            const cfBatchSize = 2000;
            for (let j = 0; j < valuesToInsert.length; j += cfBatchSize) {
              await prisma.contactCustomField.createMany({
                data: valuesToInsert.slice(j, j + cfBatchSize),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`[${jobId}] Batch insert error:`, error.message);
      // Continue with next batch even if one fails
    }
  }

  console.log(`[${jobId}] Insert complete: ${insertedCount} inserted, ${skippedCount} skipped`);
}

async function resolveBrandId(organizationId, preferredBrandId) {
  if (preferredBrandId) {
    const brand = await prisma.brand.findUnique({ where: { id: preferredBrandId } });
    if (brand && brand.orgId === organizationId) return preferredBrandId;
  }

  const brand = await prisma.brand.findFirst({
    where: { orgId: organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!brand) throw new Error('No brand found for organization; cannot import contacts');
  return brand.id;
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

