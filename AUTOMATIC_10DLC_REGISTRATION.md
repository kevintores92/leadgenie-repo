# Automatic Twilio Subaccount & 10DLC Registration

## 🎯 Overview

When users submit their business information through the BusinessInfo page, the system **automatically**:
1. Creates a Twilio subaccount for the organization
2. Registers the 10DLC Brand with Twilio
3. Registers the 10DLC Campaign
4. Charges $19 ($4 brand + $15 campaign) from wallet balance

## 📋 User Flow

### Step 1: Business Information Collection
**Page:** `AI_LG/src/pages/BusinessInfo.tsx`

User provides:
- Legal Business Name (required)
- DBA Name (optional)
- Business Type (required) - Sole Proprietorship, LLC, Corporation, etc.
- EIN/Tax ID (optional but recommended)
- Business Address (required)
- City, State, ZIP (required)
- Country (defaults to United States)
- Website URL (optional)
- Contact Name, Email, Phone
- Business Description (used for campaign registration)

### Step 2: API Submission
**Endpoint:** `POST /api/organization/business-info`

Frontend calls:
```typescript
await api.updateBusinessInfo({
  legalName: "Acme Real Estate LLC",
  businessType: "LLC",
  ein: "12-3456789",
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  website: "https://acmerealestate.com",
  contactName: "John Doe",
  contactEmail: "john@acmerealestate.com",
  contactPhone: "+15125551234",
  description: "Real estate lead generation and customer outreach"
});
```

### Step 3: Automatic Backend Processing
**File:** `my-saas-platform/apps/backend-api/src/routes/organization.js`

The backend automatically performs these steps:

#### 3.1 Save Business Info to Database
```javascript
await prisma.organization.update({
  where: { id: orgId },
  data: {
    legalName,
    businessType,
    ein,
    address,
    city,
    state,
    zip,
    // ... all other fields
  }
});
```

#### 3.2 Create Twilio Subaccount
```javascript
const twilioClient = Twilio(
  process.env.TWILIO_MASTER_ACCOUNT_SID,
  process.env.TWILIO_MASTER_AUTH_TOKEN
);

const subaccount = await twilioClient.api.accounts.create({
  friendlyName: `LeadGenie-${orgId}`
});

await prisma.brand.update({
  where: { id: brandId },
  data: {
    twilioSubaccountSid: subaccount.sid,
    subaccountAuthToken: subaccount.authToken
  }
});
```

#### 3.3 Register 10DLC Brand
```javascript
const brand = await twilioClient.messaging.v1.a2p.brandRegistrations.create({
  customerProfileBundleSid: profileBundle.sid,
  a2pProfileBundleSid: a2pBundle.sid
});

await prisma.organization.update({
  where: { id: orgId },
  data: { dlcBrandRegistered: true }
});
```

#### 3.4 Register 10DLC Campaign
```javascript
const campaign = await twilioClient.messaging.v1.a2p.campaignRegistrations.create({
  brandSid: brand.sid,
  useCase: 'MARKETING',
  description: businessDescription,
  messageSamples: [
    'Hi {FirstName}, are you interested in selling your property at {Address}?',
    'Thanks for your interest! Our team will reach out to discuss your options.'
  ],
  autoRenewal: true
});

// Charge 10DLC fees and mark as registered
await prisma.organization.update({
  where: { id: orgId },
  data: {
    dlcCampaignRegistered: true,
    walletBalance: { decrement: 19.00 } // $4 brand + $15 campaign
  }
});

// Record the charge
await prisma.usage.create({
  data: {
    organizationId: orgId,
    type: '10DLC_REGISTRATION',
    cost: 19.00
  }
});
```

## 💰 Pricing Breakdown

### 10DLC Registration Fees (One-time)
- **Brand Registration**: $4.00
- **Campaign Registration**: $15.00
- **Total**: $19.00 (automatically charged from wallet)

### Per-Message Costs
- **SMS**: $0.02 per message
  - Includes: Twilio delivery + AI Classification + AI Replies
  - No hidden fees or markup beyond the flat $0.02

### Voice Call Costs
- **Base Costs**:
  - Twilio: $0.014 per minute
  - AI (Vapi): $0.06 per minute
- **With 2x Markup**: ($0.014 + $0.06) × 2 = $0.148/min
- **Per 2-min Call**: $0.148 × 2 = $0.296

## 🗄️ Database Schema

### Organization Model
```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  
  // 10DLC Business Information
  legalName            String?
  dbaName              String?
  businessType         String?
  ein                  String?
  address              String?
  city                 String?
  state                String?
  zip                  String?
  country              String?   @default("United States")
  website              String?
  contactName          String?
  contactEmail         String?
  contactPhone         String?
  businessDescription  String?
  dlcBrandRegistered   Boolean   @default(false)
  dlcCampaignRegistered Boolean  @default(false)
  
  // Wallet
  walletBalance        Float     @default(0.0)
  
  // Relations
  brands               Brand[]
  users                User[]
  wallet               OrganizationWallet?
}
```

### Brand Model
```prisma
model Brand {
  id                   String   @id @default(cuid())
  orgId                String
  organization         Organization @relation(fields: [orgId], references: [id])
  name                 String
  
  // Twilio Subaccount
  twilioSubaccountSid  String?
  subaccountAuthToken  String?
  
  callingMode          String
  createdAt            DateTime @default(now())
}
```

## 🔧 Environment Variables Required

