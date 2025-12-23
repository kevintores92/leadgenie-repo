const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function run() {
  const prisma = new PrismaClient();
  try {
    // Read required fields from environment variables
    const EMAIL = process.env.SUB_EMAIL;
    const PASSWORD = process.env.SUB_PASSWORD;
    const LEGAL_NAME = process.env.SUB_LEGAL_NAME;
    const DBA = process.env.SUB_DBA || null;
    const BUSINESS_TYPE = process.env.SUB_BUSINESS_TYPE || null;
    const EIN = process.env.SUB_EIN || null;
    const ADDRESS = process.env.SUB_ADDRESS || null;
    const COUNTRY = process.env.SUB_COUNTRY || 'United States';
    const WEBSITE = process.env.SUB_WEBSITE || null;
    const CONTACT_NAME = process.env.SUB_CONTACT_NAME || null;
    const CONTACT_EMAIL = process.env.SUB_CONTACT_EMAIL || null;
    const CONTACT_PHONE = process.env.SUB_CONTACT_PHONE || null;

    if (!EMAIL || !PASSWORD || !LEGAL_NAME) {
      console.error('Missing required env vars. Set SUB_EMAIL, SUB_PASSWORD, and SUB_LEGAL_NAME');
      process.exit(1);
    }

    const username = EMAIL.split('@')[0];
    const passwordHash = await bcrypt.hash(String(PASSWORD), 10);

    console.log('Creating organization...');
    const org = await prisma.organization.create({
      data: {
        name: LEGAL_NAME,
        legalName: LEGAL_NAME,
        dbaName: DBA,
        businessType: BUSINESS_TYPE,
        ein: EIN,
        address: ADDRESS,
        country: COUNTRY,
        website: WEBSITE,
        contactName: CONTACT_NAME,
        contactEmail: CONTACT_EMAIL,
        contactPhone: CONTACT_PHONE,
      }
    });

    console.log('Creating user...');
    const user = await prisma.user.create({
      data: {
        username,
        email: EMAIL,
        passwordHash,
        orgId: org.id,
      }
    });

    console.log('Creating default brand...');
    const brand = await prisma.brand.create({
      data: {
        orgId: org.id,
        name: DBA || `${LEGAL_NAME} Brand`,
        callingMode: 'SMS',
      }
    });

    console.log('Creating organization wallet...');
    await prisma.organizationWallet.create({ data: { organizationId: org.id, balanceCents: 0, isFrozen: false } });

    // Set user's active brand
    await prisma.user.update({ where: { id: user.id }, data: { activeBrandId: brand.id } });

    // Optionally create a subscription record so the org is marked subscribed
    const DO_SUBSCRIBE = process.env.SUB_SUBSCRIBE === '1' || Boolean(process.env.SUB_PROVIDER_SUB_ID);
    if (DO_SUBSCRIBE) {
      try {
        const provider = (process.env.SUB_PROVIDER || 'PAYPAL').toUpperCase() === 'STRIPE' ? 'STRIPE' : 'PAYPAL';
        const providerSubId = process.env.SUB_PROVIDER_SUB_ID || `manual-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const planId = process.env.SUB_PLAN_ID || 'monthly';
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await prisma.organizationSubscription.create({
          data: {
            organizationId: org.id,
            provider,
            providerSubId,
            planId,
            status: 'ACTIVE',
            currentPeriodEnd: periodEnd,
          }
        });
        console.log('OrganizationSubscription created:', provider, providerSubId, planId);
      } catch (e) {
        console.warn('Failed to create OrganizationSubscription:', e && e.message);
      }
    }

    // Optionally create Twilio subaccount if master creds are present
    const TW_MASTER_SID = process.env.TWILIO_MASTER_ACCOUNT_SID;
    const TW_MASTER_AUTH = process.env.TWILIO_MASTER_AUTH_TOKEN;
    if (TW_MASTER_SID && TW_MASTER_AUTH) {
      try {
        console.log('Creating Twilio subaccount (master creds found)...');
        const Twilio = require('twilio');
        const client = Twilio(TW_MASTER_SID, TW_MASTER_AUTH);
        const acct = await client.api.accounts.create({ friendlyName: `LeadGenie-${org.id}` });
        const subSid = acct && acct.sid;
        const subAuth = acct && (acct.authToken || acct.auth_token) || null;
        if (subSid) {
          await prisma.brand.update({ where: { id: brand.id }, data: { twilioSubaccountSid: subSid, subaccountAuthToken: subAuth } });
          console.log('Twilio subaccount created:', subSid);
        } else {
          console.warn('Twilio subaccount creation did not return a SID');
        }
      } catch (e) {
        console.warn('Twilio subaccount creation failed:', e && e.message);
      }
    } else {
      console.log('Twilio master creds not present; skipping subaccount creation.');
    }

    console.log('Done. Created org, user, brand. Summary:');
    console.log({ orgId: org.id, userId: user.id, brandId: brand.id, username, email: EMAIL });
  } catch (e) {
    console.error('Error creating subscriber:', e && e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
