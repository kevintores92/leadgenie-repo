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
  const masterClient = Twilio(masterAccountSid, masterAuthToken);

  const brand = await prisma.brand.findUnique({ 
    where: { id: brandId },
    include: { organization: true }
  });
  if (!brand) return { created: false, reason: 'brand_not_found' };
  
  if (brand.twilioSubaccountSid) {
    return { created: false, reason: 'already_has_subaccount', subaccountSid: brand.twilioSubaccountSid };
  }

  const friendlyName = `LeadGenie-${orgId}-${brand.name}`;

  try {
    // Create subaccount
    const acct = await masterClient.api.accounts.create({ friendlyName });
    const subaccountSid = acct && acct.sid;
    const subaccountAuthToken = acct && (acct.authToken || acct.auth_token);

    if (!subaccountSid) {
      return { created: false, reason: 'twilio_subaccount_create_failed' };
    }

    // Create subaccount client
    const subClient = Twilio(subaccountSid, subaccountAuthToken);

    // Get area code from brand or org
    const areaCode = brand.areaCode || brand.organization.areaCode || '212'; // Default to 212

    // Create TwiML App
    const twimlApp = await subClient.applications.create({
      friendlyName: `LeadGenie-${brand.name}`,
      voiceUrl: `${process.env.BASE_URL || 'https://api.yourapp.com'}/twilio/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.BASE_URL || 'https://api.yourapp.com'}/twilio/status`,
      statusCallbackMethod: 'POST'
    });

    const twimlAppSid = twimlApp.sid;

    // Provision numbers: 4 SMS, 3 Voice
    const smsNumbers = [];
    const voiceNumbers = [];

    // Buy SMS numbers (local)
    const availableSms = await masterClient.availablePhoneNumbers('US').local.list({
      areaCode: areaCode,
      limit: 4
    });

    for (let i = 0; i < Math.min(4, availableSms.length); i++) {
      const number = await masterClient.incomingPhoneNumbers.create({
        phoneNumber: availableSms[i].phoneNumber,
        voiceApplicationSid: twimlAppSid
      });
      smsNumbers.push({
        twilioSid: number.sid,
        phoneNumber: number.phoneNumber,
        type: 'SMS'
      });
    }

    // Buy Voice numbers (local)
    const availableVoice = await masterClient.availablePhoneNumbers('US').local.list({
      areaCode: areaCode,
      limit: 3
    });

    for (let i = 0; i < Math.min(3, availableVoice.length); i++) {
      const number = await masterClient.incomingPhoneNumbers.create({
        phoneNumber: availableVoice[i].phoneNumber,
        voiceApplicationSid: twimlAppSid
      });
      voiceNumbers.push({
        twilioSid: number.sid,
        phoneNumber: number.phoneNumber,
        type: 'VOICE'
      });
    }

    // Store in DB
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        twilioSubaccountSid: subaccountSid,
        subaccountAuthToken: subaccountAuthToken || null,
        twilioTwiMLAppSid: twimlAppSid,
        areaCode: areaCode,
      },
    });

    // Store phone numbers
    const allNumbers = [...smsNumbers, ...voiceNumbers];
    for (const num of allNumbers) {
      await prisma.phoneNumber.create({
        data: {
          organizationId: orgId,
          brandId: brandId,
          twilioSid: num.twilioSid,
          phoneNumber: num.phoneNumber,
          status: 'ACTIVE'
        }
      });
    }

    return { 
      created: true, 
      subaccountSid, 
      hasAuthToken: Boolean(subaccountAuthToken),
      twimlAppSid,
      smsNumbers: smsNumbers.length,
      voiceNumbers: voiceNumbers.length
    };
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

/**
 * Switch area code/marketplace for a brand
 * Releases current numbers, buys new ones, updates TwiML and A2P
 */
