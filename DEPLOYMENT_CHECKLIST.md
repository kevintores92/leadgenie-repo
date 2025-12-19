# Billing System Deployment Checklist

## Pre-Deployment Phase ✓ COMPLETE

- ✅ All billing service code written and tested
- ✅ Database schema updated across all 3 Prisma instances
- ✅ API endpoints created (status, create-subscription, create-topup)
- ✅ Webhook handlers implemented with signature verification
- ✅ UI components built (BillingDashboard, BillingGuard, billing page)
- ✅ Worker-level billing checks implemented
- ✅ Documentation completed (BILLING_SYSTEM.md)

## Phase 1: Database Migration (Required)

**Time Estimate: 5-10 minutes**

```bash
# In /apps/frontend
cd my-saas-platform/apps/frontend
npx prisma migrate deploy

# In /apps/backend-api (if separate DB)
cd ../backend-api
npx prisma migrate deploy

# In /apps/worker-services (if separate DB)
cd ../worker-services
npx prisma migrate deploy
```

**Verification:**
```bash
# Check migration was applied
npx prisma migrate status
```

**What this does:**
- Creates `organization_wallet` table
- Creates `wallet_transaction` table
- Creates `organization_subscription` table
- Creates `webhook_event` table (for idempotency)
- Adds `pricing_markup_percent` column to `organization` table
- Creates indexes for foreign keys and lookups

## Phase 2: Environment Configuration (Required)

**Time Estimate: 15-20 minutes**

### 2.1 PayPal Setup

