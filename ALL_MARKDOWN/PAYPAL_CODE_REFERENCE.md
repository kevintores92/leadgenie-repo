# PayPal Button Code Reference

## Quick Copy-Paste Guide

### Part 1: Global Setup (Already Added to _app.js)

```jsx
// In pages/_app.js <Head>
<script
  src="https://www.paypal.com/sdk/js?client-id=BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks&components=hosted-buttons&disable-funding=venmo&currency=USD"
  crossOrigin="anonymous"
  async
></script>

// Global button renderer script
<script
  dangerouslySetInnerHTML={{
    __html: `
      document.addEventListener("DOMContentLoaded", (event) => {
        if (window.paypal && window.paypal.HostedButtons) {
          const containers = document.querySelectorAll('[data-paypal-hosted-button-id]');
          containers.forEach(container => {
            const buttonId = container.getAttribute('data-paypal-hosted-button-id');
            const containerId = container.getAttribute('data-paypal-container-id');
            if (buttonId && containerId) {
              window.paypal.HostedButtons({
                hostedButtonId: buttonId
              }).render("#" + containerId);
            }
          });
        }
      });
    `,
  }}
/>
```

### Part 2: Settings Page Container (Already Added to BillingDashboard)

```jsx
<div className="mt-6 border-t border-border pt-6">
  <p className="mb-4 text-sm font-medium text-muted-text">Or use PayPal:</p>
  <div id="paypal-container-T2G2M28MTFRHY" className="flex justify-center"></div>
</div>
```

### Part 3: BillingDashboard Initialization (Already Added)

```tsx
const initializePayPalButton = () => {
  if (window.paypal && window.paypal.HostedButtons) {
    try {
      window.paypal.HostedButtons({
        hostedButtonId: "T2G2M28MTFRHY"
      }).render("#paypal-container-T2G2M28MTFRHY");
    } catch (error) {
      console.warn('PayPal button already rendered or not available');
    }
  }
};

useEffect(() => {
  fetchBillingStatus();
  initializePayPalButton();
}, []);
```

### Part 4: Insufficient Balance Modal

See `components/InsufficientBalanceModal.tsx` for complete implementation.

Usage:
```tsx
import InsufficientBalanceModal from './InsufficientBalanceModal';

<InsufficientBalanceModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  currentBalance={5000} // cents
  requiredAmount={10000} // cents
/>
```

### Part 5: BillingGuard with Modal

See `components/BillingGuard.tsx` for complete implementation.

Usage:
```tsx
import BillingGuard from './BillingGuard';

<BillingGuard
  requiredAmount={estimatedCostCents}
  onBillingStatusChange={(canSend, reason) => {
    setCanSendCampaign(canSend);
  }}
>
  {/* Your campaign form here */}
</BillingGuard>
```

---

## Configuration

### PayPal Details
- **Client ID**: `BAAfosOZHkNtMvoC4_3JIOby8GMaVR7pexbUmaJN1PpPflXgHnCRy1nmtjFBvmTIiVQeRBnrhb3z9yLLks`
- **Button ID**: `T2G2M28MTFRHY`
- **Container ID**: `paypal-container-T2G2M28MTFRHY`
- **Currency**: USD
- **Disable Funding**: venmo

### To Change Button

1. **Update Client ID** (if using different PayPal account):
   ```jsx
   src="https://www.paypal.com/sdk/js?client-id=YOUR_NEW_CLIENT_ID&..."
   ```

2. **Update Button ID** (if creating new button):
   - Create button in PayPal Dashboard
   - Copy button ID
   - Replace `T2G2M28MTFRHY` in:
     - `_app.js` (renderer)
     - `BillingDashboard.tsx` (container + initialization)
     - `InsufficientBalanceModal.tsx` (container)

---

## Manual Button Creation

If you need to create a new PayPal button:

1. Go to PayPal Business Dashboard
2. Tools → All Tools → PayPal Buttons
3. Create new button:
   - **Name**: Wallet Top-Up
   - **Type**: Dollar amount
   - **Amount**: 0 (user selects)
   - **Size**: Responsive
   - **Color**: Blue (or match your theme)
4. Copy the hosted button ID
5. Update in code

---

## Integration Points

