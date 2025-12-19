/**
 * PayPal Integration Service
 * Handles PayPal API calls for subscriptions and payments
 */

import axios, { AxiosInstance } from 'axios'

interface PayPalConfig {
  clientId: string
  clientSecret: string
  mode: 'sandbox' | 'live'
}

interface PayPalToken {
  access_token: string
  app_id: string
  scope: string
  expires_in: number
}

interface PayPalSubscriptionPlan {
  id: string
  name: string
  description: string
  status: string
  billing_cycles: Array<{
    frequency: {
      interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
      interval_unit_amount: number
    }
    tenure_type: 'TRIAL' | 'REGULAR'
    sequence: number
    total_cycles: number
    pricing_scheme: {
      fixed_price: {
        value: string
        currency_code: string
      }
    }
  }>
}

export class PayPalService {
  private apiClient: AxiosInstance
  private config: PayPalConfig
  private cachedToken: PayPalToken | null = null
  private tokenExpireTime: number = 0

  constructor(config: PayPalConfig) {
    this.config = config
    const baseURL =
      config.mode === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com'

    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
    })
  }

  /**
   * Get access token from PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.cachedToken && Date.now() < this.tokenExpireTime) {
      return this.cachedToken.access_token
    }

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64')

    const response = await axios.post<PayPalToken>(
      `${this.config.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    this.cachedToken = response.data
    this.tokenExpireTime = Date.now() + response.data.expires_in * 1000 - 60000 // Refresh 1 min before expiry

    return response.data.access_token
  }

  /**
   * Create a subscription plan
   */
  async createSubscriptionPlan(
    name: string,
    description: string,
    priceUsd: string
  ): Promise<string> {
    const token = await this.getAccessToken()

    const response = await this.apiClient.post(
      '/v1/billing/plans',
      {
        product_id: 'PROD_SMSPLATFORM', // You'll need to create this product first
        name,
        description,
        type: 'REGULAR',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_unit_amount: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: priceUsd,
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_amount: 'YES',
          payment_failure_threshold: 3,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.id
  }

  /**
   * Create a subscription for a user
   */
  async createSubscription(
    planId: string,
    subscriberEmail: string,
    subscriberName: string
  ): Promise<{ subscriptionId: string; approvalLink: string }> {
    const token = await this.getAccessToken()

    const response = await this.apiClient.post(
      '/v1/billing/subscriptions',
      {
        plan_id: planId,
        subscriber: {
          name: {
            given_name: subscriberName,
          },
          email_address: subscriberEmail,
        },
        application_context: {
          brand_name: 'SMS Platform',
          locale: 'en-US',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.APP_URL}/billing/subscribe-success`,
          cancel_url: `${process.env.APP_URL}/billing/subscribe-cancel`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const approvalLink = response.data.links.find(
      (l: any) => l.rel === 'approve'
    )?.href

    return {
      subscriptionId: response.data.id,
      approvalLink: approvalLink || '',
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    const token = await this.getAccessToken()

    await this.apiClient.post(
      `/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        reason: reason || 'Customer requested cancellation',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    const token = await this.getAccessToken()

    const response = await this.apiClient.get(
      `/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    return response.data
  }

  /**
   * Create checkout session for wallet top-up
   */
  async createCheckoutSession(
    amount: string,
    currency: string = 'USD',
    notifyUrl?: string
  ): Promise<{ id: string; approveLink: string }> {
    const token = await this.getAccessToken()

    const response = await this.apiClient.post(
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount,
            },
          },
        ],
        application_context: {
          brand_name: 'SMS Platform',
          locale: 'en-US',
          user_action: 'PAY_NOW',
          return_url: `${process.env.APP_URL}/billing/topup-success`,
          cancel_url: `${process.env.APP_URL}/billing/topup-cancel`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const approveLink = response.data.links.find(
      (l: any) => l.rel === 'approve'
    )?.href

    return {
      id: response.data.id,
      approveLink: approveLink || '',
    }
  }

  /**
   * Capture payment from order
   */
  async capturePayment(orderId: string) {
    const token = await this.getAccessToken()

    const response = await this.apiClient.post(
      `/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data
  }

  /**
   * Verify webhook signature
   * PayPal sends this in the request body
   */
  async verifyWebhookSignature(
    webhookId: string,
    webhookEvent: any,
    transmissionId: string,
    transmissionTime: string,
    certUrl: string,
    authAlgo: string,
    transmissionSig: string
  ): Promise<boolean> {
    const token = await this.getAccessToken()

    try {
      const response = await this.apiClient.post(
        '/v1/notifications/verify-webhook-signature',
        {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data.verification_status === 'SUCCESS'
    } catch {
      return false
    }
  }
}