router.post('/switch-area-code', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { brandId, newAreaCode, confirmDataLoss = false } = req.body;

  if (!brandId || !newAreaCode) {
    return res.status(400).json({ error: 'brandId and newAreaCode required' });
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { organization: true, phoneNumbers: true }
    });

    if (!brand || brand.orgId !== orgId) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    if (!brand.twilioSubaccountSid) {
      return res.status(400).json({ error: 'Brand has no Twilio subaccount' });
    }

    // Check if there are active campaigns using these numbers
    const activeCampaigns = await prisma.campaign.count({
      where: {
        brandId,
        status: { in: ['ACTIVE', 'RUNNING'] }
      }
    });

    if (activeCampaigns > 0 && !confirmDataLoss) {
      return res.status(400).json({ 
        error: 'Active campaigns detected. Switching area code will stop campaigns and may cause data loss. Set confirmDataLoss=true to proceed.' 
      });
    }

    // Stop active campaigns
    if (activeCampaigns > 0) {
      await prisma.campaign.updateMany({
        where: { brandId, status: { in: ['ACTIVE', 'RUNNING'] } },
        data: { status: 'STOPPED' }
      });
    }

    const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
    const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
    const Twilio = require('twilio');
    const masterClient = Twilio(masterAccountSid, masterAuthToken);
    const subClient = Twilio(brand.twilioSubaccountSid, brand.subaccountAuthToken);

    // Release current numbers
    for (const num of brand.phoneNumbers) {
      try {
        await masterClient.incomingPhoneNumbers(num.twilioSid).remove();
        await prisma.phoneNumber.delete({ where: { id: num.id } });
      } catch (error) {
        console.error(`Failed to release number ${num.phoneNumber}:`, error);
      }
    }

    // Buy new numbers in new area code
    const smsNumbers = [];
    const voiceNumbers = [];

    // Buy 4 SMS numbers
    const availableSms = await masterClient.availablePhoneNumbers('US').local.list({
      areaCode: newAreaCode,
      limit: 4
    });

    for (let i = 0; i < Math.min(4, availableSms.length); i++) {
      const number = await masterClient.incomingPhoneNumbers.create({
        phoneNumber: availableSms[i].phoneNumber,
        voiceApplicationSid: brand.twilioTwiMLAppSid
      });
      smsNumbers.push({
        twilioSid: number.sid,
        phoneNumber: number.phoneNumber,
        type: 'SMS'
      });
    }

    // Buy 3 Voice numbers
    const availableVoice = await masterClient.availablePhoneNumbers('US').local.list({
      areaCode: newAreaCode,
      limit: 3
    });

    for (let i = 0; i < Math.min(3, availableVoice.length); i++) {
      const number = await masterClient.incomingPhoneNumbers.create({
        phoneNumber: availableVoice[i].phoneNumber,
        voiceApplicationSid: brand.twilioTwiMLAppSid
      });
      voiceNumbers.push({
        twilioSid: number.sid,
        phoneNumber: number.phoneNumber,
        type: 'VOICE'
      });
    }

    // Store new phone numbers
    const allNumbers = [...smsNumbers, ...voiceNumbers];
    for (const num of allNumbers) {
      await prisma.phoneNumber.create({
        data: {
          organizationId: orgId,
          brandId: brandId,
          twilioSid: num.twilioSid,
          phoneNumber: num.phoneNumber,
          status: 'ACTIVE'
        }
      });
    }

    // Update brand area code
    await prisma.brand.update({
      where: { id: brandId },
      data: { areaCode: newAreaCode }
    });

    // TODO: Update A2P 10DLC campaign if needed (re-register with new numbers)

    res.json({
      success: true,
      newAreaCode,
      smsNumbers: smsNumbers.length,
      voiceNumbers: voiceNumbers.length,
      campaignsStopped: activeCampaigns
    });

  } catch (error) {
    console.error('Switch area code error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add new marketplace (additional numbers for $24/month)
 */
router.post('/add-marketplace', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { areaCode } = req.body;

  if (!areaCode) {
    return res.status(400).json({ error: 'areaCode required' });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { brands: true }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Assume adding to the first brand, or need to specify brandId
    const brand = org.brands[0];
    if (!brand || !brand.twilioSubaccountSid) {
      return res.status(400).json({ error: 'No valid brand/subaccount found' });
    }

    const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
    const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
    const Twilio = require('twilio');
    const masterClient = Twilio(masterAccountSid, masterAuthToken);

    // Buy 12 additional numbers (mixed SMS/Voice)
    const availableNumbers = await masterClient.availablePhoneNumbers('US').local.list({
      areaCode: areaCode,
      limit: 12
    });

    const newNumbers = [];
    for (let i = 0; i < Math.min(12, availableNumbers.length); i++) {
      const number = await masterClient.incomingPhoneNumbers.create({
        phoneNumber: availableNumbers[i].phoneNumber,
        voiceApplicationSid: brand.twilioTwiMLAppSid
      });
      newNumbers.push({
        twilioSid: number.sid,
        phoneNumber: number.phoneNumber
      });
    }

    // Store new numbers
    for (const num of newNumbers) {
      await prisma.phoneNumber.create({
        data: {
          organizationId: orgId,
          brandId: brand.id,
          twilioSid: num.twilioSid,
          phoneNumber: num.phoneNumber,
          status: 'ACTIVE'
        }
      });
    }

    // Charge $24 for 12 numbers
    await prisma.organization.update({
      where: { id: orgId },
      data: { walletBalance: { decrement: 24.00 } }
    });

    await prisma.usage.create({
      data: {
        organizationId: orgId,
        type: 'ADDITIONAL_NUMBERS',
        cost: 24.00
      }
    });

    // Update marketplaces array
    const currentMarketplaces = org.marketplaces || [];
    if (!currentMarketplaces.includes(areaCode)) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { marketplaces: { push: areaCode } }
      });
    }

    res.json({
      success: true,
      areaCode,
      numbersAdded: newNumbers.length,
      cost: 24.00
    });

  } catch (error) {
    console.error('Add marketplace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add new subaccount
 */
router.post('/add-subaccount', async (req, res) => {
  const orgId = req.auth.organizationId;
  const businessInfo = req.body; // Same as business-info endpoint

  try {
    // Create new brand for subaccount
    const brand = await prisma.brand.create({
      data: {
        orgId,
        name: businessInfo.dbaName || `Subaccount-${Date.now()}`,
        callingMode: 'AI_VOICE',
        areaCode: businessInfo.areaCode || '212'
      }
    });

    // Update org business info if not set
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        legalName: businessInfo.legalName,
        dbaName: businessInfo.dbaName,
        businessType: businessInfo.businessType,
        ein: businessInfo.ein,
        address: businessInfo.address,
        city: businessInfo.city,
        state: businessInfo.state,
        zip: businessInfo.zip,
        country: businessInfo.country,
        website: businessInfo.website,
        contactName: businessInfo.contactName,
        contactEmail: businessInfo.contactEmail,
        contactPhone: businessInfo.contactPhone,
        businessDescription: businessInfo.description
      }
    });

    // Create subaccount and provision numbers
    const subaccountResult = await createTwilioSubaccount(orgId, brand.id);

    if (!subaccountResult.created) {
      // Clean up brand if failed
      await prisma.brand.delete({ where: { id: brand.id } });
      return res.status(500).json({ error: 'Failed to create subaccount: ' + subaccountResult.reason });
    }

    // Charge $39 for subaccount
    await prisma.organization.update({
      where: { id: orgId },
      data: { walletBalance: { decrement: 39.00 } }
    });

    await prisma.usage.create({
      data: {
        organizationId: orgId,
        type: 'ADDITIONAL_SUBACCOUNT',
        cost: 39.00
      }
    });

    res.json({
      success: true,
      brand: {
        id: brand.id,
        name: brand.name,
        subaccountSid: subaccountResult.subaccountSid,
        twimlAppSid: subaccountResult.twimlAppSid
      },
      cost: 39.00
    });

  } catch (error) {
    console.error('Add subaccount error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
