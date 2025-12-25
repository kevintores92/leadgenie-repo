# PayPal Webhook & Wallet System - Complete Implementation

## 📋 What Was Implemented

This implementation provides a complete, production-ready payment webhook system with three core components:

### 1. **PayPal Webhook Handler** (`apps/backend-api/routes/paypal-webhook.ts`)
Receives and processes PayPal events with full signature verification.

**Handled Events:**
- `BILLING.SUBSCRIPTION.ACTIVATED` → Enable subscription + Twilio + unfreeze wallet
- `BILLING.SUBSCRIPTION.CANCELLED` → Suspend subscription + Twilio + freeze wallet
- `PAYMENT.SALE.DENIED` → Suspend subscription + Twilio + freeze wallet
- `PAYMENT.SALE.COMPLETED` → Credit wallet (idempotent)

**Key Features:**
- ✅ PayPal signature verification for security
- ✅ Idempotency check on payments (prevents duplicate credits)
- ✅ Automatic Twilio subaccount management (suspend/activate)
- ✅ Campaign auto-pause on suspension
- ✅ Comprehensive error logging
- ✅ All errors gracefully handled (returns 200 to prevent PayPal retries)

### 2. **Wallet Summary API** (`apps/frontend/pages/api/billing/wallet-summary.ts`)
RESTful endpoint for frontend to fetch wallet state.

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

**Features:**
- ✅ Session-based authentication
- ✅ Real-time balance + subscription data
- ✅ Handles missing wallet gracefully
- ✅ Clean error handling

### 3. **WalletSummaryCard Component** (`apps/frontend/components/WalletSummaryCard.tsx`)
React component displaying wallet status, balance, and sending eligibility.

**Features:**
- ✅ Real-time balance display with USD conversion
- ✅ Low-balance warning (< $10)
- ✅ Subscription status badge (Active/Suspended/Past Due/Inactive)
- ✅ Frozen wallet indicator
- ✅ Sending eligibility checklist (3-point verification)
- ✅ Blocking reasons explanation
- ✅ Next renewal date
- ✅ Auto-refresh on visibility change
- ✅ Listens for top-up success events
- ✅ Loading and error states

---

## 🔧 Setup Instructions

### Step 1: Environment Variables

Add to `.env` (backend) and `.env.local` (frontend):

```env
# PayPal Credentials (REQUIRED)
PAYPAL_CLIENT_ID=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks
PAYPAL_CLIENT_SECRET=<your-secret>
PAYPAL_WEBHOOK_ID=<your-webhook-id>
PAYPAL_MODE=sandbox  # or 'live'

# Twilio (existing)
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>

# Node
NODE_ENV=development
```

### Step 2: Start Backend Server

The webhook handler is automatically registered:

```bash
cd my-saas-platform/apps/backend-api
npm run dev  # or yarn dev
```

The webhook listens at: `POST /webhooks/paypal`

### Step 3: Register Webhook in PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. Navigate to: **Apps & Credentials** → Select **Sandbox** or **Live**
3. Find **Webhooks** section
4. Click **Register Webhook**
5. Enter URL: `https://your-domain.com/webhooks/paypal`
6. Subscribe to events:
   - ✅ BILLING.SUBSCRIPTION.ACTIVATED
   - ✅ BILLING.SUBSCRIPTION.CANCELLED
   - ✅ PAYMENT.SALE.COMPLETED
   - ✅ PAYMENT.SALE.DENIED
7. Copy **Webhook ID** → Add to `.env` as `PAYPAL_WEBHOOK_ID`
8. Save webhook

### Step 4: Add WalletSummaryCard to Dashboard

```typescript
import WalletSummaryCard from '@/components/WalletSummaryCard';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Main content */}
      <div className="lg:col-span-2">
        {/* Your dashboard content */}
      </div>
      
      {/* Right column - Wallet widget */}
      <div>
        <WalletSummaryCard />
      </div>
    </div>
  );
}
```

### Step 5: Integrate with Campaign Send Flow

When user tries to send campaign, check wallet:

```typescript
import { BillingGuard } from '@/components/BillingGuard';

function SendCampaignFlow() {
  const estimatedCostCents = calculateCost(); // your logic
  
  return (
    <BillingGuard requiredAmount={estimatedCostCents}>
      <SendCampaignForm />
    </BillingGuard>
  );
}
```

---

## 📊 Database Schema

The following models are used (all defined in Prisma schema):

### OrganizationWallet
```
id              - UUID primary key
organizationId  - FK to Organization (unique)
balanceCents    - Integer (in cents)
isFrozen        - Boolean (prevents sends)
createdAt       - DateTime
updatedAt       - DateTime
transactions    - Relation to WalletTransaction[]
```

