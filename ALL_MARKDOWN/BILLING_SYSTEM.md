# Billing System Implementation Guide

## Overview

This document describes the complete billing and payments system for the SMS SaaS platform. The system is built around two independent billing layers: **Subscriptions** (fixed monthly fees) and **Wallets** (prepaid usage-based).

## Architecture

### Database Schema

#### OrganizationWallet
- `balanceCents`: Current wallet balance in cents
- `isFrozen`: Set to true when subscription becomes inactive (prevents sending)
- Auto-created on first organization setup

#### WalletTransaction
- Records all wallet movements (top-ups, message debits, refunds, adjustments)
- `type`: PAYMENT_TOPUP, MESSAGE_DEBIT, REFUND, ADJUSTMENT
- `amountCents`: Negative for debits, positive for credits
- `referenceId`: Links to messageId, paymentId, or campaignId

#### OrganizationSubscription
- `provider`: PAYPAL or STRIPE (extensible)
- `providerSubId`: PayPal subscription ID
- `status`: ACTIVE, PAST_DUE, CANCELED, SUSPENDED
- `currentPeriodEnd`: When subscription renews
- Updated via PayPal webhooks

#### Organization Addition
- `pricingMarkupPercent`: Default 30% markup on Twilio costs

## Message Sending Enforcement

### Pre-Send Check (Worker Level)

Before ANY message is sent, the worker validates:

```
if (subscription.status !== ACTIVE) → BLOCK
if (wallet.isFrozen) → BLOCK
if (wallet.balanceCents < estimatedCostWithMarkup) → BLOCK
else → ALLOW SEND
```

### Estimated Cost Calculation

```
estimatedCost = (twilioBaseCost * (100 + markupPercent)) / 100
```

Example:
- Twilio base: $0.0079
- Markup: 30%
- Estimated cost: $0.01027 ($1.027 per 100 messages)

## Final Billing (Twilio Webhook)

### Successful Delivery

When Twilio status = `delivered`:

```
finalCost = calculateFinalCost(twilioActualPrice)
wallet.balanceCents -= finalCost
recordTransaction(MESSAGE_DEBIT, -finalCost, messageId)
```

### Failed Delivery

When Twilio status = `failed` or `undelivered`:
- No charge
- No wallet debit
- Release any internal hold

## Payment Flow

### Subscription (PayPal Monthly)

1. **Create Subscription**
   - Endpoint: `POST /api/billing/create-subscription`
   - Creates PayPal subscription plan
   - Redirects to PayPal for approval
   - Saves subscription in DB (status: PAST_DUE)

2. **PayPal Webhook: BILLING.SUBSCRIPTION.ACTIVATED**
   - Updates subscription.status → ACTIVE
   - Calls `TwilioSubaccountService.activateSubaccount()`
   - Unfreezes wallet
   - Organization can now send

3. **PayPal Webhook: BILLING.SUBSCRIPTION.SUSPENDED**
   - Updates subscription.status → PAST_DUE
   - Calls `TwilioSubaccountService.suspendSubaccount()`
   - Freezes wallet
   - Blocks all sends

4. **PayPal Webhook: BILLING.SUBSCRIPTION.CANCELLED**
   - Updates subscription.status → CANCELED
   - Suspends Twilio subaccount permanently
   - Freezes wallet

### Wallet Top-Up (PayPal One-Time)

1. **Create Checkout**
   - Endpoint: `POST /api/billing/create-topup`
   - Fixed amounts: $50, $100, $250
   - Creates PayPal order
   - Redirects to PayPal Checkout

2. **PayPal Webhook: PAYMENT.SALE.COMPLETED**
   - Extracts organization ID from order metadata
   - Calculates cents: $100 → 10000¢
   - `wallet.balanceCents += 10000`
   - Records PAYMENT_TOPUP transaction
   - User sees immediate balance increase

3. **PayPal Webhook: PAYMENT.SALE.DENIED**
   - Logs denial
   - No credit applied
   - User sees error message

## Twilio Subaccount Automation

### Suspension (Stops Charges)

When subscription becomes non-ACTIVE:

```
twilio.subaccounts(subaccountSid).update({ status: 'suspended' })
```

**Impact:**
- Subaccount cannot make API calls
- Cannot send messages
- Twilio stops accruing charges on this account
- Existing numbers remain assigned but inactive

### Activation (Resumes Charges)

When subscription returns to ACTIVE:

```
twilio.subaccounts(subaccountSid).update({ status: 'active' })
```

