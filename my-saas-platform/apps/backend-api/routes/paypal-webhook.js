/**
 * POST /webhooks/paypal
 * Handle PayPal webhook events (subscriptions, payments)
 *
 * IMPORTANT: This route must receive raw body for signature verification
 * Configure your Express/Fastify setup to provide rawBody for this endpoint
 */

const express = require('express');
const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const {
  safeCreditWallet,
  freezeWallet,
  unfreezeWallet,
} = require('../src/services/walletTransactionService');
const {
  suspendTwilioSubaccount,
  reactivateTwilioSubaccount,
} = require('../src/services/twilioSuspensionService');
const {
  pauseCampaigns,
  resumeCampaignsIfEligible,
} = require('../src/services/campaignPauseService');

const router = express.Router();
const prisma = new PrismaClient();

const PAYPAL_API =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/**
 * Get PayPal access token for API calls
 */
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

/**
 * Verify PayPal webhook signature
 */
async function verifyPayPalWebhook(req, rawBody) {
  try {
    const accessToken = await getPayPalAccessToken();

    const res = await fetch(
      `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    const result = await res.json();
    return result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[PayPal Webhook] Verification error:", error);
    return false;
  }
}

/**
 * Handle BILLING.SUBSCRIPTION.ACTIVATED event
 */
async function handleSubscriptionActivated(event) {
  try {
    const subId = event.resource.id;

    const sub = await prisma.organizationSubscription.findUnique({
      where: { providerSubId: subId },
    });

    if (!sub) {
      console.warn(`[PayPal Webhook] Subscription not found: ${subId}`);
      return;
    }

    await prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE" },
    });

    // Reactivate Twilio subaccount
    await reactivateTwilioSubaccount(sub.organizationId);

    // Unfreeze wallet
    await unfreezeWallet(sub.organizationId);

    // Resume eligible campaigns
    await resumeCampaignsIfEligible(sub.organizationId);

    console.log(
      `[PayPal Webhook] Subscription activated: ${sub.organizationId}`
    );
  } catch (error) {
    console.error("[PayPal Webhook] Error handling subscription activation:", error);
    throw error;
  }
}

/**
 * Handle subscription cancellation / payment denial events
 */
async function handleSubscriptionSuspended(event) {
  try {
    const subId = event.resource.id;

    const sub = await prisma.organizationSubscription.findUnique({
      where: { providerSubId: subId },
    });

    if (!sub) {
      console.warn(`[PayPal Webhook] Subscription not found: ${subId}`);
      return;
    }

    await prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: { status: "SUSPENDED" },
    });

    // Suspend Twilio subaccount (prevents all charges)
    await suspendTwilioSubaccount(sub.organizationId);

    // Freeze wallet
    await freezeWallet(sub.organizationId);

    // Pause all campaigns
    await pauseCampaigns(sub.organizationId);

    console.log(
      `[PayPal Webhook] Subscription suspended: ${sub.organizationId}`
    );
  } catch (error) {
    console.error("[PayPal Webhook] Error handling subscription suspension:", error);
    throw error;
  }
}

/**
 * Handle PAYMENT.SALE.COMPLETED event (wallet top-up)
 * Idempotent: checks if payment already processed
 */
async function handleWalletTopup(event) {
  try {
    const capture = event.resource;
    const paymentId = capture.id;

    // Idempotency check: prevent duplicate credits
    const exists = await prisma.walletTransaction.findFirst({
      where: { referenceId: paymentId },
    });

    if (exists) {
      console.log(
        `[PayPal Webhook] Payment already processed: ${paymentId}`
      );
      return;
    }

    const amountCents = Math.round(
      Number(capture.amount.total) * 100
    );

    // Extract organization ID from custom field
    const organizationId = capture.custom_id;

    if (!organizationId) {
      console.error(`[PayPal Webhook] No organization ID in payment: ${paymentId}`);
      return;
    }

    // Credit wallet using safe transaction service
    const result = await safeCreditWallet(organizationId, amountCents, paymentId);

    if (!result.success) {
      console.error(
        `[PayPal Webhook] Failed to credit wallet: ${result.error}`
      );
      return;
    }

    console.log(
      `[PayPal Webhook] Wallet topped up: ${organizationId} (+$${(amountCents / 100).toFixed(2)})`
    );
  } catch (error) {
    console.error("[PayPal Webhook] Error handling wallet top-up:", error);
    throw error;
  }
}

/**
 * Main webhook handler
 */
router.post("/webhooks/paypal", async (req, res) => {
  try {
    // Get raw body (must be provided by Express middleware)
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const verified = await verifyPayPalWebhook(req, rawBody);

    if (!verified) {
      console.error("[PayPal Webhook] Signature verification failed");
      return res.status(400).send("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody);
    const type = event.event_type;

    console.log(`[PayPal Webhook] Received event: ${type}`);

    // Handle specific event types
    switch (type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event);
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "PAYMENT.SALE.DENIED":
        await handleSubscriptionSuspended(event);
        break;

      case "PAYMENT.SALE.COMPLETED":
        await handleWalletTopup(event);
        break;

      default:
        console.log(`[PayPal Webhook] Unhandled event type: ${type}`);
    }

    // Always return 200 to prevent PayPal retries
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[PayPal Webhook] Error processing webhook:", error);
    // Still return 200 to avoid PayPal retries, but log the error
    return res.status(200).send("OK");
  }
});

module.exports = router;