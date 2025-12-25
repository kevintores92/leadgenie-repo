export const PRICING = {
  MONTHLY_SUBSCRIPTION: 49.00,
  SMS_COST: 0.025,
  VOICE_COST_PER_MINUTE: 0.20,
  PHONE_VALIDATION_COST: 0.00,
  DLC_BRAND_REGISTRATION: 4.00,
  DLC_CAMPAIGN_REGISTRATION: 15.00,
  PHONE_NUMBER_COST: 1.15,
  CONTACTS_PER_NUMBER: 250,
  DAILY_CAMPAIGN_LIMIT: 2000,
  ESTIMATED_REPLY_RATE: 0.35,
  ESTIMATED_HOT_LEAD_RATE: 0.15,
  ESTIMATED_CALL_DURATION_MINUTES: 2.0,
} as const;

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};