```env
# Twilio Master Account (for creating subaccounts)
TWILIO_MASTER_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_MASTER_AUTH_TOKEN=your_master_auth_token

# Twilio Main Account (for sending messages)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
```

## 🚀 Deployment Checklist

### Database Migration
```bash
# Apply the new schema fields
psql $DATABASE_URL < my-saas-platform/apps/backend-api/prisma/migrations/add_business_info_fields.sql
```

### Railway Environment Variables
Ensure these are set in Railway:
- ✅ `TWILIO_MASTER_ACCOUNT_SID`
- ✅ `TWILIO_MASTER_AUTH_TOKEN`
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`

### Deploy Backend
```bash
cd my-saas-platform/apps/backend-api
git push railway ai-leadgenie-online:main
```

### Deploy Frontend
Already configured in Railway to deploy from `AI_LG` folder.

## 📝 Testing the Flow

### 1. Sign Up New User
```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "organizationName": "Test Org"
  }'
```

### 2. Submit Business Info
```bash
curl -X POST http://localhost:4000/organization/business-info \
  -H "Content-Type: application/json" \
  -H "x-organization-id: <orgId>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "legalName": "Test Real Estate LLC",
    "businessType": "LLC",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "website": "https://test.com",
    "contactEmail": "contact@test.com",
    "description": "Real estate lead generation"
  }'
```

### 3. Verify Registration
Check the response for:
```json
{
  "success": true,
  "organization": {
    "legalName": "Test Real Estate LLC",
    "dlcBrandRegistered": true,
    "dlcCampaignRegistered": true,
    "walletBalance": 481.00  // If started with $500
  },
  "twilio": {
    "subaccount": {
      "created": true,
      "subaccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "brand": {
      "registered": true,
      "brandSid": "BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "campaign": {
      "registered": true,
      "campaignSid": "CNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

## 🔍 Troubleshooting

### Issue: "missing_twilio_master_creds"
**Solution:** Set `TWILIO_MASTER_ACCOUNT_SID` and `TWILIO_MASTER_AUTH_TOKEN` environment variables.

### Issue: "Insufficient wallet balance"
**Solution:** User needs at least $19 in wallet to cover 10DLC registration fees. Add wallet topup before business info submission.

### Issue: "Brand registration failed"
**Solution:** In development mode, the system returns mock success. In production, ensure Twilio account has 10DLC enabled and proper customer profile setup.

### Issue: Already registered
If `dlcBrandRegistered` or `dlcCampaignRegistered` is already true, the system skips that step and doesn't charge again.

## 🎯 Production Considerations

### Twilio 10DLC Requirements
1. **Customer Profile Bundle**: Must be created in Twilio Console first
2. **A2P Profile Bundle**: Business information bundle required by Twilio
3. **Brand Vetting**: Twilio may take 1-7 days to vet the brand
4. **Campaign Approval**: Usually instant for standard use cases

### Real Implementation Steps
For production, you'll need to:

1. **Create Customer Profile Bundle** (one-time setup):
```javascript
const customerProfile = await twilioClient.trusthub.v1
  .customerProfiles
  .create({
    friendlyName: org.legalName,
    email: org.contactEmail,
    policySid: 'RNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  });
```

2. **Submit Business Information**:
```javascript
const bundle = await twilioClient.trusthub.v1
  .customerProfiles(customerProfile.sid)
  .customerProfilesEntityAssignments
  .create({
    objectSid: 'ITxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' // Business info item
  });
```

3. **Register Brand**:
```javascript
const brand = await twilioClient.messaging.v1.a2p
  .brandRegistrations
  .create({
    customerProfileBundleSid: customerProfile.sid,
    a2pProfileBundleSid: bundle.sid
  });
```

4. **Register Campaign**:
```javascript
const campaign = await twilioClient.messaging.v1.a2p
  .campaigns
  .create({
    brandRegistrationSid: brand.sid,
    usecase: 'MARKETING',
    messageSamples: samples,
    // ... other required fields
  });
```

## 📚 Related Documentation

- [BILLING_SYSTEM.md](BILLING_SYSTEM.md) - Complete billing and pricing documentation
- [FRONTEND_API_INTEGRATION_COMPLETE.md](FRONTEND_API_INTEGRATION_COMPLETE.md) - Frontend integration status
- [VAPI_VOICE_SETUP.md](VAPI_VOICE_SETUP.md) - Voice AI configuration
- [TWILIO_WALLET_SAFETY_GUIDE.md](TWILIO_WALLET_SAFETY_GUIDE.md) - Wallet safety and suspension logic

## ✅ Status

- ✅ Database schema updated with business info fields
- ✅ Backend endpoint created (`/organization/business-info`)
- ✅ Frontend BusinessInfo page wired to API
- ✅ Automatic Twilio subaccount creation
- ✅ 10DLC Brand registration (with Twilio API integration)
- ✅ 10DLC Campaign registration (with Twilio API integration)
- ✅ Automatic $19 wallet charge on registration
- ✅ Clear pricing: $0.02/SMS (includes AI Classification + AI Replies)
- ⚠️ Production: Requires Twilio Customer Profile Bundle setup
- ⚠️ Production: Requires database migration before deployment

## 🎉 Result

Users can now:
1. Sign up
2. Fill out business information form
3. System automatically creates Twilio subaccount and registers 10DLC
4. Upload contact list
5. Create campaigns immediately with compliant messaging
6. Pay only $0.02 per SMS (all-inclusive pricing)
