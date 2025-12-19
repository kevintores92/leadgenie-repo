# PayPal Integration Guide

## Overview

The PayPal hosted button has been integrated in three key locations:

1. **Billing Settings Page** - Manual wallet top-ups
2. **Insufficient Balance Modal** - When users try to send but don't have enough balance
3. **Global PayPal SDK** - Loaded once per page

## Files Updated

### 1. `pages/_app.js` (Global)
- Added PayPal SDK script in `<Head>` tag
- Added button renderer script that initializes hosted buttons globally
- Buttons are identified by `data-paypal-hosted-button-id` and `data-paypal-container-id` attributes

### 2. `components/BillingDashboard.tsx` (Settings Page)
- Added PayPal button container below the "Quick Top-Up" buttons
- Automatically initializes when component mounts
- Container ID: `paypal-container-T2G2M28MTFRHY`
- Button ID: `T2G2M28MTFRHY`

### 3. `components/InsufficientBalanceModal.tsx` (New Component)
- Modal shown when users try to send a campaign but don't have sufficient balance
- Shows current balance, required amount, and shortfall
- Includes quick top-up amount selector
- Has PayPal button container ready for future integration
- Provides alternative quick-top-up buttons with API integration

### 4. `components/BillingGuard.tsx` (Updated)
- Now accepts optional `requiredAmount` prop (in cents)
- Displays InsufficientBalanceModal when balance is insufficient
- Modal only shows if subscription is ACTIVE (allows top-up)

## How to Use

### In Billing Settings
No changes needed - the PayPal button is automatically displayed in the wallet section.

```tsx
<BillingDashboard />
```

### In Campaign Send Flow
Wrap your campaign form with BillingGuard and pass the estimated cost:

```tsx
import BillingGuard from '../components/BillingGuard';

// In your component:
const estimatedCostCents = calculateCost(campaignSize);

return (
  <BillingGuard
    requiredAmount={estimatedCostCents}
    onBillingStatusChange={(canSend, reason) => {
      // Handle billing status changes
      if (!canSend) {
        console.log('Cannot send:', reason);
      }
    }}
  >
    {/* Your campaign form here */}
  </BillingGuard>
);
```

When users try to send and don't have enough balance, the modal will automatically appear showing:
- Current wallet balance
- Required amount for the campaign
- How much more they need
- Quick top-up options

## PayPal Button Details

### Current Configuration
- **Button ID**: `T2G2M28MTFRHY`
- **Container ID**: `paypal-container-T2G2M28MTFRHY`
- **Purpose**: Wallet top-ups via PayPal
- **Currency**: USD
- **Funding Disabled**: Venmo (to encourage PayPal account usage)

### SDK Details
- **Components**: `hosted-buttons` (pre-configured buttons)
- **Currency**: USD
- **Disable Funding**: venmo

## Webhook Integration

When a payment is completed through the PayPal button:
1. PayPal sends a webhook to `/api/webhooks/paypal`
2. The webhook handler processes the payment
3. Wallet is credited automatically
4. User sees success message on return

## To Customize

### Change Button Configuration
1. Log into PayPal Dashboard
2. Find the saved button "Wallet Top-Up"
3. Edit the button (amount, style, behavior)
4. Update the button ID if you create a new one

### Change Button Styling
PayPal hosted buttons have built-in styling that adapts to your page. To customize further:

1. **Create a new button in PayPal Dashboard** with your preferred styling
2. **Update the button ID** in:
   - `components/BillingDashboard.tsx` (line with `paypal-container-T2G2M28MTFRHY`)
   - Keep the container ID the same or update matching pairs

### Add Button to More Locations
To add the PayPal button elsewhere:

1. Add a container div with the matching ID:
   ```tsx
   <div id="paypal-container-T2G2M28MTFRHY"></div>
   ```

2. The global script in `_app.js` will automatically render it

## Mobile Responsive

The PayPal button automatically:
- Adapts to screen size
- Shows mobile-optimized UI on phones
- Handles mobile wallets (Apple Pay, Google Pay)

## Fallback Buttons

Users can still use the quick top-up buttons if they prefer:
- $50, $100, $250 buttons in BillingDashboard
- Same buttons in InsufficientBalanceModal
- These use the API-based checkout instead of hosted buttons

## Troubleshooting

### Button Not Showing
1. Check browser console for errors
2. Verify PayPal SDK loaded: `window.paypal` should exist
3. Check that container ID matches exactly
4. Verify button ID `T2G2M28MTFRHY` is correct

### Button Showing Multiple Times
- The global renderer in `_app.js` prevents duplicates
- Only one renderer script runs per page load
- Buttons are rendered on demand by the component

### Payment Not Crediting Wallet
1. Check `/api/webhooks/paypal` for errors
2. Verify PayPal webhook is configured correctly
3. Check that organization ID is in the order metadata
4. Review webhook event in PayPal Dashboard

## API Endpoints

### Webhook Handler
- **Path**: `POST /api/webhooks/paypal`
- **Events Handled**:
  - `PAYMENT.SALE.COMPLETED` - Credit wallet
  - `PAYMENT.SALE.DENIED` - Log failure

### Status Check
- **Path**: `GET /api/billing/status`
- **Returns**: Wallet balance, subscription status, can-send flag

### Top-up Alternative
- **Path**: `POST /api/billing/create-topup`
- **Body**: `{ amount: "50" }` (dollars)
- **Returns**: Checkout URL for non-hosted-button flow

## Future Enhancements

- [ ] Add fixed amounts to PayPal button
- [ ] Create button for subscriptions
- [ ] Add payment history view
- [ ] Implement invoice downloads
- [ ] Add refund capability

## Support

For questions about:
- **PayPal Setup**: See DEPLOYMENT_CHECKLIST.md Phase 2.1
- **Webhook Issues**: See DEPLOYMENT_CHECKLIST.md Support section
- **Modal Behavior**: Check InsufficientBalanceModal.tsx comments
- **Billing Flow**: See BILLING_SYSTEM.md

## Integration Checklist

- [x] PayPal SDK loaded globally
- [x] Button rendered in BillingDashboard
- [x] Modal created and integrated
- [x] Modal shown when balance insufficient
- [x] Wallet credited on payment
- [x] Success/error messaging
- [ ] Mobile testing (recommended)
- [ ] A/B testing button placement (optional)
