const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function parseCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // remove non-digits and leading +
  const plus = s.startsWith('+');
  s = s.replace(/[^0-9]/g, '');
  if (plus) s = '+' + s;
  // if digits only
  if (!s.startsWith('+')) {
    if (s.length === 10) return '+1' + s;
    if (s.length === 11 && s.startsWith('1')) return '+' + s;
    // fallback to digits-only string
    return s;
  }
  return s;
}

async function main() {
  const csvPath = process.argv[2] || path.resolve(__dirname, '../../../Property Export High+Equity-contact-append-1-phone-by-linetype.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at', csvPath);
    process.exit(1);
  }

  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);

  // helper to find column index by name
  function idx(name) {
    const i = header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
    return i;
  }

  const firstNameIdx = idx('First Name');
  const lastNameIdx = idx('Last Name');
  const addressIdx = idx('Address');
  const cityIdx = idx('City');
  const stateIdx = idx('State');
  const zipIdx = idx('Zip');

  const mobileCols = [];
  const landlineCols = [];
  for (let c = 0; c < header.length; c++) {
    const h = header[c].trim();
    if (/^Mobile Phone/i.test(h)) mobileCols.push(c);
    if (/^Landline Phone/i.test(h)) landlineCols.push(c);
  }

  const prisma = new PrismaClient();
  await prisma.$connect();

  // find organization
  const orgName = 'Veracity Home Buyers';
  let org = await prisma.organization.findFirst({ where: { name: orgName } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: orgName, walletBalance: 0 } });
    console.log('Created organization', org.id);
  }

  // find or create wallet
  let wallet = await prisma.organizationWallet.findUnique({ where: { organizationId: org.id } });
  if (!wallet) {
    wallet = await prisma.organizationWallet.create({ data: { organizationId: org.id, balanceCents: 0 } });
    console.log('Created wallet for org');
  }

  // find or create brand for this org
  let brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
  if (!brand) {
    brand = await prisma.brand.create({ data: { orgId: org.id, name: `${org.name} Default Brand`, callingMode: 'COLD' } });
    console.log('Created brand', brand.id);
  }

  const validatedRows = [];
  let mobileCount = 0;
  let landlineCount = 0;

  // process each data row
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const firstName = cols[firstNameIdx] || '';
    const lastName = cols[lastNameIdx] || '';
    const address = cols[addressIdx] || '';
    const city = cols[cityIdx] || '';
    const state = cols[stateIdx] || '';
    const zip = cols[zipIdx] || '';

    // mobiles
    for (const c of mobileCols) {
      const raw = cols[c];
      const phone = normalizePhone(raw);
      if (!phone) continue;
      mobileCount++;
      validatedRows.push({ firstName, lastName, phone, phoneType: 'mobile', propertyAddress: address, propertyCity: city, propertyState: state, propertyZip: zip });
    }

    // landlines
    for (const c of landlineCols) {
      const raw = cols[c];
      const phone = normalizePhone(raw);
      if (!phone) continue;
      landlineCount++;
      validatedRows.push({ firstName, lastName, phone, phoneType: 'landline', propertyAddress: address, propertyCity: city, propertyState: state, propertyZip: zip });
    }
    if (i % 500 === 0) {
      console.log(`Processed ${i} rows — mobiles: ${mobileCount}, landlines: ${landlineCount}`);
    }
  }

  const totalRows = lines.length - 1;

  // create validated list
  const validatedList = await prisma.validatedList.create({
    data: {
      organizationId: org.id,
      fileName: path.basename(csvPath),
      totalRows,
      verifiedMobile: mobileCount,
      verifiedLandline: landlineCount,
      validatedData: JSON.stringify(validatedRows)
    }
  });

  // create upload job
  await prisma.uploadJob.create({
    data: {
      organizationId: org.id,
      originalFilename: path.basename(csvPath),
      totalRows,
      mobileCount,
      landlineCount,
      status: 'COMPLETED'
    }
  });

  // create or upsert contacts (avoid duplicates by brand + phone)
  let createdContacts = 0;
  for (const r of validatedRows) {
    try {
      const existing = await prisma.contact.findFirst({ where: { brandId: brand.id, phone: r.phone } });
      if (existing) continue;
      await prisma.contact.create({ data: {
        brandId: brand.id,
        organizationId: org.id,
        firstName: r.firstName || 'Unknown',
        lastName: r.lastName || undefined,
        phone: r.phone,
        phoneType: r.phoneType,
        propertyAddress: r.propertyAddress || undefined,
        propertyCity: r.propertyCity || undefined,
        propertyState: r.propertyState || undefined,
        propertyZip: r.propertyZip || undefined,
        isPhoneValid: true
      }});
      createdContacts++;
    } catch (err) {
      console.warn('contact create failed', r.phone, err.message);
    }
  }

  // create campaign and mark running
  const campaign = await prisma.campaign.create({ data: {
    brandId: brand.id,
    name: `Cold Calling - ${path.basename(csvPath)}`,
    callingMode: 'COLD',
    status: 'RUNNING',
    batchSize: 50
  }});

  // charge $5 (500 cents) for starting the campaign
  const chargeCents = 500;
  // refresh wallet
  wallet = await prisma.organizationWallet.findUnique({ where: { organizationId: org.id } });
  const newBalance = (wallet.balanceCents || 0) - chargeCents;
  await prisma.organizationWallet.update({ where: { organizationId: org.id }, data: { balanceCents: newBalance } });
  await prisma.walletTransaction.create({ data: {
    walletId: wallet.id,
    organizationId: org.id,
    type: 'MESSAGE_DEBIT',
    amountCents: chargeCents,
    referenceId: campaign.id
  }});

  console.log('Import complete: ' + createdContacts + ' new contacts created.');
  console.log('Verified mobile:', mobileCount, 'landline:', landlineCount);
  console.log('ValidatedList id:', validatedList.id);
  console.log('Campaign started id:', campaign.id);
  console.log('Wallet new balance (cents):', newBalance);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
