/**
 * PayPal Billing Provider Adapter
 * Implements BillingProviderAdapter interface for PayPal
 */

import fetch from "node-fetch";
import { BillingProviderAdapter } from "../billingProviderAdapter";

export class PayPalAdapter implements BillingProviderAdapter {
  private paypalAPI =
    process.env.NODE_ENV === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(`${this.paypalAPI}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = (await res.json()) as any;
    return data.access_token;
  }

  /**
   * Create subscription via PayPal
   */
  async createSubscription(
    organizationId: string,
    planId: string
  ): Promise<{ subscriptionId: string; status: string }> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.paypalAPI}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: organizationId,
        status: "APPROVAL_PENDING",
      }),
    });

    const data = (await res.json()) as any;
    return {
      subscriptionId: data.id,
      status: data.status,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const token = await this.getAccessToken();

    await fetch(
      `${this.paypalAPI}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "SUBSCRIPTION_CANCELLED_BY_MERCHANT",
        }),
      }
    );
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    const token = await this.getAccessToken();

    await fetch(
      `${this.paypalAPI}/v1/billing/subscriptions/${subscriptionId}/activate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "SUBSCRIPTION_REACTIVATED_BY_MERCHANT",
        }),
      }
    );
  }

  /**
   * Verify webhook signature with PayPal
   */
  async verifyWebhook(req: any): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const res = await fetch(
        `${this.paypalAPI}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            auth_algo: req.headers["paypal-auth-algo"],
            cert_url: req.headers["paypal-cert-url"],
            transmission_id: req.headers["paypal-transmission-id"],
            transmission_sig: req.headers["paypal-transmission-sig"],
            transmission_time: req.headers["paypal-transmission-time"],
            webhook_id: process.env.PAYPAL_WEBHOOK_ID,
            webhook_event: JSON.parse(rawBody),
          }),
        }
      );

      const result = (await res.json()) as any;
      return result.verification_status === "SUCCESS";
    } catch (error) {
      console.error("[PayPalAdapter] Webhook verification error:", error);
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  async parseWebhookEvent(body: string): Promise<any> {
    return JSON.parse(body);
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<string> {
    const token = await this.getAccessToken();

    const res = await fetch(
      `${this.paypalAPI}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = (await res.json()) as any;
    return data.status;
  }
}
