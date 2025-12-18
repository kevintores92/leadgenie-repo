const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CSV is located at the my-saas-platform root
const CSV_PATH = path.resolve(__dirname, '..', '..', '..', 'Property Export High+Equity-contact-append.csv');

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = ('' + raw).replace(/[^0-9]/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.startsWith('+')) return raw;
  return raw;
}

async function importCsv() {
  console.log('Importing contacts from CSV:', CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found at', CSV_PATH);
    return;
  }

  const parser = fs.createReadStream(CSV_PATH).pipe(parse({ columns: true, relax_quotes: true }));

  let rowCount = 0;
  for await (const record of parser) {
    rowCount++;
    const phone = normalizePhone(record['Mobile Phone'] || record['Mobile'] || record['MobilePhone'] || record['Phone']);
    if (!phone) continue; // skip rows without phone

    const firstName = (record['Owner 1 First Name'] || record['First Name'] || '').trim();
    const lastName = (record['Owner 1 Last Name'] || record['Last Name'] || '').trim();
    const propertyAddress = (record['Address'] || '').trim();
    const propertyCity = (record['City'] || '').trim();
    const propertyState = (record['State'] || '').trim();
    const propertyZip = (record['Zip'] || '').trim();
    const propertyCounty = (record['County'] || '').trim();
    const mailingAddress = (record['Mailing Address'] || '').trim();

    // For now, assign to a default Demo Org/Brand if none exist; create or reuse
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({ data: { name: 'Imported Contacts Org' } });
    }

    // Ensure a brand exists for the organization
    let brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { orgId: org.id, name: 'Imported Brand', callingMode: 'sms' } });
    }

    // Skip duplicates by brand+phone
    const exists = await prisma.contact.findFirst({ where: { brandId: brand.id, phone } });
    if (exists) continue;

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        brand: { connect: { id: brand.id } },
        organization: { connect: { id: org.id } },
        firstName: firstName || '',
        lastName: lastName || '',
        phone,
        propertyAddress,
        propertyCity,
        propertyState,
        propertyZip,
        propertyCounty,
        mailingAddress,
      },
    });

    // If Owner 2 fields exist, store them as ContactCustomField(s)
    const owner2First = (record['Owner 2 First Name'] || '').trim();
    const owner2Last = (record['Owner 2 Last Name'] || '').trim();
    if (owner2First || owner2Last) {
      // Ensure custom field definitions exist
      let firstDef = await prisma.customFieldDefinition.findFirst({ where: { brandId: brand.id, name: 'owner2_first' } });
      if (!firstDef) firstDef = await prisma.customFieldDefinition.create({ data: { brand: { connect: { id: brand.id } }, name: 'owner2_first', type: 'string' } });

      let lastDef = await prisma.customFieldDefinition.findFirst({ where: { brandId: brand.id, name: 'owner2_last' } });
      if (!lastDef) lastDef = await prisma.customFieldDefinition.create({ data: { brand: { connect: { id: brand.id } }, name: 'owner2_last', type: 'string' } });

      if (owner2First) {
        await prisma.contactCustomField.create({ data: { contact: { connect: { id: contact.id } }, fieldDefinition: { connect: { id: firstDef.id } }, value: owner2First } });
      }
      if (owner2Last) {
        await prisma.contactCustomField.create({ data: { contact: { connect: { id: contact.id } }, fieldDefinition: { connect: { id: lastDef.id } }, value: owner2Last } });
      }
    }
  }

  console.log('Imported rows:', rowCount);
}

async function main() {
  try {
    await importCsv();
    console.log('Seeding/import complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) main();

module.exports = { main };
