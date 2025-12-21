# 🎙️ Vapi AI Voice Calling - Setup Guide

## ✅ What's Implemented

Your system now has **full AI voice calling** capabilities:

### Features
- ✅ **Outbound cold calling** (landlines & mobiles)
- ✅ **Warm follow-up calls** (interested leads)
- ✅ **Real-time conversation AI** (GPT-4 powered)
- ✅ **Automatic status updates** (HOT/WARM/COLD classification)
- ✅ **Call recording & transcription**
- ✅ **Appointment scheduling** (via AI during calls)
- ✅ **Billing integration** (costs deducted from wallet)
- ✅ **Campaign integration** (can trigger calls from campaigns)

---

## 🚀 Setup Steps

### 1. Sign Up for Vapi

1. Go to https://vapi.ai
2. Create an account
3. Go to Dashboard → API Keys
4. Copy your API key (starts with `vapi_`)

### 2. Add API Key to Environment

**Local Development:**
Already added to `.env`:
```bash
VAPI_API_KEY="your-vapi-api-key-here"
```

**Railway Production:**
1. Go to Railway dashboard
2. Select `worker-services`
3. Variables tab → Add:
   - `VAPI_API_KEY`: Your Vapi API key
   - `VAPI_PHONE_NUMBER_ID`: (Optional) Your Vapi phone number

### 3. Get a Phone Number (Optional)

For outbound calls, you can:
- **Use your own Twilio number** (Vapi connects to Twilio)
- **Buy a Vapi phone number** (Dashboard → Phone Numbers → Buy)
- Set `VAPI_PHONE_NUMBER_ID` in environment

### 4. Run Database Migration

```bash
cd my-saas-platform/apps/backend-api
psql $DATABASE_URL < prisma/migrations/add_call_records.sql
```

Or with Prisma:
```bash
npx prisma db push
```

### 5. Register Vapi Webhook

1. Go to Vapi Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/webhooks/vapi/webhook`
3. Select events:
   - ✅ `call.started`
   - ✅ `call.ended`
   - ✅ `function-call`
   - ✅ `transcript`

### 6. Start Voice Worker

**Local:**
```bash
cd my-saas-platform/apps/worker-services
node src/voiceCallWorker.js
```

**Railway:**
Add to `railway.json` or create new service:
```json
{
  "startCommand": "node src/voiceCallWorker.js"
}
```

---

## 📞 How to Use

### Enable AI Calls for Organization

```sql
UPDATE "Organization" 
SET "aiCallsEnabled" = true 
WHERE id = 'your-org-id';
```

### Initiate a Call via API

```bash
POST /api/campaigns/:campaignId/call-contact
Body: {
  "contactId": "contact_123",
  "callType": "cold" // or "warm"
}
```

### Queue a Call via Worker

```javascript
const { voiceCallQueue } = require('./voiceCallWorker');

await voiceCallQueue.add('make-call', {
  contactId: 'contact_123',
  organizationId: 'org_123',
  callType: 'cold' // or 'warm'
});
```

---

## 🎯 AI Assistant Behavior

### Cold Calling (Default)
- Confirms property ownership
- Builds rapport
- Gauges interest level
- Qualifies as HOT/WARM/COLD
- Keeps calls under 3 minutes
- Updates contact status automatically

### Warm Calling
- References previous interaction
- Focuses on moving to action
- Schedules appointments
- More direct closing

---

## 💰 Pricing

**Vapi Costs** (approximate):
- $0.10-0.15 per minute
- Average 2-3 minute call = $0.30-0.45
- Automatically deducted from org wallet
- Logged in `Usage` table

---

## 📊 Call Data Storage

All calls are stored in `CallRecord` table:
- Vapi call ID
- Duration, cost
- Full transcript
- Recording URL
- Summary
- Status updates

---

## 🔧 Customization

### Change AI Voice

Edit `voiceCallWorker.js`:
```javascript
voice: {
  provider: 'elevenlabs',
  voiceId: 'pNInz6obpgDQGcFmaJgB' // Change this
}
```

Available voices: https://elevenlabs.io/voice-library

### Customize Script

Edit the system prompt in `buildAssistant()` function to change how the AI behaves.

### Add Custom Functions

Add new functions to the assistant:
```javascript
functions: [
  {
    name: 'sendEmail',
    description: 'Send follow-up email',
    parameters: { /* ... */ }
  }
]
```

Handle in `voice.js` webhook → `handleFunctionCall()`

---

## 🐛 Troubleshooting

### Calls Not Starting
1. Check `VAPI_API_KEY` is set correctly
2. Verify webhook URL is reachable
3. Check organization has `aiCallsEnabled = true`
4. Verify sufficient wallet balance

### No Webhook Events
1. Check Vapi Dashboard → Webhooks → Recent Deliveries
2. Verify URL is correct and accessible
3. Check server logs for errors

### Poor Call Quality
1. Switch to better voice provider (ElevenLabs)
2. Use GPT-4 instead of GPT-3.5
3. Reduce `temperature` for more consistent responses

---

## 📚 Resources

- **Vapi Docs**: https://docs.vapi.ai
- **Voice Library**: https://elevenlabs.io/voice-library
- **Webhook Events**: https://docs.vapi.ai/webhooks
- **Function Calling**: https://docs.vapi.ai/function-calling

---

## ✅ Quick Test

```bash
# 1. Enable AI calls
psql $DATABASE_URL -c "UPDATE \"Organization\" SET \"aiCallsEnabled\" = true WHERE id = 'your-org-id';"

# 2. Queue a test call
node -e "
const { voiceCallQueue } = require('./src/voiceCallWorker');
voiceCallQueue.add('test', {
  contactId: 'contact_123',
  organizationId: 'org_123',
  callType: 'cold'
});
"

# 3. Check logs
tail -f logs/worker.log
```

---

## 🎉 You're Ready!

Your AI voice calling is now fully integrated and ready for production! 

**Next steps:**
1. Get your Vapi API key
2. Add to environment variables
3. Run the migration
4. Start the worker
5. Make your first AI call! 🚀