### 1. Settings Page (BillingDashboard)
```tsx
// Location: apps/frontend/components/BillingDashboard.tsx
<div id="paypal-container-T2G2M28MTFRHY" className="flex justify-center"></div>
```

### 2. Campaign Send Modal
```tsx
// Location: apps/frontend/components/InsufficientBalanceModal.tsx
<div id="paypal-container-topup-modal" className="flex justify-center"></div>
```

### 3. Custom Location
```tsx
// Add anywhere:
<div id="paypal-container-T2G2M28MTFRHY"></div>
// Button will render automatically via global script
```

---

## Webhook Handler

The PayPal button sends webhooks to:
```
POST /api/webhooks/paypal
```

Expected webhook events:
- `PAYMENT.SALE.COMPLETED` - Wallet credited
- `PAYMENT.SALE.DENIED` - Log failure

Response:
```json
{
  "status": "success",
  "message": "Wallet credited"
}
```

---

## Testing

### Sandbox Testing
1. Set environment: `PAYPAL_MODE=sandbox`
2. Use test buyer credentials
3. PayPal will send webhooks to your test endpoint
4. Verify wallet credits in dashboard

### Live Testing
1. Use real PayPal account credentials
2. Real payments process
3. Real webhooks fire
4. Production wallet credits

---

## Troubleshooting

### Button Won't Render
```javascript
// Check in browser console:
console.log(window.paypal); // Should exist
console.log(document.getElementById('paypal-container-T2G2M28MTFRHY')); // Should exist
```

### Payment Not Processing
1. Check webhook endpoint logs
2. Verify `PAYPAL_WEBHOOK_ID` correct
3. Check `PAYPAL_CLIENT_ID` matches
4. Verify organization metadata in order

### Modal Not Showing
1. Check `requiredAmount > 0`
2. Verify subscription status is ACTIVE
3. Check `currentBalance < requiredAmount`
4. Look for JavaScript errors in console

---

## Mobile Responsive

PayPal hosted buttons automatically:
- Scale to screen size
- Show mobile-optimized UI
- Support mobile wallets
- Handle touch interactions

No additional configuration needed.

---

## Security

### Signature Verification
The PayPal webhook handler verifies:
- Webhook signature (via PayPalService)
- Organization ownership
- Payment amount matches
- No duplicate processing (via WebhookEvent table)

### Safe for Production
- Uses hosted buttons (no sensitive data on your page)
- Webhook signatures verified
- Transaction IDs tracked
- Idempotent event processing

---

## CSS Customization

PayPal hosted buttons use PayPal's styling. To customize:

1. **Via PayPal Dashboard**:
   - Edit button
   - Adjust color, size, label
   - Save

2. **Via CSS** (limited):
   ```css
   #paypal-container-T2G2M28MTFRHY {
     max-width: 500px;
     margin: 0 auto;
   }
   ```

---

## API Alternatives

If you prefer not to use hosted buttons:

### Option 1: API-Based Checkout
```typescript
// POST /api/billing/create-topup
const res = await fetch('/api/billing/create-topup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 50 })
});
const { approveLink } = await res.json();
window.location.href = approveLink;
```

### Option 2: Smart Buttons
Replace hosted button with:
```jsx
<script>
  paypal.Buttons({
    createOrder: (data, actions) => {
      // Create order
    },
    onApprove: (data, actions) => {
      // Capture payment
    }
  }).render('#container');
</script>
```

Both are available if you need different functionality.

---

## Files Containing PayPal Configuration

1. **_app.js** - SDK and renderer
2. **BillingDashboard.tsx** - Settings button
3. **InsufficientBalanceModal.tsx** - Modal button (prepared)
4. **BillingGuard.tsx** - Modal trigger
5. **/api/webhooks/paypal.ts** - Webhook handler
6. **/api/billing/create-topup.ts** - Alternative flow

---

## Quick Checklist

- [x] PayPal SDK loaded globally
- [x] Button showing in settings
- [x] Modal created and styled
- [x] Webhook handler implemented
- [x] Wallet credits on payment
- [ ] Tested in sandbox
- [ ] Tested on mobile
- [ ] Production deployment
- [ ] Monitor webhook processing

---

This guide provides everything you need to implement and maintain the PayPal button integration!
