/**
 * Billing Provider Adapter Interface
 * Abstract payment provider (PayPal, Stripe, etc) from business logic
 */

export interface BillingProviderAdapter {
  /**
   * Create subscription
   */
  createSubscription(
    organizationId: string,
    planId: string
  ): Promise<{ subscriptionId: string; status: string }>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Reactivate subscription
   */
  reactivateSubscription(subscriptionId: string): Promise<void>;

  /**
   * Verify webhook signature
   * Returns true if signature is valid
   */
  verifyWebhook(req: any): Promise<boolean>;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(body: string): Promise<any>;

  /**
   * Get subscription status
   */
  getSubscriptionStatus(subscriptionId: string): Promise<string>;
}

/**
 * Supported billing providers
 */
export enum BillingProvider {
  PAYPAL = "PAYPAL",
  STRIPE = "STRIPE",
}

/**
 * Get adapter for provider
 */
export function getAdapter(provider: BillingProvider): BillingProviderAdapter {
  switch (provider) {
    case BillingProvider.PAYPAL:
      const PayPalAdapter = require("./adapters/paypalAdapter").PayPalAdapter;
      return new PayPalAdapter();
    case BillingProvider.STRIPE:
      const StripeAdapter = require("./adapters/stripeAdapter").StripeAdapter;
      return new StripeAdapter();
    default:
      throw new Error(`Unknown billing provider: ${provider}`);
  }
}
