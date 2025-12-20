import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normalizePhone } from '../utils/normalizePhone';
import { parseUploadFile } from '../utils/parseFile';
import { createLandlineZip, LandlineRow } from '../utils/createLandlineZip';
import { getPhoneCheckService } from '../services/phoneCheck.service';

const prisma = new PrismaClient();
const phoneCheckService = getPhoneCheckService();

/**
 * Phone scrub background job processor
 * Validates phone numbers, splits into mobile/landline, generates ZIP
 */
export async function phoneScrubWorker(job: Job) {
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
    const normalizedPhones = rows.map((row) => normalizePhone(row.phone, 'US'));

    // Validate phone numbers in batches
    console.log(`[${jobId}] Validating phones (batch processing)...`);
    const validationResults = await phoneCheckService.validatePhoneBatch(
      normalizedPhones
        .filter((result) => result.normalized !== null)
        .map((result) => result.normalized!)
    );

    console.log(`[${jobId}] Validation complete: ${validationResults.length} results`);

    // Split results into mobile and landline
    const mobiles: any[] = [];
    const landlines: LandlineRow[] = [];
    let processedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalization = normalizedPhones[i];

      if (!normalization.normalized) {
        // Invalid phone number, skip
        continue;
      }

      // Find corresponding validation result
      const validation = validationResults.find(
        (v) => v.phone === normalization.normalized
      );

      if (!validation) {
        // Validation not found, skip
        continue;
      }

      processedCount++;

      const phoneData = {
        phone: validation.phone,
        phone_type: validation.phone_type,
        carrier: validation.carrier,
        country: validation.country,
        is_valid: validation.is_valid,
      };

      // Split by phone type and validity
      if (validation.is_valid && validation.phone_type === 'mobile') {
        // Add to contacts (mobile numbers only)
        mobiles.push({
          ...row,
          ...phoneData,
        });
      } else if (validation.phone_type === 'landline') {
        // Add to landline export
        landlines.push(phoneData);
      }

      // Update progress every 100 rows
      if (processedCount % 100 === 0) {
        console.log(
          `[${jobId}] Progress: ${processedCount}/${totalRows} processed`
        );
      }
    }

    console.log(`[${jobId}] Results: ${mobiles.length} mobile, ${landlines.length} landline`);

    // Insert mobile contacts into database
    if (mobiles.length > 0) {
      console.log(`[${jobId}] Inserting ${mobiles.length} mobile contacts...`);
      await insertMobileContacts(orgId, mobiles);
    }

    // Create ZIP with landlines
    let zipPath: string | null = null;
    if (landlines.length > 0) {
      console.log(`[${jobId}] Creating landline ZIP...`);
      const exportPath = process.env.EXPORT_STORAGE_PATH || 'storage/exports';
      const zipFilePath = path.join(exportPath, `${jobId}-landlines.zip`);
      zipPath = await createLandlineZip(landlines, zipFilePath);
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
      },
    });

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`[${jobId}] Failed to delete upload file:`, error);
    }

    console.log(`[${jobId}] Job completed successfully`);

    return {
      jobId,
      totalRows,
      mobileCount: mobiles.length,
      landlineCount: landlines.length,
      zipPath,
    };
  } catch (error: any) {
    console.error(`[${jobId}] Job failed:`, error);

    // Update job status to FAILED
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn(`[${jobId}] Failed to delete upload file:`, err);
    }

    throw error;
  }
}

/**
 * Insert mobile contacts into database
 * Only inserts valid mobile numbers
 */
async function insertMobileContacts(
  organizationId: string,
  mobileRecords: any[]
): Promise<void> {
  // Batch insert to avoid overwhelming database
  const batchSize = 1000;

  for (let i = 0; i < mobileRecords.length; i += batchSize) {
    const batch = mobileRecords.slice(i, i + batchSize);

    // Create contacts
    const contactsData = batch.map((record) => ({
      organizationId,
      brandId: '', // Will be set by frontend or use org default
      firstName: record.firstName || 'Import',
      lastName: record.lastName || '',
      phone: record.phone,
      phoneType: record.phone_type,
      carrier: record.carrier,
      country: record.country,
      isPhoneValid: true,
      // Include any other fields from the original CSV
      ...(record.propertyAddress && { propertyAddress: record.propertyAddress }),
      ...(record.propertyCity && { propertyCity: record.propertyCity }),
      ...(record.propertyState && { propertyState: record.propertyState }),
      ...(record.propertyZip && { propertyZip: record.propertyZip }),
      ...(record.mailingAddress && { mailingAddress: record.mailingAddress }),
      ...(record.mailingCity && { mailingCity: record.mailingCity }),
      ...(record.mailingState && { mailingState: record.mailingState }),
      ...(record.mailingZip && { mailingZip: record.mailingZip }),
    }));

    // Use createMany with skipDuplicates to handle phone uniqueness
    await prisma.contact.createMany({
      data: contactsData,
      skipDuplicates: true,
    });
  }
}

/**
 * Update job status
 */
async function updateJobStatus(
  jobId: string,
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
): Promise<void> {
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: { status },
  });
}

/**
 * Create the worker processor function for BullMQ
 */
export function createPhoneScrubWorker() {
  return async (job: Job) => {
    return await phoneScrubWorker(job);
  };
}
