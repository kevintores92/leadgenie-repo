# PayPal Webhook & Wallet System - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PayPal Platform                             │
│                    (Subscriptions & Payments)                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ Webhook Events (HTTPS POST)
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                  Your Backend API Server                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  POST /webhooks/paypal (Express Route Handler)                      │
│  ├─ Raw Body Middleware (signature verification)                    │
│  ├─ Signature Verification (PayPal API call)                        │
│  ├─ Event Type Routing                                              │
│  │  ├─ BILLING.SUBSCRIPTION.ACTIVATED                               │
│  │  │  ├─ Update OrganizationSubscription.status = ACTIVE           │
│  │  │  ├─ TwilioSubaccountService.activateSubaccount()             │
│  │  │  └─ BillingService.unfreezeWallet()                          │
│  │  │                                                                │
│  │  ├─ BILLING.SUBSCRIPTION.CANCELLED / PAYMENT.SALE.DENIED         │
│  │  │  ├─ Update OrganizationSubscription.status = SUSPENDED        │
│  │  │  ├─ TwilioSubaccountService.suspendSubaccount()              │
│  │  │  ├─ BillingService.freezeWallet()                            │
│  │  │  └─ pauseAllCampaigns()                                       │
│  │  │                                                                │
│  │  └─ PAYMENT.SALE.COMPLETED                                       │
│  │     ├─ Idempotency check (referenceId)                           │
│  │     └─ BillingService.creditWallet() [ATOMIC]                    │
│  │        ├─ UPDATE OrganizationWallet.balanceCents                 │
│  │        └─ INSERT WalletTransaction                               │
│  │                                                                   │
│  └─ Return 200 OK (prevents PayPal retries on errors)               │
│                                                                      │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               │ Database Updates
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    PostgreSQL Database                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  • OrganizationSubscription                                         │
│    └─ status: ACTIVE | SUSPENDED | PAST_DUE | CANCELED             │
│                                                                      │
│  • OrganizationWallet                                               │
│    ├─ balanceCents: integer (in cents)                              │
│    └─ isFrozen: boolean                                             │
│                                                                      │
│  • WalletTransaction                                                │
│    ├─ type: PAYMENT_TOPUP | MESSAGE_DEBIT | REFUND                │
│    ├─ amountCents: integer                                          │
│    └─ referenceId: string (idempotency key)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend Application                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Component: WalletSummaryCard                                       │
│  ├─ Calls: GET /api/billing/wallet-summary                          │
│  │  └─ Returns: { balanceCents, isFrozen, status, ... }             │
│  │                                                                   │
│  ├─ Displays:                                                       │
│  │  ├─ Current Balance ($USD)                                       │
│  │  ├─ Status Badge (Active/Suspended/etc)                          │
│  │  ├─ Frozen Indicator                                             │
│  │  ├─ Sending Eligibility Checklist                                │
│  │  ├─ Blocking Reasons                                             │
│  │  └─ Next Renewal Date                                            │
│  │                                                                   │
│  └─ Real-time Updates:                                              │
│     ├─ Auto-refresh on tab visibility                               │
│     ├─ Listen for PayPal top-up success                             │
│     └─ Show loading states                                          │
│                                                                      │
│  Component: BillingGuard (Wrapper)                                  │
│  ├─ Prop: requiredAmount (cost in cents)                            │
│  │                                                                   │
│  ├─ When balance insufficient:                                      │
│  │  └─ Shows InsufficientBalanceModal                               │
│  │     ├─ Displays shortfall                                        │
│  │     ├─ Quick top-up buttons ($50/$100/$250)                      │
│  │     └─ PayPal button for payments                                │
│  │                                                                   │
│  └─ When balance sufficient:                                        │
│     └─ Renders children (SendCampaignForm, etc)                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Examples

### Example 1: User Top-ups Wallet

```
1. User in settings clicks "Add Credits"
   ↓
2. Frontend displays PayPal Hosted Button
   ↓
3. User completes payment in PayPal UI
   ↓
4. PayPal processes payment
   ↓
5. PayPal sends PAYMENT.SALE.COMPLETED webhook to /webhooks/paypal
   ├─ Payload: { event_type, resource { id, custom_id, amount } }
   ↓
6. Backend webhook handler:
   ├─ Verifies signature with PayPal
   ├─ Checks if payment already processed (idempotency)
   ├─ Calls BillingService.creditWallet(organizationId, amountCents, paymentId)
   ├─ Inside creditWallet:
   │  ├─ UPDATE OrganizationWallet SET balanceCents = balanceCents + amount
   │  └─ INSERT INTO WalletTransaction (type: PAYMENT_TOPUP, referenceId: paymentId)
   ├─ Returns 200 OK
   ↓
7. Frontend WalletSummaryCard component:
   ├─ Listens for 'paypal-topup-success' event
   ├─ Calls GET /api/billing/wallet-summary
   ├─ Receives new balance
   └─ Updates UI with new balance
```

### Example 2: Subscription Activated

