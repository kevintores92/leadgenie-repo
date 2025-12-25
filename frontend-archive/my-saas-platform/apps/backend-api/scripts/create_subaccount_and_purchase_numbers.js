const { PrismaClient } = require('@prisma/client');

/**
 * Creates a Twilio subaccount (using master creds), then purchases numbers under that subaccount,
 * attaches voice/sms webhook URLs (TwiML) and saves them to SendingNumber.
 *
 * Env vars required:
 *  - BRAND_ID (db brand id)
 *  - TWILIO_MASTER_ACCOUNT_SID
 *  - TWILIO_MASTER_AUTH_TOKEN
 *  - AREA_CODE (e.g., 614)
 *  - COUNT (number of phones to buy)
 *  - VOICE_URL (TwiML endpoint to set as voiceUrl)
 *  - SMS_URL (optional sms webhook)
 */

async function run() {
  const prisma = new PrismaClient();
  try {
    const BRAND_ID = process.env.BRAND_ID;
    const AREA_CODE = process.env.AREA_CODE || '614';
    const COUNT = parseInt(process.env.COUNT || '3', 10);
    const MASTER_SID = process.env.TWILIO_MASTER_ACCOUNT_SID;
    const MASTER_AUTH = process.env.TWILIO_MASTER_AUTH_TOKEN;
    const VOICE_URL = process.env.VOICE_URL; // required to set TwiML
    const SMS_URL = process.env.SMS_URL || null;

    if (!BRAND_ID) throw new Error('BRAND_ID is required');
    if (!MASTER_SID || !MASTER_AUTH) throw new Error('TWILIO_MASTER_ACCOUNT_SID and TWILIO_MASTER_AUTH_TOKEN are required');
    if (!VOICE_URL) throw new Error('VOICE_URL is required (the TwiML webhook)');

    const brand = await prisma.brand.findUnique({ where: { id: BRAND_ID } });
    if (!brand) throw new Error('Brand not found: ' + BRAND_ID);

    const Twilio = require('twilio');
    const masterClient = Twilio(MASTER_SID, MASTER_AUTH);

    console.log('Creating Twilio subaccount for brand', BRAND_ID);
    const acct = await masterClient.api.accounts.create({ friendlyName: `LeadGenie-${BRAND_ID}` });
    const subSid = acct && acct.sid;
    // Some Twilio responses include authToken, some do not. Try to read both possibilities.
    const subAuth = acct && (acct.authToken || acct.auth_token) || null;

    if (!subSid) throw new Error('Twilio did not return a subaccount SID');

    // Update brand record with subaccount info
    await prisma.brand.update({ where: { id: BRAND_ID }, data: { twilioSubaccountSid: subSid, subaccountAuthToken: subAuth } });
    console.log('Subaccount created:', subSid, 'auth token present?', Boolean(subAuth));

    // Use subaccount credentials to purchase numbers. If Twilio didn't provide an auth token,
    // we fall back to using master creds but specifying accountSid when purchasing (Twilio supports using master to create resources under subaccount via /Accounts/{SubSid}/IncomingPhoneNumbers?)
    let purchaseClient;
    if (subAuth) {
      purchaseClient = Twilio(subSid, subAuth);
    } else {
      // create a client that targets the subaccount via the master credentials
      purchaseClient = masterClient; // we'll include accountSid when creating numbers
    }

    console.log('Searching available numbers for area code', AREA_CODE);
    const avail = await masterClient.availablePhoneNumbers('US').local.list({ areaCode: AREA_CODE, limit: COUNT * 5 });
    if (!avail || avail.length === 0) throw new Error('No available numbers in Twilio for area code ' + AREA_CODE);

    const candidates = avail.slice(0, COUNT);
    for (const c of candidates) {
      try {
        // If using master client without subAuth, create the number under the subaccount by using the REST path
        let purchased;
        if (subAuth) {
          purchased = await purchaseClient.incomingPhoneNumbers.create({ phoneNumber: c.phoneNumber, voiceUrl: VOICE_URL, smsUrl: SMS_URL });
        } else {
          // Using master client to create resource under subaccount
          purchased = await masterClient.api.accounts(subSid).incomingPhoneNumbers.create({ phoneNumber: c.phoneNumber, voiceUrl: VOICE_URL, smsUrl: SMS_URL });
        }

        // Save to SendingNumber table (organizationId from brand)
        await prisma.sendingNumber.create({ data: { organizationId: brand.orgId, phoneNumber: purchased.phoneNumber, label: `columbus-${AREA_CODE}` } });

        console.log('Purchased', purchased.phoneNumber, 'sid=', purchased.sid);
      } catch (e) {
        console.error('Failed to purchase candidate', c.phoneNumber, e && e.message);
      }
    }

    console.log('Completed purchases.');
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
