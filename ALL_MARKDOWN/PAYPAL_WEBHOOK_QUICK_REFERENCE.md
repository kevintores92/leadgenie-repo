# PayPal Webhook & Wallet API - Quick Reference

## Webhook Handler

**Route:** `POST /webhooks/paypal`

**What It Does:**
- Receives PayPal webhook events
- Verifies signature with PayPal API
- Updates wallet, subscription status, and Twilio accounts
- Handles payments, subscriptions, denials idempotently

**Required Env Vars:**
```
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
```

**Supported Events:**
| Event | Action |
|-------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Activate sub, enable Twilio, unfreeze wallet |
| `BILLING.SUBSCRIPTION.CANCELLED` | Suspend sub, suspend Twilio, freeze wallet, pause campaigns |
| `PAYMENT.SALE.DENIED` | Same as CANCELLED |
| `PAYMENT.SALE.COMPLETED` | Credit wallet (idempotent on `custom_id`) |

**Setup:**
```javascript
// app.js - Raw body middleware (already added)
app.use('/webhooks/paypal', express.raw({ type: 'application/json' }), (req, res, next) => {
  (req).rawBody = req.body;
  req.body = JSON.parse(req.body.toString());
  next();
});
```

---

## Wallet Summary API

**Route:** `GET /api/billing/wallet-summary`

**Authentication:** Requires session (next-auth)

**Response:**
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

**Status Values:** `ACTIVE | SUSPENDED | PAST_DUE | INACTIVE`

**Usage:**
```typescript
const res = await fetch('/api/billing/wallet-summary');
const data = await res.json();
console.log(`Balance: $${data.balanceUSD}`);
```

---

## WalletSummaryCard Component

**Location:** `apps/frontend/components/WalletSummaryCard.tsx`

**Props:** None (fetches own data)

**Features:**
- Balance display with USD conversion
- Low-balance warning (< $10)
- Subscription status badge
- Frozen wallet indicator
- Sending eligibility checklist
- Blocking reasons explanation
- Next renewal date
- Real-time updates on visibility change
- Refresh button for manual updates

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

---

## Sending Eligibility Rules

User can send if ALL conditions are true:

```typescript
canSend = 
  subscriptionStatus === "ACTIVE" &&
  !isFrozen &&
  balanceCents > 5 // $0.05 minimum
```

---

## Database Queries

### Get Wallet Balance
```sql
SELECT "balanceCents", "isFrozen" 
FROM "OrganizationWallet" 
WHERE "organizationId" = 'org-123';
```

### Get Transaction History
```sql
SELECT * FROM "WalletTransaction" 
WHERE "organizationId" = 'org-123'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### Check Subscription Status
```sql
SELECT "status", "currentPeriodEnd" 
FROM "OrganizationSubscription" 
WHERE "organizationId" = 'org-123';
```

### Find Duplicate Payments
```sql
SELECT "referenceId", COUNT(*) 
FROM "WalletTransaction" 
WHERE "type" = 'PAYMENT_TOPUP'
GROUP BY "referenceId"
HAVING COUNT(*) > 1;
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook returns 400 | Signature verification failed | Verify `PAYPAL_WEBHOOK_ID` matches PayPal Dashboard |
| Balance not updating | Organization ID missing from payment | Ensure hosted button passes `custom_id` |
| Wallet frozen forever | Subscription suspended but not resumed | Check subscription status in PayPal & database |
| Duplicate charges | Old webhook retry being processed | Idempotency check should prevent - query DB for duplicates |

---

## PayPal Dashboard URLs

- **Sandbox Webhooks:** https://developer.paypal.com/dashboard/apps/sandbox
- **Live Webhooks:** https://developer.paypal.com/dashboard/apps/live
- **Webhook Events:** https://developer.paypal.com/docs/platforms/webhooks/webhook-event-types/
- **Signature Verification:** https://developer.paypal.com/docs/platforms/webhooks/webhook-signature-verification/

---

## Testing Webhook Delivery