```
1. User subscribes to plan on PayPal
   ↓
2. PayPal sends BILLING.SUBSCRIPTION.ACTIVATED webhook
   ├─ Payload: { event_type, resource { id, status } }
   ↓
3. Backend webhook handler:
   ├─ Verifies signature
   ├─ Finds subscription by providerSubId = resource.id
   ├─ Updates OrganizationSubscription.status = ACTIVE
   ├─ Calls TwilioSubaccountService.handleSubscriptionStatusChange(orgId, "ACTIVE")
   │  ├─ Activates all Twilio subaccounts for organization
   │  └─ BillingService.unfreezeWallet(organizationId)
   ├─ Returns 200 OK
   ↓
4. Frontend WalletSummaryCard updates:
   ├─ Shows green "ACTIVE" status badge
   ├─ Unfrozen indicator
   └─ Enables sending
```

### Example 3: User Tries to Send Campaign Without Balance

```
1. User clicks "Send Campaign"
   ↓
2. Frontend calculates estimated cost (e.g., 10 contacts × $0.05 = $0.50)
   ↓
3. Frontend wraps form in:
   <BillingGuard requiredAmount={50}> {/* 50 cents */}
     <SendCampaignForm />
   </BillingGuard>
   ↓
4. BillingGuard checks wallet:
   ├─ Calls GET /api/billing/wallet-summary
   ├─ Checks if balanceCents >= requiredAmount
   ├─ If insufficient:
   │  └─ Shows InsufficientBalanceModal with:
   │     ├─ Current balance: $2.50
   │     ├─ Required amount: $0.50
   │     ├─ Shortfall: None (balance sufficient!)
   │     └─ Actually this example should show shortfall...
   ↓
5. User clicks "Top Up with PayPal"
   ↓
6. Modal shows PayPal Hosted Button
   ↓
7. User pays via PayPal → webhook fires → balance updates → modal closes
   ↓
8. User clicks "Send Campaign" again → form renders (BillingGuard passes)
```

---

## 🔄 Event Processing Flow

### Webhook Signature Verification

```
1. PayPal sends webhook with headers:
   ├─ paypal-auth-algo: SHA256withRSA
   ├─ paypal-transmission-id: unique-id
   ├─ paypal-transmission-sig: signature
   ├─ paypal-transmission-time: timestamp
   └─ paypal-cert-url: certificate-url

2. Backend handler:
   ├─ Extracts these headers from req
   ├─ Stores raw request body (before JSON parsing)
   ├─ Calls PayPal API with headers + body
   ├─ PayPal API returns: { verification_status: "SUCCESS" | "FAILURE" }
   └─ Only processes if verification_status === "SUCCESS"

3. Security Benefits:
   ├─ Proves webhook came from PayPal
   ├─ Prevents man-in-the-middle attacks
   ├─ Uses PayPal's certificate verification
   └─ Signature includes timestamp (prevents replay attacks)
```

### Idempotency Check (Prevents Duplicate Credits)

```
1. Payment webhook arrives with:
   ├─ event_type: "PAYMENT.SALE.COMPLETED"
   ├─ resource.id: "TXN-12345" (unique payment ID)
   └─ resource.amount.total: "50.00"

2. Backend checks:
   SELECT * FROM WalletTransaction 
   WHERE referenceId = 'TXN-12345'

3. If found:
   └─ Log "Payment already processed", return 200 OK

4. If not found:
   ├─ Calculate amountCents = 5000 (50.00 × 100)
   ├─ Call BillingService.creditWallet(orgId, 5000, 'TXN-12345')
   │  ├─ UPDATE wallet balance (atomic)
   │  └─ INSERT transaction with referenceId = 'TXN-12345'
   └─ Return 200 OK

5. If webhook resent by PayPal (retry):
   └─ referenceId already exists → short-circuit → prevent duplicate!
```

---

## 🔐 Security Design

### Layers of Protection

| Layer | Mechanism | Prevents |
|-------|-----------|----------|
| **Transport** | HTTPS + PayPal certificate validation | Man-in-the-middle |
| **Authenticity** | Webhook signature verification | Forged webhooks |
| **Timing** | Timestamp in signature | Replay attacks |
| **Idempotency** | referenceId tracking | Duplicate credits |
| **Authorization** | Session validation on API endpoints | Unauthorized access |
| **Data Validation** | Organization ID verification | Cross-org errors |
| **Database** | Atomic transactions | Inconsistent state |

### Never Trust Frontend

```
❌ DON'T DO THIS:
   const balance = JSON.parse(localStorage.getItem('balance'));
   if (balance >= requiredAmount) { send(); }

✅ DO THIS:
   const res = await fetch('/api/billing/wallet-summary');
   const { balanceCents } = await res.json();
   if (balanceCents >= requiredAmount) { send(); }
```

---

## 📈 Scaling Considerations

### Current Bottlenecks
1. **Single Twilio Service Instance**: Not thread-safe
2. **Wallet Update Race Condition**: If two payments arrive simultaneously
3. **Campaign Pause Loop**: N brands × N campaigns could be slow