**Impact:**
- Subaccount can make API calls again
- Messages can be sent
- Twilio resumes charging for sends

## Key Safety Rules

❌ **No negative wallet balances**
- Debit fails if insufficient balance
- Message send is blocked before attempting

❌ **No sending without both layers**
- Must have ACTIVE subscription AND sufficient wallet
- Either being inactive blocks sends

❌ **No Twilio charges when inactive**
- Subaccount is suspended when subscription inactive
- Prevents surprise charges

❌ **Wallet freezing on non-payment**
- Subscription non-ACTIVE → wallet frozen
- Prevents accidental sends after payment failure

❌ **No backend contract changes**
- All changes are additive
- Existing endpoints unchanged
- New billing endpoints are isolated

## API Endpoints

### Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/billing/status` | Get wallet balance, subscription status |
| POST | `/api/billing/create-subscription` | Start monthly subscription |
| POST | `/api/billing/create-topup` | Start wallet top-up checkout |
| POST | `/api/webhooks/paypal` | PayPal webhook handler |
| POST | `/api/webhooks/twilio` | Twilio delivery status webhook |

### Services

```typescript
// BillingService (backend-api/src/services/billingService.ts)
- canSendMessage(orgId, estimatedCost) → { canSend, reason }
- calculateFinalCost(orgId, basePriceCents) → finalCostCents
- debitWallet(orgId, amountCents, referenceId) → void
- creditWallet(orgId, amountCents, referenceId) → void
- freezeWallet(orgId) → void
- unfreezeWallet(orgId) → void
- getSubscription(orgId) → subscription
- upsertSubscription(...) → subscription
- getWalletBalance(orgId) → cents

// PayPalService (backend-api/src/services/paypalService.ts)
- createSubscriptionPlan(name, description, priceUsd) → planId
- createSubscription(planId, email, name) → { subscriptionId, approvalLink }
- createCheckoutSession(amount) → { id, approveLink }
- capturePayment(orderId) → paymentData
- cancelSubscription(subscriptionId) → void
- verifyWebhookSignature(...) → boolean

// TwilioSubaccountService (backend-api/src/services/twilioSubaccountService.ts)
- suspendSubaccount(subaccountSid) → void
- activateSubaccount(subaccountSid) → void
- handleSubscriptionStatusChange(orgId, newStatus) → void
```

## Worker-Level Checks

### Before Send (campaignSender.js)

```javascript
const { checkBillingBeforeSend } = require('./lib/billingCheck.js');

// Before sending each message:
const { canSend, reason, estimatedCostCents } = await checkBillingBeforeSend(
  organizationId,
  twilioEstimatedCostUsd
);

if (!canSend) {
  console.log(`❌ Send blocked: ${reason}`);
  // Don't send, hold message in queue
  return;
}

// Send message
const result = await twilioClient.messages.create({...});
```

## Environment Variables

```env
# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox|live
PAYPAL_WEBHOOK_ID=
PAYPAL_PLAN_STARTER=
PAYPAL_PLAN_PRO=

# Twilio (Master Account - for subaccount management)
TWILIO_MASTER_ACCOUNT_SID=
TWILIO_MASTER_AUTH_TOKEN=

# App
APP_URL=http://localhost:3000 (for PayPal redirects)
```

## Webhook Signature Verification

### PayPal

PayPal webhooks include signature headers:
- `paypal-transmission-id`
- `paypal-transmission-time`
- `paypal-cert-url`
- `paypal-auth-algo`
- `paypal-transmission-sig`

Verified via `PayPalService.verifyWebhookSignature()`

### Twilio

Twilio webhooks should be verified using the official Twilio Node library or by calculating the signature with your AuthToken.

## Testing Checklist

- [ ] Create subscription → PayPal approve → webhook activates
- [ ] Subscription payment fails → wallet freezes → sends blocked
- [ ] Wallet balance shows correctly in UI
- [ ] Message send deducts correct amount (with markup)
- [ ] Failed messages don't charge wallet
- [ ] Top-up $50 → wallet credited
- [ ] Twilio subaccount suspended when subscription inactive
- [ ] Twilio subaccount activated when subscription resumes
- [ ] Idempotent webhooks (duplicate events don't double-charge)

## Future Enhancements

- [ ] Stripe support (in addition to PayPal)
- [ ] Usage analytics dashboard
- [ ] Automatic top-up on low balance
- [ ] Tiered pricing by volume
- [ ] Monthly invoices
- [ ] Refund/reversal handling
- [ ] Account credits and promotions