### WalletTransaction
```
id              - UUID primary key
walletId        - FK to OrganizationWallet
organizationId  - String (indexed for queries)
type            - PAYMENT_TOPUP | MESSAGE_DEBIT | REFUND | ADJUSTMENT
amountCents     - Integer (in cents)
referenceId     - String (for idempotency, e.g., PayPal transaction ID)
createdAt       - DateTime
```

### OrganizationSubscription
```
id              - UUID primary key
organizationId  - String (unique)
provider        - BillingProvider (PAYPAL | STRIPE)
providerSubId   - String (unique, e.g., PayPal subscription ID)
planId          - String
status          - SubscriptionStatus (ACTIVE | PAST_DUE | CANCELED | SUSPENDED)
currentPeriodEnd - DateTime
createdAt       - DateTime
updatedAt       - DateTime
```

---

## 🔄 Webhook Flow Examples

### Example 1: Subscription Activation

**PayPal sends:**
```json
{
  "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
  "resource": {
    "id": "I-ABC123DEF456",
    "status": "ACTIVE"
  }
}
```

**Our system:**
1. Verifies webhook signature
2. Finds subscription by `providerSubId` = "I-ABC123DEF456"
3. Updates subscription status to "ACTIVE"
4. Calls `TwilioSubaccountService.handleSubscriptionStatusChange(orgId, "ACTIVE")`
5. Which automatically:
   - Activates all Twilio subaccounts
   - Unfreezes wallet
6. Logs success

### Example 2: Payment Received (Top-up)

**PayPal sends:**
```json
{
  "event_type": "PAYMENT.SALE.COMPLETED",
  "resource": {
    "id": "TXN-123456",
    "amount": {
      "total": "50.00",
      "currency": "USD"
    },
    "custom_id": "org-xyz789"
  }
}
```

**Our system:**
1. Verifies webhook signature
2. Checks if `referenceId` = "TXN-123456" already exists (idempotency)
3. If new payment:
   - Converts $50.00 → 5000 cents
   - Calls `BillingService.creditWallet(orgId, 5000, "TXN-123456")`
   - Which:
     - Increments wallet balance
     - Creates WalletTransaction record
4. Returns 200 OK to PayPal

### Example 3: Subscription Suspension

**PayPal sends:**
```json
{
  "event_type": "BILLING.SUBSCRIPTION.CANCELLED",
  "resource": {
    "id": "I-ABC123DEF456"
  }
}
```

**Our system:**
1. Verifies webhook signature
2. Finds and updates subscription status to "SUSPENDED"
3. Calls `TwilioSubaccountService.handleSubscriptionStatusChange(orgId, "SUSPENDED")`
4. Which:
   - Suspends all Twilio subaccounts (blocks messaging)
   - Freezes wallet (prevents sends)
5. Calls `pauseAllCampaigns(orgId)` to pause active campaigns
6. Logs all actions

---

## 🧪 Testing

### Test Webhook Signature Verification

```bash
curl -X POST http://localhost:5000/webhooks/paypal \
  -H "Content-Type: application/json" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -H "paypal-transmission-id: test-123" \
  -H "paypal-transmission-sig: test-sig" \
  -H "paypal-transmission-time: 2025-01-15T10:00:00Z" \
  -H "paypal-cert-url: https://api.sandbox.paypal.com/cert" \
  -d '{"event_type": "PAYMENT.SALE.COMPLETED", "resource": {"id": "test", "amount": {"total": "50.00"}, "custom_id": "org-test"}}'
```

### Monitor Webhook Deliveries

1. In PayPal Dashboard → Webhooks → Select your webhook
2. View **Webhook Delivery Status** (success/failed)
3. Click delivery to see request/response details
4. Inspect **Payload** to verify event structure

### Database Verification

```sql
-- Check wallet balance
SELECT balanceCents, isFrozen FROM "OrganizationWallet" WHERE organizationId = 'org-123';

-- Check transaction history
SELECT * FROM "WalletTransaction" WHERE organizationId = 'org-123' ORDER BY createdAt DESC;

-- Check for duplicate payments
SELECT referenceId, COUNT(*) as count FROM "WalletTransaction" 
WHERE type = 'PAYMENT_TOPUP' GROUP BY referenceId HAVING COUNT(*) > 1;

-- Check subscription status
SELECT status, currentPeriodEnd FROM "OrganizationSubscription" WHERE organizationId = 'org-123';
```

---

## 🚨 Error Handling

### Signature Verification Fails
- **Cause**: Webhook ID mismatch, invalid timestamp
- **Solution**: 
  1. Verify `PAYPAL_WEBHOOK_ID` matches PayPal Dashboard
  2. Check server clock is in sync
  3. Check PayPal can reach your webhook URL

### Organization Not Found
- **Cause**: Webhook received before org was created
- **Solution**: PayPal retries for 8 days, will succeed after org created

