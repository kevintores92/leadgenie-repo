# Campaign New Page - Changes Plan

## Key Changes Required

### 1. List Selection/Upload Section (NEW - Above Campaign Name)
- Check URL params for `listId` from Step 3 upload
- If `listId` exists: Fetch and display list stats
  - Total rows uploaded
  - Verified mobile count  
  - Verified landline count
- If no `listId`: Show upload dropzone

### 2. Remove Slider
- Delete the phone number slider entirely
- Get counts from uploaded list data (mobile + landline)

### 3. Cost Calculation Updates
```typescript
// SMS Cost
const smsCost = mobileCount * SMS_COST; // $0.02 per SMS

// Warm Calling Cost (25% of mobiles get called after reply)
const warmCallCost = (mobileCount * 0.25) * VOICE_COST_PER_MINUTE; // $0.20/min

// Cold Calling Cost (landlines)
const connectRate = 0.15; // 10-25%, use 15% as middle
const avgTalkTime = 4; // 3-5 minutes average
const connectedCalls = landlineCount * connectRate;
const coldCallMinutes = connectedCalls * avgTalkTime;
const coldCallCost = coldCallMinutes * VOICE_COST_PER_MINUTE;

// Split display
const smsWarmCampaignCost = smsCost + warmCallCost + (phoneNumbers for SMS);
const coldCallingCampaignCost = coldCallCost + (phoneNumbers for voice);
```

### 4. Projected Results Updates
```typescript
const replyRate = 0.25; // 25% reply rate
const positiveRate = 0.15; // 15% of replies are positive

const totalReplies = mobileCount * replyRate;
const positiveReplies = totalReplies * positiveRate; // These become warm calls
```

### 5. UI Elements to REMOVE
- [ ] `💡 Rotating {costs.numbersNeeded} numbers (1 per {CONTACTS_PER_NUMBER} contacts)`
- [ ] `🔍 Auto validation: Line type (mobile/landline), carrier, active status`
- [ ] `⚠️ Ensure your message content aligns with your declared 10DLC use case...` (yellow box)
- [ ] Entire "💳 Wallet Funding Guide" section
- [ ] "Est. Time" section

### 6. Wallet Section
- Make ENTIRE card clickable (not just reload button)
- Opens modal with PayPal widget for adding funds
- Current: Only "Reload" text is clickable

### 7. Launch Button Modal
- If `walletBalance < totalCost`: Show modal before launch
- Modal content:
  - "Insufficient Balance - Reload Recommended"
  - Show shortfall amount
  - Two buttons: "Reload Wallet" and "Create Campaign Anyway"
- Allow campaign creation even with $0 balance (won't send until funded)

### 8. Cost Breakdown Display
Change from single "SMS + Voice Outreach" line to:
```
SMS + Warm Calling Campaign
  - SMS to {mobileCount} mobiles: ${smsCost}
  - Warm calls ({warmCallCount} expected): ${warmCallCost}
  - Phone numbers: ${smsPhoneNumbersCost}
  Subtotal: ${smsWarmTotal}

Cold Calling Campaign  
  - Voice calls to {landlineCount} landlines: ${coldCallCost}
  - Phone numbers: ${voicePhoneNumbersCost}
  Subtotal: ${coldCallTotal}

Total: ${totalCost}
```

## Implementation Order
1. Add list data state and fetching logic
2. Add list selection/upload UI
3. Update cost calculations
4. Update projected results
5. Remove specified UI elements
6. Make wallet clickable with modal
7. Add launch button modal
8. Update cost breakdown display

## Questions/Clarifications Needed
- **List API**: What endpoint returns list stats (total, mobile count, landline count)?
- **List Storage**: Are lists stored in backend with IDs, or just contacts?
- **PayPal Modal**: Is there an existing PayPal widget component, or create new?
- **Organization/Subaccounts**: Mentioned for later - not in this refactor?
