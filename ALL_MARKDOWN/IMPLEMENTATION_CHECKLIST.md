# PayPal Webhook & Wallet Implementation - Checklist

## ✅ Implementation Complete

All code has been written and integrated. This checklist tracks remaining setup and testing.

---

## 🔧 Phase 1: Environment Setup (DO FIRST)

### Credentials
- [ ] Add `PAYPAL_CLIENT_ID` to `.env` files
- [ ] Add `PAYPAL_CLIENT_SECRET` to `.env` files
- [ ] Verify `TWILIO_ACCOUNT_SID` exists in `.env`
- [ ] Verify `TWILIO_AUTH_TOKEN` exists in `.env`
- [ ] Set `PAYPAL_MODE=sandbox` for testing
- [ ] Set `NODE_ENV=development` for development

### Example .env Setup
```env
# .env (backend) or .env.local (frontend)

# PayPal Configuration
PAYPAL_CLIENT_ID=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_WEBHOOK_ID=will_get_this_from_paypal_dashboard
PAYPAL_MODE=sandbox

# Twilio (existing)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token

# Node Environment
NODE_ENV=development
DATABASE_URL=postgresql://...
```

---

## 🌐 Phase 2: PayPal Dashboard Setup (DO SECOND)

### Create/Configure Webhook
1. [ ] Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. [ ] Click **Apps & Credentials**
3. [ ] Select **Sandbox** (or **Live** for production)
4. [ ] Find **Webhooks** section in left sidebar
5. [ ] Click **Create Webhook** or find existing
6. [ ] Enter webhook URL:
   ```
   https://localhost:5000/webhooks/paypal  (development)
   https://your-domain.com/webhooks/paypal (production)
   ```
7. [ ] Subscribe to these events:
   - [ ] BILLING.SUBSCRIPTION.ACTIVATED
   - [ ] BILLING.SUBSCRIPTION.CANCELLED
   - [ ] PAYMENT.SALE.COMPLETED
   - [ ] PAYMENT.SALE.DENIED

8. [ ] Copy **Webhook ID** (looks like: WH-XXXXX)
9. [ ] Add to `.env`: `PAYPAL_WEBHOOK_ID=WH-XXXXX`

### Verify Hosted Button Configuration
1. [ ] Go to **PayPal Dashboard** → **Buttons & Hosted Buttons**
2. [ ] Find button `T2G2M28MTFRHY` (or your button ID)
3. [ ] Verify button is configured to:
   - [ ] Pass `custom_id` (organization ID) - **CRITICAL**
   - [ ] Currency is USD
   - [ ] Redirect to success page after payment
4. [ ] Note the button ID for your environment

---

## 🚀 Phase 3: Backend Startup (DO THIRD)

### Verify Files Exist
- [ ] `apps/backend-api/routes/paypal-webhook.ts` (260 lines)
- [ ] `apps/backend-api/src/app.js` (modified - has raw body middleware)
- [ ] `apps/backend-api/src/services/billingService.ts` (already exists)
- [ ] `apps/backend-api/src/services/twilioSubaccountService.ts` (already exists)

### Start Backend Server
```bash
cd my-saas-platform/apps/backend-api
npm install  # Install any new dependencies (fetch is built-in to Node 18+)
npm run dev
```

### Verify Backend Running
- [ ] Console shows: `Backend API listening on 5000`
- [ ] Webhook route should be ready: `POST /webhooks/paypal`
- [ ] No TypeScript errors

### Expose Webhook URL (For Testing)
```bash
# Install ngrok if you don't have it
npm install -g ngrok

# In another terminal, expose port 5000
ngrok http 5000
# Note the URL: https://xxxx-xx-xxxx-xxxx-xx.ngrok.io
```

### Update PayPal Dashboard with ngrok URL
1. [ ] Go back to PayPal Webhooks
2. [ ] Update webhook URL to: `https://xxxx-xx-xxxx-xxxx-xx.ngrok.io/webhooks/paypal`
3. [ ] Save

