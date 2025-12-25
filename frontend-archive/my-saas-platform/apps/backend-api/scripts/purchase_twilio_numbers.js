const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  try {
    const BRAND_ID = process.env.BRAND_ID;
    const AREA_CODE = process.env.AREA_CODE || '614'; // Columbus default
    const COUNT = parseInt(process.env.COUNT || '3', 10);
    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

    if (!BRAND_ID) {
      console.error('Missing BRAND_ID');
      process.exit(1);
    }
    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      console.error('Missing Twilio creds: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      process.exit(1);
    }

    const brand = await prisma.brand.findUnique({ where: { id: BRAND_ID } });
    if (!brand) {
      console.error('Brand not found:', BRAND_ID);
      process.exit(1);
    }

    const orgId = brand.orgId;
    console.log('Buying', COUNT, 'numbers for brand', BRAND_ID, 'org', orgId, 'areaCode', AREA_CODE);

    const Twilio = require('twilio');
    const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

    const avail = await client.availablePhoneNumbers('US').local.list({ areaCode: AREA_CODE, limit: COUNT * 3 });
    if (!avail || avail.length === 0) {
      console.error('No available numbers returned by Twilio for area code', AREA_CODE);
      process.exit(1);
    }

    const toBuy = avail.slice(0, COUNT);
    for (const candidate of toBuy) {
      try {
        const purchased = await client.incomingPhoneNumbers.create({ phoneNumber: candidate.phoneNumber });
        await prisma.sendingNumber.create({ data: { organizationId: orgId, phoneNumber: purchased.phoneNumber, label: `columbus-${AREA_CODE}` } });
        console.log('Purchased and stored', purchased.phoneNumber);
      } catch (e) {
        console.error('Failed to purchase', candidate.phoneNumber, e && e.message);
      }
    }

    console.log('Done.');
  } catch (e) {
    console.error('Error', e && e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
