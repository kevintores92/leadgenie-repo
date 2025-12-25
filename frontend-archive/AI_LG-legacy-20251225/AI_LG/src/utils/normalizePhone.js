const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Normalize phone number to E.164 format
 * Returns E.164 formatted number or null if invalid
 */
function normalizePhone(phoneString, defaultCountry = 'US') {
  if (!phoneString || typeof phoneString !== 'string') {
    return null;
  }

  try {
    // Remove common separators and whitespace but keep the number
    let cleaned = phoneString.trim();

    // Parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return null;
    }

    // Return E.164 format: +<country_code><area_code><number>
    return phoneNumber.format('E.164');
  } catch (error) {
    // If parsing fails, try basic cleaning and validation
    return tryBasicNormalization(phoneString, defaultCountry);
  }
}

/**
 * Fallback basic normalization
 * Removes non-numeric characters and applies basic formatting
 */
function tryBasicNormalization(phoneString, defaultCountry = 'US') {
  try {
    // Remove all non-numeric characters
    const digits = phoneString.replace(/\D/g, '');

    if (digits.length === 0) {
      return null;
    }

    // Handle US/Canada numbers (10 digits)
    if (defaultCountry === 'US' || defaultCountry === 'CA') {
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
      }
      if (digits.length === 11) {
        return `+1${digits.substring(1)}`;
      }
    }

    // For international numbers, just add + if not present
    if (digits.length >= 10) {
      if (phoneString.includes('+')) {
        return `+${digits}`;
      }
      // Assume country code if we don't have one
      return `+${digits}`;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate if a phone number is in E.164 format
 */
function isValidE164(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return /^\+\d{1,15}$/.test(phone);
}

/**
 * Extract country code from E.164 phone number
 */
function getCountryCode(e164Phone) {
  if (!isValidE164(e164Phone)) {
    return null;
  }

  // Extract country code (typically 1-3 digits)
  const match = e164Phone.match(/^\+(\d{1,3})/);
  return match ? match[1] : null;
}

/**
 * Batch normalize phone numbers
 */
function normalizeBatch(phoneStrings, defaultCountry = 'US') {
  return phoneStrings.map(phone => ({
    original: phone,
    normalized: normalizePhone(phone, defaultCountry),
  }));
}

module.exports = {
  normalizePhone,
  isValidE164,
  getCountryCode,
  normalizeBatch,
  tryBasicNormalization,
};
