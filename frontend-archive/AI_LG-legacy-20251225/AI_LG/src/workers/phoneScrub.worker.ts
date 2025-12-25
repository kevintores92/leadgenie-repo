import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normalizePhone } from '../utils/normalizePhone';
import { parseUploadFile } from '../utils/parseFile';
import { createLandlineZip, LandlineRow } from '../utils/createLandlineZip';
import { getPhoneCheckService } from '../services/phoneCheck.service';
import { normalizeAddress } from '../utils/normalizeAddress';

const prisma = new PrismaClient();
const phoneCheckService = getPhoneCheckService();

/**
 * Phone scrub background job processor
 * Validates phone numbers, splits into mobile/landline, generates ZIP
 */
export async function phoneScrubWorker(job: Job) {
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
      await insertMobileContacts(orgId, mobiles, {
        brandId: requestedBrandId || null,
        mapping: mapping || null,
        storeUnmappedCustomFields: storeUnmappedCustomFields !== false,
      });
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
  mobileRecords: any[],
  opts: {
    brandId: string | null;
    mapping: Record<string, string> | null;
    storeUnmappedCustomFields: boolean;
  }
): Promise<void> {
  const brandId = await resolveBrandId(organizationId, opts.brandId);

  // Batch insert to avoid overwhelming database
  const batchSize = 1000;

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

  function pickMappedValue(originalRecord: any, target: string): any {
    if (!mappingObj || !originalRecord) return undefined;
    const headers = Object.keys(mappingObj).filter((h) => mappingObj[h] === target);
    for (const header of headers) {
      const v = originalRecord[header];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
  }

  function buildCustomFields(originalRecord: any): Record<string, any> {
    if (!opts.storeUnmappedCustomFields || !originalRecord || typeof originalRecord !== 'object') return {};
    const out: Record<string, any> = {};
    const headers = Object.keys(originalRecord);
    for (const header of headers) {
      const name = String(header).trim();
      if (!name) continue;
      if (mappingObj && supportedTargets.has(mappingObj[header] || '')) continue;
      const value = originalRecord[header];
      if (value === undefined || value === null) continue;
      const asString = typeof value === 'string' ? value.trim() : value;
      if (asString === '') continue;
      out[name] = asString;
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

      const propertyAddress = pickMappedValue(original, 'propertyAddress') ?? record.propertyAddress;
      const mailingAddress = pickMappedValue(original, 'mailingAddress') ?? record.mailingAddress;

      const maybeTags =
        typeof mappedTags === 'string'
          ? mappedTags
              .split(/[,;|]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : Array.isArray(mappedTags)
            ? mappedTags
            : undefined;

      return {
        organizationId,
        brandId,
        firstName: String(record.firstName ?? mappedFirstName ?? 'Import'),
        lastName: String(record.lastName ?? mappedLastName ?? ''),
        phone: record.phone,
        phoneType: record.phone_type,
        carrier: record.carrier,
        country: record.country,
        isPhoneValid: true,
        ...(mappedStatus ? { status: String(mappedStatus) } : {}),
        ...(maybeTags ? { tags: maybeTags } : {}),
        ...(propertyAddress ? { propertyAddress: normalizeAddress(String(propertyAddress)) } : {}),
        ...(pickMappedValue(original, 'propertyCity') ?? record.propertyCity
          ? { propertyCity: String(pickMappedValue(original, 'propertyCity') ?? record.propertyCity) }
          : {}),
        ...(pickMappedValue(original, 'propertyState') ?? record.propertyState
          ? { propertyState: String(pickMappedValue(original, 'propertyState') ?? record.propertyState) }
          : {}),
        ...(pickMappedValue(original, 'propertyZip') ?? record.propertyZip
          ? { propertyZip: String(pickMappedValue(original, 'propertyZip') ?? record.propertyZip) }
          : {}),
        ...(mailingAddress ? { mailingAddress: normalizeAddress(String(mailingAddress)) } : {}),
        ...(pickMappedValue(original, 'mailingCity') ?? record.mailingCity
          ? { mailingCity: String(pickMappedValue(original, 'mailingCity') ?? record.mailingCity) }
          : {}),
        ...(pickMappedValue(original, 'mailingState') ?? record.mailingState
          ? { mailingState: String(pickMappedValue(original, 'mailingState') ?? record.mailingState) }
          : {}),
        ...(pickMappedValue(original, 'mailingZip') ?? record.mailingZip
          ? { mailingZip: String(pickMappedValue(original, 'mailingZip') ?? record.mailingZip) }
          : {}),
      };
    });

    await prisma.contact.createMany({ data: contactsData, skipDuplicates: true });

    // Store unmapped columns as custom fields
    if (opts.storeUnmappedCustomFields) {
      const phones = contactsData.map((c) => c.phone).filter(Boolean);
      const contacts = await prisma.contact.findMany({
        where: { brandId, phone: { in: phones } },
        select: { id: true, phone: true },
      });
      const contactIdByPhone = new Map(contacts.map((c) => [c.phone, c.id]));

      const perRecordCustomFields = batch.map((record) => ({
        phone: record.phone,
        customFields: buildCustomFields(record.originalRecord),
      }));

      const allFieldNames = Array.from(
        new Set(
          perRecordCustomFields
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
            perRecordCustomFields
              .map((r) => contactIdByPhone.get(r.phone))
              .filter(Boolean) as string[]
          )
        );

        if (contactIds.length > 0) {
          await prisma.contactCustomField.deleteMany({
            where: {
              contactId: { in: contactIds },
              fieldDefinitionId: { in: defIds },
            },
          });

          const valuesToInsert: { contactId: string; fieldDefinitionId: string; value: any }[] = [];
          for (const record of perRecordCustomFields) {
            const contactId = contactIdByPhone.get(record.phone);
            if (!contactId) continue;
            const cf = record.customFields || {};
            for (const [name, value] of Object.entries(cf)) {
              const defId = defIdByName.get(name);
              if (!defId) continue;
              valuesToInsert.push({ contactId, fieldDefinitionId: defId, value });
            }
          }

          // Keep batches reasonable
          const cfBatchSize = 2000;
          for (let j = 0; j < valuesToInsert.length; j += cfBatchSize) {
            await prisma.contactCustomField.createMany({
              data: valuesToInsert.slice(j, j + cfBatchSize),
            });
          }
        }
      }
    }
  }
}

async function resolveBrandId(organizationId: string, preferredBrandId: string | null): Promise<string> {
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
