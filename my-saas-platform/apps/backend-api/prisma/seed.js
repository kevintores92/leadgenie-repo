const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...');
  console.log('Creating Demo Org...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Org',
    },
  });

  // Create sending numbers (idempotent)
  const numbers = ['+15551234567', '+15557654321'];
  await prisma.sendingNumber.createMany({
    data: numbers.map((n) => ({ organizationId: org.id, phoneNumber: n, label: `Demo ${n}`, enabled: true })),
    skipDuplicates: true,
  });

  // Create contacts
  const contacts = [];
  for (let i = 1; i <= 10; i++) {
    contacts.push({
      firstName: `Lead${i}`,
      lastName: 'Test',
      phone: `+1555000${100 + i}`,
      propertyAddress: `${i} Demo St`,
      brandId: undefined,
      organizationId: org.id,
    });
  }

  for (const c of contacts) {
    // avoid duplicates when rerunning seed
    const existing = await prisma.contact.findFirst({ where: { phone: c.phone } });
    if (existing) continue;
    await prisma.contact.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        propertyAddress: c.propertyAddress,
        // connect the contact to the organization via nested connect (works regardless of scalar FK exposure)
        organization: { connect: { id: org.id } },
        // brandId is required by schema; create a temporary brand if none exists
        brand: {
          create: { name: `Demo Brand for ${org.name}`, callingMode: 'sms', organization: { connect: { id: org.id } } },
        },
      },
    });
  }

  // Create a sample campaign (attach to the first brand)
  const brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
  if (brand) {
    await prisma.campaign.create({
      data: {
        brandId: brand.id,
        name: 'Demo Campaign',
        callingMode: 'sms',
        status: 'DRAFT',
        templatePrimary: 'Hi {firstName}, about {propertyAddress}... Please reply to learn more.',
        templateAlternate: 'Hello, we have info for you.',
        batchSize: 50,
        intervalMinutes: 30,
      },
    });
  }

  console.log('Seeding complete.');
  console.log('Org:', org.id);
  if (brand) console.log('Brand:', brand.id);
  const oneCampaign = await prisma.campaign.findFirst({ where: { brandId: brand ? brand.id : undefined } });
  if (oneCampaign) console.log('Campaign:', oneCampaign.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { main };
