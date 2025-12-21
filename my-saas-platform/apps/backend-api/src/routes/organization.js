const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Auth middleware
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

/**
 * Save business information for 10DLC registration
 * This will:
 * 1. Save business details to Organization
 * 2. Create Twilio subaccount (if not exists)
 * 3. Register 10DLC Brand with Twilio
 * 4. Register 10DLC Campaign
 */
router.post('/business-info', async (req, res) => {
  const orgId = req.auth.organizationId;
  const {
    legalName,
    dbaName,
    businessType,
    ein,
    address,
    city,
    state,
    zip,
    country,
    website,
    contactName,
    contactEmail,
    contactPhone,
    description
  } = req.body;

  try {
    // Validate required fields
    if (!legalName || !businessType || !address || !city || !state || !zip) {
      return res.status(400).json({ error: 'Missing required business information' });
    }

    // Update organization with business info
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        legalName,
        dbaName,
        businessType,
        ein,
        address,
        city,
        state,
        zip,
        country: country || 'United States',
        website,
        contactName,
        contactEmail,
        contactPhone,
        businessDescription: description
      }
    });

    // Get the brand for this organization
    const brand = await prisma.brand.findFirst({
      where: { orgId }
    });

    if (!brand) {
      return res.status(404).json({ error: 'No brand found for organization' });
    }

    // Step 1: Create Twilio Subaccount (if not already created)
    let subaccountResult = { created: false, subaccountSid: brand.twilioSubaccountSid };
    
    if (!brand.twilioSubaccountSid) {
      subaccountResult = await createTwilioSubaccount(orgId, brand.id);
      
      if (subaccountResult.created) {
        console.log(`✓ Created Twilio subaccount: ${subaccountResult.subaccountSid}`);
      } else {
        console.log(`⚠ Twilio subaccount creation: ${subaccountResult.reason}`);
      }
    }

    // Step 2: Register 10DLC Brand (if not already registered)
    let brandRegistration = { registered: false };
    
    if (!org.dlcBrandRegistered && subaccountResult.subaccountSid) {
      brandRegistration = await register10DLCBrand({
        subaccountSid: subaccountResult.subaccountSid,
        legalName,
        dbaName,
        businessType,
        ein,
        address,
        city,
        state,
        zip,
        country: country || 'United States',
        website,
        contactName,
        contactEmail,
        contactPhone
      });

      if (brandRegistration.registered) {
        // Mark brand as registered
        await prisma.organization.update({
          where: { id: orgId },
          data: { dlcBrandRegistered: true }
        });
        console.log(`✓ Registered 10DLC Brand: ${brandRegistration.brandSid}`);
      } else {
        console.log(`⚠ 10DLC Brand registration: ${brandRegistration.reason}`);
      }
    }

    // Step 3: Register 10DLC Campaign (if brand registered and campaign not registered)
    let campaignRegistration = { registered: false };
    
    if (brandRegistration.registered && !org.dlcCampaignRegistered) {
      campaignRegistration = await register10DLCCampaign({
        subaccountSid: subaccountResult.subaccountSid,
        brandSid: brandRegistration.brandSid,
        description: description || 'Lead generation and customer outreach'
      });

      if (campaignRegistration.registered) {
        // Mark campaign as registered and charge the 10DLC fees
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

        console.log(`✓ Registered 10DLC Campaign: ${campaignRegistration.campaignSid}`);
      } else {
        console.log(`⚠ 10DLC Campaign registration: ${campaignRegistration.reason}`);
      }
    }

    res.json({
      success: true,
      organization: org,
      twilio: {
        subaccount: subaccountResult,
        brand: brandRegistration,
        campaign: campaignRegistration
      }
    });

  } catch (error) {
    console.error('Business info save error:', error);
    res.status(500).json({ error: error.message || 'Failed to save business information' });
  }
});

/**
 * Create Twilio subaccount for organization
 */
