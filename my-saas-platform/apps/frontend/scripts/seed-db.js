const path = require('path');
const fs = require('fs');
const prisma = require('../node_modules/@prisma/client').PrismaClient ? new (require('../node_modules/@prisma/client').PrismaClient)() : null;

async function run() {
  if (!prisma) {
    console.error('Prisma client not available in this package. Run `npx prisma generate` first.');
    process.exit(1);
  }

  const dataFile = path.resolve(__dirname, '../data/contacts.json');
  if (!fs.existsSync(dataFile)) {
    console.error('No contacts file at', dataFile);
    process.exit(1);
  }

  const contacts = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const mapped = contacts.map(c => ({ firstName: c.firstName, lastName: c.lastName || null, phone: c.phone || null, email: c.email || null, tags: c.tags || [] }));
  try {
    const res = await prisma.contact.createMany({ data: mapped, skipDuplicates: true });
    console.log('Inserted contacts count:', res.count || mapped.length);
  } catch (e) {
    console.error('DB insert error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