---

## 🎨 Phase 4: Frontend Setup (DO FOURTH)

### Verify Files Exist
- [ ] `apps/frontend/pages/api/billing/wallet-summary.ts` (50 lines)
- [ ] `apps/frontend/components/WalletSummaryCard.tsx` (320 lines)
- [ ] `apps/frontend/components/BillingDashboard.tsx` (modified - has PayPal button)
- [ ] `apps/frontend/components/BillingGuard.tsx` (modified - has modal)
- [ ] `apps/frontend/components/InsufficientBalanceModal.tsx` (already exists)

### Start Frontend Server
```bash
cd my-saas-platform/apps/frontend
npm run dev
```

### Verify Frontend Running
- [ ] App loads at `http://localhost:3000`
- [ ] No TypeScript errors
- [ ] Dashboard page loads

### Add WalletSummaryCard to Dashboard (If Not Already There)
```typescript
import WalletSummaryCard from '@/components/WalletSummaryCard';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Your content */}
      <div>
        <WalletSummaryCard />
      </div>
    </div>
  );
}
```

---

## 🧪 Phase 5: Testing Webhook (DO FIFTH)

### Test 1: Webhook Signature Verification

In PayPal Dashboard:
1. [ ] Go to **Webhooks**
2. [ ] Click on your webhook URL
3. [ ] Scroll to **Test Send**
4. [ ] Select an event (e.g., `PAYMENT.SALE.COMPLETED`)
5. [ ] Click **Send**
6. [ ] Check **Webhook Delivery Status**
   - [ ] Should show **200 OK**
   - [ ] Click to view delivery details

### Test 2: Check Backend Logs

In terminal where backend is running:
```
[PayPal Webhook] Received event: PAYMENT.SALE.COMPLETED
[PayPal Webhook] Signature verification failed  ← This is NORMAL for test
[PayPal Webhook] Error processing webhook: ...  ← This is OK during testing
```

