# PayPal Webhook Handler & Wallet UI - Implementation Guide

## Overview

This guide covers the complete implementation of:
1. **PayPal Webhook Handler** - TypeScript backend route that processes subscription and payment events
2. **Wallet Summary API** - Endpoint that returns wallet data for frontend display
3. **WalletSummaryCard Component** - React component displaying wallet balance, status, and eligibility

---

## 1. Environment Variables (REQUIRED)

Add these to your `.env.local` (frontend) and `.env` (backend):

```env
# PayPal API Credentials
PAYPAL_CLIENT_ID=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks
PAYPAL_CLIENT_SECRET=<your-client-secret>
PAYPAL_WEBHOOK_ID=<your-webhook-id>
PAYPAL_MODE=sandbox  # or 'live' for production

# Node Environment
NODE_ENV=development  # or 'production'
```

---

## 2. Backend Setup

### File: `apps/backend-api/routes/paypal-webhook.ts`

**What It Does:**
- Receives PayPal webhook events (subscriptions, payments)
- Verifies webhook signature with PayPal API
- Processes three event types:
  - `BILLING.SUBSCRIPTION.ACTIVATED` → Activate subscription, unfreeze wallet, enable Twilio
  - `BILLING.SUBSCRIPTION.CANCELLED` / `PAYMENT.SALE.DENIED` → Suspend subscription, freeze wallet, pause campaigns
  - `PAYMENT.SALE.COMPLETED` → Credit wallet (idempotent)

**Key Features:**
- **Signature Verification**: Validates every webhook with PayPal before processing
- **Idempotency**: Wallet top-ups checked against `referenceId` to prevent duplicate credits
- **Error Handling**: Graceful error handling with detailed logging
- **Twilio Integration**: Automatically enables/suspends Twilio subaccounts
- **Campaign Management**: Auto-pauses campaigns when subscription suspended

**Setup in Express/Fastify:**

Your Express server must provide `rawBody` for signature verification:

```typescript
// In your app.ts or server.js
import bodyParser from 'body-parser';

// Middleware to capture raw body for webhook verification
app.use(
  '/webhooks/paypal',
  bodyParser.raw({ type: 'application/json' }),
  (req, res, next) => {
    (req as any).rawBody = req.body; // Store raw body
    next();
  }
);

// Then mount the webhook router
import paypalWebhookRouter from './routes/paypal-webhook';
app.use('/', paypalWebhookRouter);
```

**Webhook Event Types Handled:**

| Event | Action |
|-------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Enable subscription, unfreeze wallet, enable Twilio |
| `BILLING.SUBSCRIPTION.CANCELLED` | Suspend subscription, freeze wallet, pause campaigns |
| `PAYMENT.SALE.DENIED` | Suspend subscription, freeze wallet, pause campaigns |
| `PAYMENT.SALE.COMPLETED` | Credit wallet with top-up amount |

---

## 3. Frontend API Endpoint

### File: `apps/frontend/pages/api/billing/wallet-summary.ts`

**What It Does:**
- GET endpoint that returns wallet data for authenticated user
- Called by WalletSummaryCard component
- Returns balance (cents and USD), frozen status, subscription status, renewal date

**Response Format:**

```json
{
  "balanceCents": 5000,
  "balanceUSD": "50.00",
  "isFrozen": false,
  "subscriptionStatus": "ACTIVE",
  "nextRenewal": "2025-01-20T00:00:00.000Z",
  "provider": "PAYPAL"
}
```

**Usage:**

```typescript
const res = await fetch('/api/billing/wallet-summary');
const data = await res.json();
console.log(`Balance: $${data.balanceUSD}`);
```

---

## 4. Frontend Component

### File: `apps/frontend/components/WalletSummaryCard.tsx`

**What It Does:**
- Displays wallet balance, subscription status, and sending eligibility
- Shows real-time balance and blocking reasons
- Provides "Add Credits" button linking to billing settings
- Auto-refreshes on visibility change (tab focus)
- Listens for top-up success events

**Props:**
- None (fetches own data)

**Usage:**

```typescript
import WalletSummaryCard from '@/components/WalletSummaryCard';

export default function Dashboard() {
  return (
    <div>
      <WalletSummaryCard />
    </div>
  );
}
```

**Features:**
- ✅ Balance display with USD conversion
- ✅ Low-balance warning (< $10)
- ✅ Subscription status badge (Active/Suspended/Past Due)
- ✅ Frozen wallet indicator
- ✅ Sending eligibility checklist
- ✅ Blocking reasons explanation
- ✅ Next renewal date
- ✅ Real-time updates on visibility change
- ✅ Loading and error states

**Sending Eligibility Rules:**

User can send if ALL of these are true:
```
subscriptionStatus === "ACTIVE" &&
!isFrozen &&
balanceCents > 5 (minimum $0.05)
```

---

## 5. PayPal Dashboard Configuration

### Register Webhook

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. Apps & Credentials → Sandbox or Live
3. Search for Webhooks
4. Register Webhook URL:
   ```
   https://your-domain.com/webhooks/paypal
   ```
5. Subscribe to events:
   - ✅ BILLING.SUBSCRIPTION.ACTIVATED
   - ✅ BILLING.SUBSCRIPTION.CANCELLED
   - ✅ PAYMENT.SALE.COMPLETED
   - ✅ PAYMENT.SALE.DENIED

6. Copy Webhook ID to `PAYPAL_WEBHOOK_ID` env var

### Custom ID in Hosted Button

The hosted button must pass `custom_id` (organization ID) for wallet top-ups:

```html
<div id="paypal-container-T2G2M28MTFRHY"></div>
<script>
  window.paypal.HostedButtons({
    hostedButtonId: "T2G2M28MTFRHY",
    onApprove: function(orderData) {
      console.log('Payment approved');
    },
    onError: function(err) {
      console.error(err);
    }
  }).render("#paypal-container-T2G2M28MTFRHY");
</script>
```

---

## 6. Testing the Webhook

### Sandbox Testing

1. **Test subscription activation:**
   ```bash
   curl -X POST https://your-domain.com/webhooks/paypal \
     -H "Content-Type: application/json" \
     -H "paypal-auth-algo: SHA256withRSA" \
     -H "paypal-transmission-id: test-123" \
     -H "paypal-transmission-sig: test-sig" \
     -H "paypal-transmission-time: 2025-01-15T10:00:00Z" \
     -H "paypal-cert-url: https://api.sandbox.paypal.com/cert" \
     -d '{
       "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
       "resource": {
         "id": "sub-12345",
         "status": "ACTIVE"
       }
     }'
   ```

2. **Check webhook logs in PayPal Dashboard**
3. **Verify in database:**
   ```sql
   SELECT * FROM "OrganizationSubscription" WHERE "providerSubId" = 'sub-12345';
   SELECT * FROM "OrganizationWallet" WHERE "organizationId" = 'org-123';
   ```

### Local Testing with ngrok

1. Expose local server:
   ```bash
   ngrok http 3000
   ```

2. Register webhook with ngrok URL in PayPal Dashboard

3. Trigger test events from PayPal Dashboard → Webhooks → Test Send

---

## 7. Database Queries

### Check Wallet Status

```sql
SELECT 
  w."organizationId",
  w."balanceCents",
  w."isFrozen",
  s."status" as subscription_status,
  s."currentPeriodEnd"
FROM "OrganizationWallet" w
LEFT JOIN "OrganizationSubscription" s 
  ON w."organizationId" = s."organizationId"
WHERE w."organizationId" = 'org-123';
```

### Check Transaction History

```sql
SELECT * FROM "WalletTransaction" 
WHERE "organizationId" = 'org-123'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check for Duplicate Payments

```sql
SELECT "referenceId", COUNT(*) as count
FROM "WalletTransaction"
WHERE "type" = 'PAYMENT_TOPUP'
GROUP BY "referenceId"
HAVING COUNT(*) > 1;
```

---

## 8. Monitoring & Alerts

### Key Metrics to Monitor

1. **Webhook Processing Time**
   - Should be < 100ms for signature verification
   - Log timestamps for analysis

2. **Failed Signature Verifications**
   - Check logs for `Signature verification failed`
   - Could indicate misconfigured webhook ID

3. **Missing Organization IDs**
   - Logs will show: `No organization ID in payment`
   - Verify custom_id is being passed in hosted button

4. **Duplicate Payment Detection**
   - Query: Check if `referenceId` exists before creating transaction
   - Already handled in `handleWalletTopup()` function

### Logging Integration

Add to your monitoring service (e.g., Sentry, LogRocket):

```typescript
// In webhook handler
console.log(`[PayPal Webhook] Event processed: ${type} at ${new Date().toISOString()}`);
if (error) {
  // Send to Sentry, LogRocket, etc.
  captureException(error, { tags: { source: 'paypal-webhook' } });
}
```

---

## 9. Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid webhook signature` | Webhook ID mismatch | Verify `PAYPAL_WEBHOOK_ID` in env |
| `No organization ID in payment` | custom_id not passed | Update hosted button configuration |
| `Wallet not found` | Organization not onboarded | Create wallet in onboarding flow |
| `Subscription not found` | Webhook received before subscription created | Webhook will be retried by PayPal |

### Retry Logic

PayPal automatically retries webhooks that don't return 200 within 30 seconds:
- Retry 1: After 5 minutes
- Retry 2: After 30 minutes
- Retry 3: After 2 hours
- ... continues up to 8 days

---

## 10. Integration Checklist

- [ ] PayPal credentials added to `.env`
- [ ] Webhook handler route registered in Express
- [ ] Raw body middleware configured for webhook endpoint
- [ ] Wallet summary API endpoint created
- [ ] WalletSummaryCard component added to dashboard
- [ ] Webhook registered in PayPal Dashboard
- [ ] Webhook ID added to env vars
- [ ] Database migrations run (schemas already defined)
- [ ] Twilio integration helpers exist (`enableTwilioSubaccount`, etc.)
- [ ] Test webhook events processed successfully
- [ ] Wallet balance updated correctly on top-up
- [ ] Subscription status changes reflected in UI
- [ ] Error logging configured
- [ ] Production webhook URL configured

---

## 11. Production Deployment

### Before Going Live

1. **Switch to Live Credentials**
   ```env
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=<live-client-id>
   PAYPAL_CLIENT_SECRET=<live-client-secret>
   NODE_ENV=production
   ```

2. **Register Live Webhook**
   - Create new webhook in Live environment
   - Update `PAYPAL_WEBHOOK_ID`

3. **Test End-to-End**
   - Make test payment with $1 USD
   - Verify wallet credited within 5 seconds
   - Verify transaction record created
   - Check logs for errors

4. **Monitor First Week**
   - Watch for failed webhooks
   - Monitor wallet balance accuracy
   - Check for duplicate transactions

---

## 12. Support & Documentation

- **PayPal Webhook Documentation**: https://developer.paypal.com/docs/platforms/webhooks/
- **Webhook Events Reference**: https://developer.paypal.com/docs/platforms/webhooks/webhook-event-types/
- **Signature Verification**: https://developer.paypal.com/docs/platforms/webhooks/webhook-signature-verification/

For issues:
1. Check webhook delivery logs in PayPal Dashboard
2. Review server logs for signature errors
3. Verify database state with provided SQL queries
4. Contact PayPal support with webhook ID and timestamp