async function createTwilioSubaccount(orgId, brandId) {
  const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
  const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
  
  if (!masterAccountSid || !masterAuthToken) {
    return { created: false, reason: 'missing_twilio_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(masterAccountSid, masterAuthToken);

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { created: false, reason: 'brand_not_found' };
  
  if (brand.twilioSubaccountSid) {
    return { created: false, reason: 'already_has_subaccount', subaccountSid: brand.twilioSubaccountSid };
  }

  const friendlyName = `LeadGenie-${orgId}`;

  try {
    const acct = await client.api.accounts.create({ friendlyName });
    const subaccountSid = acct && acct.sid;
    const subaccountAuthToken = acct && (acct.authToken || acct.auth_token);

    if (!subaccountSid) {
      return { created: false, reason: 'twilio_subaccount_create_failed' };
    }

    await prisma.brand.update({
      where: { id: brandId },
      data: {
        twilioSubaccountSid: subaccountSid,
        subaccountAuthToken: subaccountAuthToken || null,
      },
    });

    return { created: true, subaccountSid, hasAuthToken: Boolean(subaccountAuthToken) };
  } catch (error) {
    console.error('Twilio subaccount creation error:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Register 10DLC Brand with Twilio
 * https://www.twilio.com/docs/sms/a2p-10dlc/api/brand
 */
async function register10DLCBrand(brandInfo) {
  const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
  const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
  
  if (!masterAccountSid || !masterAuthToken) {
    return { registered: false, reason: 'missing_twilio_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(masterAccountSid, masterAuthToken);

  try {
    // Create A2P Brand Registration
    // Note: This requires Twilio customer profile setup first
    const brand = await client.messaging.v1.a2p.brandRegistrations.create({
      customerProfileBundleSid: brandInfo.customerProfileSid, // This would need to be created separately
      a2pProfileBundleSid: brandInfo.a2pProfileSid // This would need to be created separately
    });

    return { registered: true, brandSid: brand.sid };
  } catch (error) {
    console.error('10DLC Brand registration error:', error);
    // For now, return a mock success for development
    // In production, you'll need proper Twilio 10DLC setup
    if (process.env.NODE_ENV === 'development') {
      return { registered: true, brandSid: 'BN_DEV_' + Date.now(), mock: true };
    }
    return { registered: false, reason: error.message };
  }
}

/**
 * Register 10DLC Campaign with Twilio
 * https://www.twilio.com/docs/sms/a2p-10dlc/api/campaign
 */
async function register10DLCCampaign(campaignInfo) {
  const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
  const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
  
  if (!masterAccountSid || !masterAuthToken) {
    return { registered: false, reason: 'missing_twilio_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(masterAccountSid, masterAuthToken);

  try {
    // Create A2P Campaign
    const campaign = await client.messaging.v1.a2p.campaignRegistrations.create({
      brandSid: campaignInfo.brandSid,
      useCase: 'MARKETING', // or 'MIXED', 'CUSTOMER_CARE', etc.
      description: campaignInfo.description,
      messageSamples: [
        'Hi {FirstName}, are you interested in selling your property at {Address}?',
        'Thanks for your interest! Our team will reach out to discuss your options.'
      ],
      // Additional campaign parameters
      autoRenewal: true
    });

    return { registered: true, campaignSid: campaign.sid };
  } catch (error) {
    console.error('10DLC Campaign registration error:', error);
    // For now, return a mock success for development
    // In production, you'll need proper Twilio 10DLC setup
    if (process.env.NODE_ENV === 'development') {
      return { registered: true, campaignSid: 'CN_DEV_' + Date.now(), mock: true };
    }
    return { registered: false, reason: error.message };
  }
}

/**
 * Get organization business info
 */
router.get('/business-info', async (req, res) => {
  const orgId = req.auth.organizationId;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        legalName: true,
        dbaName: true,
        businessType: true,
        ein: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        website: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        businessDescription: true,
        dlcBrandRegistered: true,
        dlcCampaignRegistered: true
      }
    });

    res.json(org);
  } catch (error) {
    console.error('Get business info error:', error);
    res.status(500).json({ error: 'Failed to retrieve business information' });
  }
});

module.exports = router;