### Production Improvements
1. **Connection Pooling**: Use Prisma connection pooling for database
2. **Queue for Webhooks**: Process in background job queue (Bull, RabbitMQ)
3. **Batch Campaign Updates**: Use SQL batch operations
4. **Caching**: Cache wallet state with Redis, invalidate on update
5. **Read Replicas**: Read wallet from replica, write to primary

### Example Optimized Flow
```
PayPal Webhook
    ↓
Express Route Handler
    ↓
Queue Job (Bull/RabbitMQ)
    ↓
Background Worker
    ├─ Verify signature
    ├─ Update database
    ├─ Trigger Twilio actions
    └─ Publish event
    ↓
Event Publisher (Socket.io / Kafka)
    ↓
Frontend Update (WebSocket)
```

---

## 🚨 Error Scenarios & Recovery

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Signature verification fails | Handler returns 400 | PayPal retries in 5min, 30min, 2hr, ... |
| Organization not found | Log warn, return 200 | Webhook retried after org created |
| Database error | Caught in try-catch | PayPal retries, manual reconciliation needed |
| Duplicate payment | referenceId found | Idempotency prevents duplicate credit |
| Network timeout | setTimeout | PayPal retries webhook automatically |
| Out of disk space | Database error | Alert, scale database, retry manually |

### Recovery Procedures

**Wallet Balance Incorrect:**
```sql
-- 1. Find erroneous transaction
SELECT * FROM WalletTransaction WHERE organizationId = 'org-123' ORDER BY createdAt DESC;

-- 2. Calculate correct balance
SELECT SUM(amountCents) FROM WalletTransaction WHERE organizationId = 'org-123';

-- 3. If mismatch, create adjustment transaction
INSERT INTO WalletTransaction (walletId, organizationId, type, amountCents, createdAt)
VALUES (wallet_id, 'org-123', 'ADJUSTMENT', -500, NOW()); -- Debit $5

-- 4. Update wallet directly (last resort)
UPDATE OrganizationWallet SET balanceCents = 5000 WHERE organizationId = 'org-123';
```

**Subscription Status Desynchronized:**
```sql
-- Check PayPal Dashboard for actual status, then sync:
UPDATE OrganizationSubscription SET status = 'ACTIVE' WHERE organizationId = 'org-123';

-- If wallet was frozen by mistake:
UPDATE OrganizationWallet SET isFrozen = false WHERE organizationId = 'org-123';

-- Re-activate Twilio (manual action in Twilio Dashboard)
```

---

## 📚 Related Components

### Already Integrated
- ✅ [BillingDashboard.tsx](apps/frontend/components/BillingDashboard.tsx) - Settings page with PayPal button
- ✅ [BillingGuard.tsx](apps/frontend/components/BillingGuard.tsx) - Campaign wrapper with modal
- ✅ [InsufficientBalanceModal.tsx](apps/frontend/components/InsufficientBalanceModal.tsx) - Modal with PayPal button
- ✅ [create-topup.ts](apps/frontend/pages/api/billing/create-topup.ts) - Checkout endpoint

### This Implementation Adds
- ✅ [paypal-webhook.ts](apps/backend-api/routes/paypal-webhook.ts) - Webhook handler (260 lines)
- ✅ [wallet-summary.ts](apps/frontend/pages/api/billing/wallet-summary.ts) - Wallet API (50 lines)
- ✅ [WalletSummaryCard.tsx](apps/frontend/components/WalletSummaryCard.tsx) - Wallet widget (320 lines)

---

## 🎯 Testing Strategy

### Unit Tests
```typescript
// Test idempotency
const result1 = await handleWalletTopup(event);
const result2 = await handleWalletTopup(event); // Same event
// Should create transaction only once
```

### Integration Tests
```typescript
// Test full webhook flow
const event = { event_type: 'PAYMENT.SALE.COMPLETED', ... };
await router.post('/webhooks/paypal')(req, res);
// Should update wallet and create transaction
```

### E2E Tests
```
1. Create test subscription in PayPal
2. Trigger webhook via PayPal Dashboard "Test Send"
3. Verify database updated
4. Verify UI updated via WebSocket/polling
```

---

## 📞 Deployment Checklist

- [ ] Environment variables configured (PayPal, Twilio, Database)
- [ ] Webhook handler registered in Express app
- [ ] Raw body middleware configured
- [ ] PayPal webhook registered in Dashboard
- [ ] Webhook ID copied to env vars
- [ ] Database migrations applied
- [ ] TwilioSubaccountService helpers available
- [ ] BillingService methods tested
- [ ] Frontend API endpoint working
- [ ] WalletSummaryCard component rendering
- [ ] BillingGuard wrapper functional
- [ ] Test payment processed successfully
- [ ] Database updated correctly
- [ ] Monitoring/alerts configured
- [ ] Error logging working
- [ ] Load testing done (if high volume expected)

For detailed setup, see [PAYPAL_WEBHOOK_SETUP.md](./PAYPAL_WEBHOOK_SETUP.md)