### Custom ID Missing
- **Cause**: Hosted button not configured with `custom_id`
- **Solution**: Update PayPal button to pass organization ID in `custom_id` field

### Duplicate Payment Detected
- **Cause**: PayPal resent webhook (webhook retry logic)
- **Solution**: ✅ Already handled! Idempotency check prevents duplicate credits

---

## 📈 Monitoring & Alerts

### Key Metrics
1. **Webhook Processing Time**: Should be < 100ms
2. **Signature Verification Success Rate**: Should be 100%
3. **Payment Duplication Rate**: Should be 0% (idempotency working)
4. **Subscription Status Sync**: Wallet frozen/unfrozen matches subscription status

### Recommended Alerts
```
- Webhook signature verification failure
- Organization not found in webhook
- Wallet balance went negative (should never happen)
- Payment processing time > 1 second
```

### Log Locations
- Backend logs: `stdout` or your logging service (Sentry, LogRocket, etc.)
- PayPal Dashboard: **Webhooks** → **Webhook Delivery Status**
- Database: Query `WalletTransaction` and `OrganizationSubscription` tables

---

## 🔐 Security Checklist

- ✅ Webhook signature verification enabled
- ✅ Idempotency check on payments (prevents double-charging)
- ✅ Organization ID validation
- ✅ Amount validation
- ✅ Database transactions for consistency
- ✅ Error handling doesn't expose sensitive info
- ✅ Webhook endpoint returns 200 even on errors (to prevent PayPal retries)
- ✅ No frontend trust for payment amounts
- ✅ Session authentication on wallet summary API
- ✅ All wallet operations through BillingService

---

## 🚀 Production Deployment

### Before Going Live

1. **Get Live Credentials**
   - Create live app in PayPal Developer Dashboard
   - Copy live Client ID and Secret

2. **Update Environment**
   ```env
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=<live-client-id>
   PAYPAL_CLIENT_SECRET=<live-client-secret>
   NODE_ENV=production
   ```

3. **Register Live Webhook**
   - Create new webhook in PayPal Live environment
   - URL: `https://your-production-domain.com/webhooks/paypal`
   - Subscribe to same events
   - Copy Webhook ID to `PAYPAL_WEBHOOK_ID`

4. **Run End-to-End Tests**
   - Test subscription creation (small amount like $1)
   - Verify wallet receives credit within 5 seconds
   - Check database has transaction record
   - Monitor logs for any errors

5. **First Week Monitoring**
   - Watch webhook delivery logs
   - Monitor wallet balance accuracy
   - Alert on any failed webhooks
   - Check for duplicate transactions

---

## 📚 Files Modified/Created

### New Files
- ✅ `apps/backend-api/routes/paypal-webhook.ts` - Webhook handler (260+ lines)
- ✅ `apps/frontend/pages/api/billing/wallet-summary.ts` - API endpoint (50+ lines)
- ✅ `apps/frontend/components/WalletSummaryCard.tsx` - React component (320+ lines)
- ✅ `PAYPAL_WEBHOOK_SETUP.md` - Setup guide (500+ lines)

### Modified Files
- ✅ `apps/backend-api/src/app.js` - Added raw body middleware + webhook router

### Already Existing (Used By Webhook)
- `apps/backend-api/src/services/BillingService.ts` - Wallet operations
- `apps/backend-api/src/services/TwilioSubaccountService.ts` - Account suspension
- Prisma schema - OrganizationWallet, WalletTransaction, OrganizationSubscription

---

## 🎯 Next Steps

1. **Configure Environment Variables**
   - Add PayPal credentials to `.env` files
   - Add/verify Twilio credentials

2. **Register Webhook in PayPal Dashboard**
   - Copy webhook URL and webhook ID

3. **Test in Sandbox**
   - Create test subscription
   - Process test payment
   - Verify database updates
   - Check wallet balance in UI

4. **Integrate with Campaign Send**
   - Wrap campaign send with BillingGuard
   - Pass estimated cost
   - Modal shows if balance insufficient

5. **Deploy to Production**
   - Register live webhook
   - Run final tests
   - Monitor logs closely first week

---

## 📞 Support

**PayPal Webhook Issues?**
- Check PayPal Dashboard → Webhooks → Delivery Status
- Verify webhook signature verification logs
- Inspect request/response in webhook details

**Balance Not Updating?**
- Check logs for "Wallet topped up" message
- Verify organization ID is being passed in `custom_id`
- Query database to see if transaction was created

**Subscription Not Activating?**
- Check `PAYPAL_WEBHOOK_ID` matches dashboard
- Verify subscription exists in database
- Check Twilio subaccount status

For more details, see [PAYPAL_WEBHOOK_SETUP.md](./PAYPAL_WEBHOOK_SETUP.md)
