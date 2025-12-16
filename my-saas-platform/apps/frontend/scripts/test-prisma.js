const { PrismaClient } = require('@prisma/client');
(async () => {
  const db = new PrismaClient();
  try {
    const rows = await db.contact.findMany({ take: 3 });
    console.log('OK - contact rows:', rows.length);
    console.log(rows.map(r => ({ id: r.id, phone: r.phone, phoneNumber: r.phoneNumber })));
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
