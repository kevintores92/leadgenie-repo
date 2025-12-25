const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PHONE_CHECK_API_KEY = process.env.PHONE_CHECK_API_KEY;
const PHONE_CHECK_BASE_URL = process.env.PHONE_CHECK_BASE_URL || 'https://phone-check.app/open-api';
const BATCH_SIZE = 100; // phone-check.app supports up to 500 per request, using 100 for safety
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

if (!PHONE_CHECK_API_KEY) {
  console.warn('[PhoneCheckService] PHONE_CHECK_API_KEY not configured. Phone validation will be skipped.');
}

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`[PhoneCheckService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Validate a batch of phone numbers
 * Calls phone-check.app API with up to BATCH_SIZE numbers
 */
async function validatePhoneBatch(phoneNumbers) {
  if (!PHONE_CHECK_API_KEY || phoneNumbers.length === 0) {
    return [];
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(
        `${PHONE_CHECK_BASE_URL}/check/v1/validate`,
        {
          phone_numbers: phoneNumbers,
        },
        {
          headers: {
            'Authorization': `Bearer ${PHONE_CHECK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
    });

    return response.data?.data || [];
  } catch (error) {
    console.error('[PhoneCheckService] API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
    });
    throw new Error(`Phone validation API failed: ${error.message}`);
  }
}

/**
 * Get cached validation for a phone number
 */
async function getCachedValidation(phone) {
  try {
    const cached = await prisma.phoneValidationCache.findUnique({
      where: { phone },
    });
    return cached || null;
  } catch (error) {
    console.error('[PhoneCheckService] Cache lookup error:', error.message);
    return null;
  }
}

/**
 * Save validation result to cache
 */
async function cacheValidationResult(phone, result) {
  try {
    await prisma.phoneValidationCache.upsert({
      where: { phone },
      update: {
        phoneType: result.phone_type,
        carrier: result.carrier,
        country: result.country,
        isValid: result.is_valid,
        lastCheckedAt: new Date(),
      },
      create: {
        phone,
        phoneType: result.phone_type,
        carrier: result.carrier,
        country: result.country,
        isValid: result.is_valid,
        lastCheckedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[PhoneCheckService] Cache save error:', error.message);
    // Don't throw - caching failure shouldn't block the process
  }
}

/**
 * Validate phone numbers with caching
 * Returns array of { phone, is_valid, phone_type, carrier, country, isCached }
 */
async function validatePhones(phoneNumbers) {
  const results = [];
  const phonesToValidate = [];
  const phoneToIndexMap = {};

  // Check cache for each phone
  for (const phone of phoneNumbers) {
    const cached = await getCachedValidation(phone);
    if (cached) {
      results.push({
        phone,
        is_valid: cached.isValid,
        phone_type: cached.phoneType,
        carrier: cached.carrier,
        country: cached.country,
        isCached: true,
      });
    } else {
      phoneToIndexMap[phone] = results.length;
      results.push(null); // Placeholder
      phonesToValidate.push(phone);
    }
  }

  // Validate uncached numbers in batches
  if (phonesToValidate.length > 0) {
    console.log(`[PhoneCheckService] Validating ${phonesToValidate.length} uncached numbers in batches of ${BATCH_SIZE}`);

    for (let i = 0; i < phonesToValidate.length; i += BATCH_SIZE) {
      const batch = phonesToValidate.slice(i, i + BATCH_SIZE);
      console.log(`[PhoneCheckService] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(phonesToValidate.length / BATCH_SIZE)}`);

      try {
        const apiResults = await validatePhoneBatch(batch);

        // Map results back and cache them
        for (const apiResult of apiResults) {
          const phone = apiResult.phone_number;
          const result = {
            phone,
            is_valid: apiResult.is_valid,
            phone_type: apiResult.phone_type || 'unknown',
            carrier: apiResult.carrier || null,
            country: apiResult.country || null,
            isCached: false,
          };

          // Cache the result
          await cacheValidationResult(phone, result);

          // Store in results array at the correct position
          const resultIndex = phoneToIndexMap[phone];
          if (resultIndex !== undefined) {
            results[resultIndex] = result;
          }
        }
      } catch (error) {
        console.error(`[PhoneCheckService] Batch validation failed:`, error.message);
        // Mark these phones as invalid with unknown type
        for (const phone of batch) {
          const resultIndex = phoneToIndexMap[phone];
          if (resultIndex !== undefined) {
            results[resultIndex] = {
              phone,
              is_valid: false,
              phone_type: 'unknown',
              carrier: null,
              country: null,
              isCached: false,
            };
          }
        }
      }
    }
  }

  return results.filter(r => r !== null);
}

/**
 * Log API usage for an upload job
 */
async function logApiUsage(jobId, phonesValidated, phonesCached) {
  console.log(`[PhoneCheckService] Job ${jobId}: ${phonesValidated} phones validated via API, ${phonesCached} from cache`);
}

module.exports = {
  validatePhones,
  validatePhoneBatch,
  getCachedValidation,
  cacheValidationResult,
  logApiUsage,
};