**In PayPal Dashboard:**
1. Go to Apps & Credentials
2. Click on Webhooks (Sandbox or Live)
3. Find your webhook URL
4. Click on it
5. Scroll to **Related Webhooks**
6. Click **Test** to send test event
7. Check **Webhook Delivery Status** for results

**Check Server Logs:**
```
[PayPal Webhook] Received event: BILLING.SUBSCRIPTION.ACTIVATED
[PayPal Webhook] Subscription activated: org-123
```

---

## Production Checklist

- [ ] PayPal live credentials in `.env`
- [ ] Webhook registered in PayPal live environment
- [ ] `PAYPAL_WEBHOOK_ID` from live webhook (not sandbox)
- [ ] `NODE_ENV=production`
- [ ] Test payment processed successfully
- [ ] Wallet balance updated in database
- [ ] Subscription status synced
- [ ] Monitoring/alerts configured
- [ ] Error logging working (Sentry/LogRocket/etc)

---

## Key Constants

```typescript
// Minimum balance to send message
MIN_ESTIMATED_COST = 5; // $0.05 in cents

// Low balance warning threshold
LOW_BALANCE_THRESHOLD = 1000; // $10

// Wallet transaction types
WalletTransactionType {
  PAYMENT_TOPUP = 'PAYMENT_TOPUP',      // PayPal top-up
  MESSAGE_DEBIT = 'MESSAGE_DEBIT',      // Message sent
  REFUND = 'REFUND',                    // Refund issued
  ADJUSTMENT = 'ADJUSTMENT',            // Admin adjustment
}

// Subscription statuses
SubscriptionStatus {
  ACTIVE = 'ACTIVE',                    // Can send
  SUSPENDED = 'SUSPENDED',              // Cannot send
  PAST_DUE = 'PAST_DUE',                // Payment overdue
  CANCELED = 'CANCELED',                // Subscription ended
}
```

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `apps/backend-api/routes/paypal-webhook.ts` | Webhook handler | 260+ |
| `apps/frontend/pages/api/billing/wallet-summary.ts` | Wallet API | 50+ |
| `apps/frontend/components/WalletSummaryCard.tsx` | Wallet widget | 320+ |
| `apps/backend-api/src/app.js` | Express setup (modified) | - |
| `PAYPAL_WEBHOOK_SETUP.md` | Detailed setup guide | 500+ |
| `PAYPAL_WEBHOOK_COMPLETE.md` | Implementation overview | 600+ |

---

## Environment Variables Template

```env
# PayPal
PAYPAL_CLIENT_ID=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks
PAYPAL_CLIENT_SECRET=<your-client-secret>
PAYPAL_WEBHOOK_ID=<your-webhook-id-from-dashboard>
PAYPAL_MODE=sandbox  # or 'live' for production

# Twilio (existing, used by webhook)
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>

# Node Environment
NODE_ENV=development  # production for live
DATABASE_URL=postgresql://...
```

---

## API Response Examples

### Wallet Summary - Active User
```json
{
  "balanceCents": 50000,
  "balanceUSD": "500.00",
  "isFrozen": false,
  "subscriptionStatus": "ACTIVE",
  "nextRenewal": "2025-02-15T00:00:00.000Z",
  "provider": "PAYPAL"
}
```

### Wallet Summary - Suspended User
```json
{
  "balanceCents": 0,
  "balanceUSD": "0.00",
  "isFrozen": true,
  "subscriptionStatus": "SUSPENDED",
  "nextRenewal": null,
  "provider": "PAYPAL"
}
```

### Wallet Summary - Low Balance
```json
{
  "balanceCents": 250,
  "balanceUSD": "2.50",
  "isFrozen": false,
  "subscriptionStatus": "ACTIVE",
  "nextRenewal": "2025-02-15T00:00:00.000Z",
  "provider": "PAYPAL"
}
```

---

**For detailed setup instructions, see [PAYPAL_WEBHOOK_SETUP.md](./PAYPAL_WEBHOOK_SETUP.md)**

**For implementation overview, see [PAYPAL_WEBHOOK_COMPLETE.md](./PAYPAL_WEBHOOK_COMPLETE.md)**