Go to [PayPal Developer Dashboard](https://developer.paypal.com/)

1. Create app credentials (if not already done)
   - Business account email
   - Get Client ID and Secret

2. Create Product
   - Name: `SMSPLATFORM`
   - Type: `SERVICE`
   - Category: `SOFTWARE`

3. Create Billing Plan (STARTER)
   - Name: `STARTER Plan`
   - Description: `Basic SMS messaging`
   - Frequency: `Monthly`
   - Amount: `$9.99`
   - Get Plan ID: `PLAN_STARTER_MONTHLY`

4. Create Billing Plan (PRO)
   - Name: `PRO Plan`
   - Description: `Professional SMS messaging`
   - Frequency: `Monthly`
   - Amount: `$29.99`
   - Get Plan ID: `PLAN_PRO_MONTHLY`

5. Set Webhook URL
   - Go to Account Settings → Webhooks
   - URL: `https://your-domain.com/api/webhooks/paypal`
   - Subscribe to:
     - BILLING.SUBSCRIPTION.ACTIVATED
     - BILLING.SUBSCRIPTION.SUSPENDED
     - BILLING.SUBSCRIPTION.CANCELLED
     - PAYMENT.SALE.COMPLETED
     - PAYMENT.SALE.DENIED
   - Get Webhook ID: `WEBHOOK_ID`

### 2.2 Set Environment Variables

In your deployment environment (Railway, Render, Vercel, etc):

```env
# PayPal
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_MODE=sandbox  # Change to 'live' for production
PAYPAL_WEBHOOK_ID=your_webhook_id_here
PAYPAL_PLAN_STARTER=PLAN_STARTER_MONTHLY
PAYPAL_PLAN_PRO=PLAN_PRO_MONTHLY

# Twilio Master Account (for subaccount management)
TWILIO_MASTER_ACCOUNT_SID=AC...
TWILIO_MASTER_AUTH_TOKEN=your_master_token_here

# App
APP_URL=https://your-domain.com  # For PayPal redirects
```

**Verification:**
```bash
# Test PayPal connection
curl -u "CLIENT_ID:CLIENT_SECRET" \
  https://api.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -d "grant_type=client_credentials"
```

## Phase 3: Webhook Registration (Required)

### 3.1 PayPal Webhook

1. Already registered in Phase 2.2
2. PayPal will send test events
3. Check logs for webhook receipt: `POST /api/webhooks/paypal`

### 3.2 Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com/)
2. Services → Messaging → Phone Numbers
3. Select your number
4. Webhook URL: `https://your-domain.com/api/webhooks/twilio`
5. HTTP POST for message status callbacks

**Verification in logs:**
```
Webhook received: BILLING.SUBSCRIPTION.ACTIVATED
Webhook received: PAYMENT.SALE.COMPLETED
Webhook received: message delivery update
```

## Phase 4: Worker Integration (Required)

**Time Estimate: 10-15 minutes**

File: `my-saas-platform/apps/worker-services/src/campaignSender.js` (or similar)

**Before:** (current code)
```javascript
await twilioClient.messages.create({
  from: organization.twilioPhoneNumber,
  to: contact.phoneNumber,
  body: messageText
});
```

**After:** (with billing checks)
```javascript
const { checkBillingBeforeSend } = require('./lib/billingCheck.js');

// Check billing before attempting send
const { canSend, reason, estimatedCostCents } = await checkBillingBeforeSend(
  organization.id,
  0.0079  // Twilio cost per SMS in USD
);

if (!canSend) {
  console.log(`❌ Send blocked for org ${organization.id}: ${reason}`);
  // Queue for retry after organization resolves billing
  await queueMessage.redelayMs(300000); // Retry in 5 minutes
  return;
}

// Send message
try {
  const message = await twilioClient.messages.create({
    from: organization.twilioPhoneNumber,
    to: contact.phoneNumber,
    body: messageText
  });
  console.log(`✅ Message sent: ${message.sid}`);
} catch (error) {
  console.error(`❌ Twilio error: ${error.message}`);
  throw error;
}
```

**Testing:**
```bash
# Create test organization with low balance
curl -X POST http://localhost:3000/api/billing/create-topup \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "test-org", "amount": 2}'

# Try to send message (should fail if balance too low)
# Check logs for "Send blocked"
```

## Phase 5: Testing (Required)

### 5.1 Wallet Operations

- [ ] GET `/api/billing/status` returns wallet balance, subscription status
- [ ] POST `/api/billing/create-topup` with $50 redirects to PayPal
- [ ] Complete PayPal checkout → wallet credited
- [ ] Wallet balance shown in BillingDashboard component

### 5.2 Subscription Operations

- [ ] POST `/api/billing/create-subscription` redirects to PayPal
- [ ] Approve subscription on PayPal
- [ ] Webhook fires → subscription marked ACTIVE
- [ ] Organization can now send messages
- [ ] Twilio subaccount status = `active`

### 5.3 Non-Payment Scenario

- [ ] Mark subscription as PAST_DUE (manual DB update for testing)
- [ ] Webhook fires → subscription marked PAST_DUE
- [ ] Wallet becomes frozen
- [ ] Message send is blocked → "Subscription expired" error
- [ ] Twilio subaccount status = `suspended`

### 5.4 Message Billing

- [ ] Send SMS message successfully
- [ ] Wallet balance decreases (message_debit transaction)
- [ ] Amount = Twilio cost × (1 + markup%)
- [ ] Transaction logged with messageId reference

### 5.5 Webhook Idempotency

- [ ] Send duplicate PayPal webhook event
- [ ] Wallet not double-charged (due to WebhookEvent tracking)
- [ ] Log shows "Duplicate webhook, skipping"

## Phase 6: Monitoring & Alerts (Recommended)

### 6.1 Log Monitoring

Watch for critical errors:
```bash
# Failed message sends due to billing
grep -i "send blocked" logs/

# PayPal webhook failures
grep -i "paypal webhook error" logs/

# Wallet debit failures
grep -i "insufficient balance" logs/
```

### 6.2 Database Monitoring

Key metrics to track:
```sql
-- Organizations without active subscriptions
SELECT COUNT(*) FROM organization 
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM organization_subscription 
  WHERE status = 'ACTIVE'
);

-- Organizations with low wallet balance
SELECT o.name, w.balance_cents / 100.0 as balance_usd
FROM organization_wallet w
JOIN organization o ON w.organization_id = o.id
WHERE w.balance_cents < 500  -- Less than $5
ORDER BY w.balance_cents;

-- Recent failed transactions
SELECT * FROM wallet_transaction 
WHERE type = 'MESSAGE_DEBIT' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### 6.3 Alert Thresholds

- Wallet balance < $5 → Email user
- Subscription payment failed → Email user immediately
- Message send blocked → Log at WARNING level (not ERROR)
- Webhook processing > 5s → Log at WARNING level

## Rollback Plan (If Needed)

### 1. Database Rollback

```bash
# If migration causes issues, rollback:
npx prisma migrate resolve --rolled-back add_billing_system
npx prisma migrate deploy
```

### 2. Code Rollback

If billing code causes issues:
```bash
git revert <commit-sha>
git push
```

### 3. Disable Billing (Temporary)

In campaignSender.js:
```javascript
// Temporarily comment out billing checks
// const { checkBillingBeforeSend } = require('./lib/billingCheck.js');

// Temporarily bypass check
// if (!canSend) { ... }
```

## Success Criteria

After deployment, verify:

✅ Organizations can view wallet balance (`GET /api/billing/status`)
✅ Organizations can start PayPal subscription (create-subscription)
✅ Organizations can add wallet funds (create-topup)
✅ Wallets are debited for successful message sends
✅ Failed subscription prevents message sending
✅ Low wallet balance prevents message sending
✅ Twilio subaccount suspension syncs with subscription status
✅ All webhook events are processed without duplicates
✅ BillingDashboard shows accurate balance and subscription status

## Support

### Debug Commands

```bash
# Check pending migrations
npx prisma migrate status

# View database schema
npx prisma db pull

# Check Prisma client generation
npx prisma generate

# Test database connection
npx prisma db execute --stdin < test-query.sql
```

### Contact Points

- **PayPal Issues**: Check PAYPAL_WEBHOOK_ID matches webhook configuration
- **Twilio Suspension**: Verify TWILIO_MASTER_ACCOUNT_SID and token are correct
- **Worker Billing Checks**: Ensure billingCheck.js is imported correctly in campaignSender.js
- **Webhook Timing**: Allow 30-60 seconds for PayPal webhooks to fire after action
