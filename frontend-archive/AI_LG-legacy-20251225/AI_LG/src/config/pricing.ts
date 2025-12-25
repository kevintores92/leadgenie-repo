/**
 * Pricing Configuration
 * Centralized pricing constants for the application
 */

export const PRICING = {
  // Monthly Subscription
  MONTHLY_SUBSCRIPTION: 49.00, // $49/month covers 10DLC ($19) + 8-12 phone numbers (~$16-24) + platform
  
  // Usage-Based Charges (billed from wallet)
  SMS_COST: 0.025, // $0.025 per SMS (includes SMS Service($0.01), Carrier Fees($0.005), AI Classification & AI Replies ($0.005), Phone Verification & Lead Genie portion)
  VOICE_COST_PER_MINUTE: 0.20, // $0.20 per minute (includes AI + carrier)
  PHONE_VALIDATION_COST: 0.00, // Free phone validation (included)
  
  // One-Time Fees (included in subscription)
  DLC_BRAND_REGISTRATION: 4.00, // $4 monthly carrier fee (at cost)
  DLC_CAMPAIGN_REGISTRATION: 15.00, // $15 monthly carrier fee (at cost)
  PHONE_NUMBER_COST: 1.15, // $1.15-1.30 per number per month (carrier fee)
  
  // Campaign Limits
  CONTACTS_PER_NUMBER: 250, // 1 number per 250 contacts for proper rotation
  DAILY_CAMPAIGN_LIMIT: 2000, // Max contacts per brand per day (deliverability limit)
  
  // Estimated Conversion Rates
  ESTIMATED_REPLY_RATE: 0.35, // 35% reply rate
  ESTIMATED_HOT_LEAD_RATE: 0.15, // 15% conversion to hot leads
  
  // Call Duration Estimate
  ESTIMATED_CALL_DURATION_MINUTES: 2.0, // Average call duration (2 minutes)
} as const;

// Helper to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};