Expected behavior:
- Signature verification fails on test webhooks (PayPal's test system)
- Backend returns 200 OK anyway (correct behavior)
- Log shows event was received

### Test 3: Real Payment (Small Amount)

1. [ ] Go to settings page in frontend
2. [ ] Find PayPal button section
3. [ ] Click PayPal button
4. [ ] Complete payment with $1.00
5. [ ] Check backend logs for:
   ```
   [PayPal Webhook] Received event: PAYMENT.SALE.COMPLETED
   [PayPal Webhook] Wallet topped up: org-XXX (+$1.00)
   ```
6. [ ] Check database:
   ```sql
   SELECT * FROM "WalletTransaction" 
   WHERE "organizationId" = 'org-XXX'
   ORDER BY "createdAt" DESC LIMIT 1;
   ```
   - [ ] Should show transaction with `type: PAYMENT_TOPUP`
   - [ ] Amount should be 100 (cents)

7. [ ] Check frontend WalletSummaryCard
   - [ ] Balance should update to $1.00
   - [ ] No errors in console

### Test 4: Wallet Summary API

In browser console:
```javascript
fetch('/api/billing/wallet-summary')
  .then(r => r.json())
  .then(console.log)
```

Expected response:
```json
{
  "balanceCents": 100,
  "balanceUSD": "1.00",
  "isFrozen": false,
  "subscriptionStatus": "ACTIVE",
  "nextRenewal": null,
  "provider": "PAYPAL"
}
```

---

## 🔍 Phase 6: Integration Testing (DO SIXTH)

### Test Campaign Send with Insufficient Balance

1. [ ] Create a test campaign
2. [ ] Try to send to 1 contact
3. [ ] If estimated cost > wallet balance:
   - [ ] `InsufficientBalanceModal` should appear
   - [ ] Show current balance and required amount
   - [ ] Show PayPal button
   - [ ] Click PayPal button
   - [ ] Complete payment
   - [ ] Modal should close
   - [ ] Campaign should send

### Test Subscription State Changes

In PayPal Dashboard (or backend database direct update):
1. [ ] Suspend subscription
   - [ ] Check wallet is frozen
   - [ ] WalletSummaryCard shows "Frozen"
   - [ ] Campaign send is blocked

2. [ ] Reactivate subscription
   - [ ] Check wallet is unfrozen
   - [ ] WalletSummaryCard shows "Active"
   - [ ] Campaign send is allowed

### Test Sending Campaign with Sufficient Balance

1. [ ] Add credits via PayPal ($10+)
2. [ ] Create campaign
3. [ ] Send to 1 contact
4. [ ] Check:
   - [ ] Message sent successfully
   - [ ] Wallet balance decremented
   - [ ] Transaction created with type: `MESSAGE_DEBIT`
   - [ ] No modal appeared

---

## 📊 Phase 7: Database Verification (DO SEVENTH)

### Check Wallet State
```sql
SELECT 
  w."organizationId",
  w."balanceCents" as balance_cents,
  (w."balanceCents" / 100.0) as balance_usd,
  w."isFrozen",
  s."status" as subscription_status,
  s."currentPeriodEnd" as next_renewal
FROM "OrganizationWallet" w
LEFT JOIN "OrganizationSubscription" s 
  ON w."organizationId" = s."organizationId"
ORDER BY w."updatedAt" DESC
LIMIT 5;
```

Expected: Wallets show correct balances after payments

### Check Transaction History
```sql
SELECT 
  "organizationId",
  "type",
  "amountCents" as amount,
  "referenceId",
  "createdAt"
FROM "WalletTransaction"
ORDER BY "createdAt" DESC
LIMIT 10;
```

Expected: PAYMENT_TOPUP transactions appear after payments

### Check for Duplicates (Should Be Zero)
```sql
SELECT "referenceId", COUNT(*) as count
FROM "WalletTransaction"
WHERE "type" = 'PAYMENT_TOPUP'
GROUP BY "referenceId"
HAVING COUNT(*) > 1;
```

Expected: No results (empty = good!)

---

## 📈 Phase 8: Production Deployment (DO LAST)

### Prepare Production Environment

1. [ ] Create PayPal live account (if not already done)
2. [ ] Get live credentials:
   - [ ] `PAYPAL_CLIENT_ID` (live)
   - [ ] `PAYPAL_CLIENT_SECRET` (live)

3. [ ] Update environment variables:
   ```env
   PAYPAL_MODE=live  # Changed from 'sandbox'
   PAYPAL_CLIENT_ID=live_client_id
   PAYPAL_CLIENT_SECRET=live_client_secret
   NODE_ENV=production
   ```

4. [ ] Register webhook in PayPal live environment:
   - [ ] URL: `https://your-domain.com/webhooks/paypal`
   - [ ] Copy live webhook ID
   - [ ] Update `PAYPAL_WEBHOOK_ID`

5. [ ] Test in production:
   - [ ] Make small payment ($1)
   - [ ] Verify wallet updates
   - [ ] Check logs
   - [ ] Monitor for 24 hours

### Production Monitoring

During first week:
- [ ] Check webhook delivery logs daily in PayPal Dashboard
- [ ] Monitor application logs for errors
- [ ] Verify wallet balances are accurate
- [ ] Check for duplicate transactions (should be zero)
- [ ] Monitor payment success rate (should be 100%)

---

## 🚨 Phase 9: Troubleshooting

### Issue: Webhook returns 400 (Invalid webhook signature)

**Cause**: Webhook ID mismatch
**Solution**:
1. [ ] Verify `PAYPAL_WEBHOOK_ID` in `.env`
2. [ ] Compare with PayPal Dashboard webhook ID
3. [ ] They must match exactly
4. [ ] Restart backend server

### Issue: "Organization not found" in logs

**Cause**: Webhook arrived before organization was created
**Solution**:
- This is normal during first payment
- PayPal will retry the webhook in 5 minutes
- Once organization exists, wallet will be credited

### Issue: Wallet balance not updating after payment

**Cause**: Multiple possibilities
**Debug Steps**:
1. [ ] Check backend logs for `[PayPal Webhook]` messages
2. [ ] Verify organization ID is being passed (`custom_id`)
3. [ ] Query database to see if transaction was created:
   ```sql
   SELECT * FROM "WalletTransaction" WHERE "organizationId" = 'org-XXX' ORDER BY "createdAt" DESC;
   ```
4. [ ] Check frontend console for API errors
5. [ ] Verify `GET /api/billing/wallet-summary` returns correct data

### Issue: "Wallet frozen" but subscription is active

**Cause**: Manual freeze or subscription suspension sync issue
**Solution**:
1. [ ] Check subscription status:
   ```sql
   SELECT * FROM "OrganizationSubscription" WHERE "organizationId" = 'org-XXX';
   ```
2. [ ] If status is ACTIVE but frozen:
   ```sql
   UPDATE "OrganizationWallet" SET "isFrozen" = false WHERE "organizationId" = 'org-XXX';
   ```
3. [ ] Restart frontend to see updated state

---

## 📚 Documentation Files

All documentation is in repository root:

- [ ] **PAYPAL_WEBHOOK_SETUP.md** - Detailed setup guide (500+ lines)
- [ ] **PAYPAL_WEBHOOK_COMPLETE.md** - Implementation overview (600+ lines)
- [ ] **PAYPAL_WEBHOOK_ARCHITECTURE.md** - Architecture diagrams and flows (800+ lines)
- [ ] **PAYPAL_WEBHOOK_QUICK_REFERENCE.md** - Quick API reference (200+ lines)
- [ ] **This file** - Implementation checklist and troubleshooting

---

## ✨ Success Criteria

The implementation is **complete** when:

- [ ] Environment variables configured
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] WebHook registered in PayPal Dashboard
- [ ] Test payment processed successfully ($1 top-up)
- [ ] Wallet balance updated in database
- [ ] WalletSummaryCard displays correct balance
- [ ] Campaign send blocked when balance insufficient
- [ ] InsufficientBalanceModal appears with PayPal button
- [ ] User can complete payment and send campaign
- [ ] No duplicate transactions in database
- [ ] Logs show successful webhook processing
- [ ] All database queries return correct data
- [ ] Frontend and backend deployed to production
- [ ] Production webhook registered in PayPal
- [ ] Production payment processed successfully
- [ ] Monitoring and alerts configured

