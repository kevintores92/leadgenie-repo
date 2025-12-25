/**
 * Normalize phone numbers to E.164 format
 * E.164 format: +[country code][number]
 * Example: +12015550123
 */

const libphonenumber = require('libphonenumber-js');

/**
 * Normalize a phone number to E.164 format
 * Attempts to parse with multiple default regions if initial parse fails
 * @param {string} phone Raw phone number string
 * @param {string} defaultRegion ISO 3166-1 country code (e.g., 'US', 'CA')
 * @returns {Object} Normalized phone object or null if invalid
 */
function normalizePhone(phone, defaultRegion = 'US') {
  if (!phone || typeof phone !== 'string') {
    return { normalized: null, isValid: false, country: null };
  }

  // Remove common formatting characters
  let cleaned = phone.trim();
  cleaned = cleaned.replace(/[\s\-().]/g, '');

  // Remove leading + if present (will re-add in E.164)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Filter out non-numeric characters except leading +
  cleaned = cleaned.replace(/[^\d]/g, '');

  if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
    return { normalized: null, isValid: false, country: null };
  }

  try {
    // Try parsing with default region first
    const parsed = libphonenumber.parsePhoneNumber(cleaned, defaultRegion);

    if (parsed && libphonenumber.isValidPhoneNumber(parsed)) {
      return {
        normalized: parsed.format('E.164'),
        isValid: true,
        country: parsed.country,
      };
    }

    // Fallback: Try without region assumption (if number looks international)
    if (cleaned.length > 10) {
      const parsedIntl = libphonenumber.parsePhoneNumber('+' + cleaned);
      if (parsedIntl && libphonenumber.isValidPhoneNumber(parsedIntl)) {
        return {
          normalized: parsedIntl.format('E.164'),
          isValid: true,
          country: parsedIntl.country,
        };
      }
    }

    return { normalized: null, isValid: false, country: null };
  } catch (error) {
    return { normalized: null, isValid: false, country: null };
  }
}

/**
 * Batch normalize phone numbers
 * @param {Array} phones Array of phone strings
 * @param {string} defaultRegion Default region for parsing
 * @returns {Array} Array of normalized results
 */
function normalizePhoneBatch(phones, defaultRegion = 'US') {
  return phones.map((phone) => normalizePhone(phone, defaultRegion));
}

/**
 * Get country code from E.164 formatted phone
 * @param {string} e164Phone Phone in E.164 format (e.g., +12015550123)
 * @returns {string|null} Country code (e.g., 'US') or null
 */
function getCountryFromE164(e164Phone) {
  if (!e164Phone || !e164Phone.startsWith('+')) {
    return null;
  }

  try {
    const parsed = libphonenumber.parsePhoneNumber(e164Phone);
    return parsed?.country || null;
  } catch {
    return null;
  }
}

module.exports = {
  normalizePhone,
  normalizePhoneBatch,
  getCountryFromE164,
};
