// Phone validation service using phone-check.app API
const PHONE_CHECK_API_URL = 'https://api.phone-check.app/v1-get-phone-details';
const PHONE_CHECK_API_KEY = '6945da43532a712bf81292cb-ec89fc7ca008';

export interface PhoneValidationResult {
  number: string;
  valid: boolean;
  type: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier?: string;
  country?: string;
  isDisposable: boolean;
}

export async function validatePhoneNumber(phoneNumber: string): Promise<PhoneValidationResult> {
  // Ensure E.164 format (add +1 if US number without +)
  let formattedNumber = phoneNumber.trim();
  if (!formattedNumber.startsWith('+')) {
    // Assume US number if no country code
    formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
  }

  const response = await fetch(`${PHONE_CHECK_API_URL}?phone=${encodeURIComponent(formattedNumber)}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-api-key': PHONE_CHECK_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Phone validation failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    number: formattedNumber,
    valid: data.valid ?? false,
    type: (data.type || 'unknown').toLowerCase() as any,
    carrier: data.carrier,
    country: data.country,
    isDisposable: data.isDisposable ?? false
  };
}

export async function validatePhoneList(phoneNumbers: string[]): Promise<{
  results: PhoneValidationResult[];
  totalRows: number;
  verifiedMobile: number;
  verifiedLandline: number;
}> {
  const results: PhoneValidationResult[] = [];
  let verifiedMobile = 0;
  let verifiedLandline = 0;

  // Validate each phone number sequentially
  // TODO: Implement batch API when available
  for (const phoneNumber of phoneNumbers) {
    try {
      const result = await validatePhoneNumber(phoneNumber);
      results.push(result);

      if (result.valid && !result.isDisposable) {
        if (result.type === 'mobile') {
          verifiedMobile++;
        } else if (result.type === 'landline') {
          verifiedLandline++;
        }
      }
    } catch (error) {
      console.error(`Failed to validate ${phoneNumber}:`, error);
      results.push({
        number: phoneNumber,
        valid: false,
        type: 'unknown',
        isDisposable: false
      });
    }
  }

  return {
    results,
    totalRows: phoneNumbers.length,
    verifiedMobile,
    verifiedLandline
  };
}