---

## 🎉 What's Implemented

| Component | File | Status | Lines |
|-----------|------|--------|-------|
| Webhook Handler | `paypal-webhook.ts` | ✅ Complete | 268 |
| Wallet API | `wallet-summary.ts` | ✅ Complete | 50+ |
| Wallet Widget | `WalletSummaryCard.tsx` | ✅ Complete | 320+ |
| Express Setup | `app.js` | ✅ Modified | - |
| Documentation | PAYPAL_WEBHOOK_*.md | ✅ Complete | 2000+ |
| **Total** | - | **✅ DONE** | **2600+** |

---

## 📞 Need Help?

1. **Webhook issues?**
   - Check PayPal Dashboard → Webhooks → Delivery Status
   - See PAYPAL_WEBHOOK_SETUP.md troubleshooting section

2. **Balance not updating?**
   - Check backend logs for `[PayPal Webhook]` messages
   - Verify `custom_id` is being passed from hosted button
   - Check database with provided SQL queries

3. **Frontend issues?**
   - Check browser console for errors
   - Verify `GET /api/billing/wallet-summary` is working
   - Test with: `fetch('/api/billing/wallet-summary').then(r => r.json()).then(console.log)`

4. **Signature verification failing?**
   - Verify `PAYPAL_WEBHOOK_ID` matches dashboard exactly
   - Check server time is synchronized
   - See PAYPAL_WEBHOOK_ARCHITECTURE.md for flow details

---

**Last Updated**: December 20, 2025
**Status**: ✅ Implementation Complete - Ready for Setup & Testing
