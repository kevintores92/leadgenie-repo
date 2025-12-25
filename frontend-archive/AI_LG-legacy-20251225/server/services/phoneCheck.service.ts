const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Phone validation service for phone-check.app API
 * Handles batching, caching, and retries
 */
class PhoneCheckService {
  constructor() {
    this.apiKey = process.env.PHONE_CHECK_API_KEY || '';
    this.baseUrl = process.env.PHONE_CHECK_BASE_URL || 'https://phone-check.app/open-api';
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.batchSize = 100; // API batch size limit

    if (!this.apiKey) {
      throw new Error('PHONE_CHECK_API_KEY environment variable not set');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Validate a single phone number (checks cache first)
   */
  async validatePhone(normalizedPhone) {
    // Check cache first
    const cached = await this.getCached(normalizedPhone);
    if (cached) {
      return {
        phone: normalizedPhone,
        is_valid: cached.isValid,
        phone_type: cached.phoneType || undefined,
        carrier: cached.carrier || undefined,
        country: cached.country || undefined,
        cached: true,
      };
    }

    // Call API for uncached phone
    const result = await this.callAPI(normalizedPhone);

    // Cache the result
    await this.cacheResult(normalizedPhone, result);

    return result;
  }

  /**
   * Validate batch of phone numbers
   * Checks cache first, batches uncached numbers for API calls
   */
  async validatePhoneBatch(normalizedPhones) {
    const results = [];
    const uncachedPhones = [];
    const uncachedMap = new Map();

    // Check cache for each phone
    for (let i = 0; i < normalizedPhones.length; i++) {
      const phone = normalizedPhones[i];
      const cached = await this.getCached(phone);

      if (cached) {
        results[i] = {
          phone,
          is_valid: cached.isValid,
          phone_type: cached.phoneType || undefined,
          carrier: cached.carrier || undefined,
          country: cached.country || undefined,
          cached: true,
        };
      } else {
        uncachedPhones.push(phone);
        uncachedMap.set(phone, i);
      }
    }

    // Call API for uncached phones in batches
    if (uncachedPhones.length > 0) {
      const apiBatch = await this.callAPIBatch(uncachedPhones);

      for (const result of apiBatch) {
        const originalIndex = uncachedMap.get(result.phone);
        if (originalIndex !== undefined) {
          results[originalIndex] = result;
        }

        // Cache the API result
        await this.cacheResult(result.phone, result);
      }
    }

    return results;
  }

  /**
   * Call API for single phone
   */
  async callAPI(phone) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.post('/validate', { phone });

        return {
          phone,
          is_valid: response.data.is_valid || false,
          phone_type: response.data.phone_type,
          carrier: response.data.carrier,
          country: response.data.country,
          cached: false,
        };
      } catch (error) {
        // Retry on network errors
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed, return invalid result
        console.error(`Failed to validate ${phone}:`, error.message);
        return {
          phone,
          is_valid: false,
          cached: false,
        };
      }
    }

    return {
      phone,
      is_valid: false,
      cached: false,
    };
  }

  /**
   * Call API for batch of phones
   */
  async callAPIBatch(phones) {
    const results = [];

    // Split into chunks respecting API batch size
    for (let i = 0; i < phones.length; i += this.batchSize) {
      const chunk = phones.slice(i, i + this.batchSize);
      const chunkResults = await this.callAPIChunk(chunk);
      results.push(...chunkResults);

      // Rate limiting: wait between batches
      if (i + this.batchSize < phones.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Call API for a single chunk (max batchSize items)
   */
  async callAPIChunk(phones) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.post('/validate-batch', { phones });

        return response.data.map((item) => ({
          phone: item.phone,
          is_valid: item.is_valid || false,
          phone_type: item.phone_type,
          carrier: item.carrier,
          country: item.country,
          cached: false,
        }));
      } catch (error) {
        // Retry on network errors
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed, return all as invalid
        console.error(`Failed to validate batch:`, error.message);
        return phones.map((phone) => ({
          phone,
          is_valid: false,
          cached: false,
        }));
      }
    }

    return phones.map((phone) => ({
      phone,
      is_valid: false,
      cached: false,
    }));
  }

  /**
   * Get cached phone validation
   */
  async getCached(phone) {
    try {
      return await prisma.phoneValidationCache.findUnique({
        where: { phone },
      });
    } catch (error) {
      console.error(`Cache lookup failed for ${phone}:`, error);
      return null;
    }
  }

  /**
   * Cache validation result
   */
  async cacheResult(phone, result) {
    try {
      await prisma.phoneValidationCache.upsert({
        where: { phone },
        create: {
          phone,
          phoneType: result.phone_type,
          carrier: result.carrier,
          country: result.country,
          isValid: result.is_valid,
          lastCheckedAt: new Date(),
        },
        update: {
          phoneType: result.phone_type,
          carrier: result.carrier,
          country: result.country,
          isValid: result.is_valid,
          lastCheckedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Failed to cache ${phone}:`, error);
      // Non-fatal: continue without cache
    }
  }
}

/**
 * Singleton instance
 */
let instance = null;

function getPhoneCheckService() {
  if (!instance) {
    instance = new PhoneCheckService();
  }
  return instance;
}

module.exports = {
  PhoneCheckService,
  getPhoneCheckService,
};
