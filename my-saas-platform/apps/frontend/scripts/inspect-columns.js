const { PrismaClient } = require('@prisma/client');
(async () => {
  const db = new PrismaClient();
  try {
    const cols = await db.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name ILIKE 'contact' ORDER BY table_name, ordinal_position`;
    console.log('Columns:', cols.map(c => ({ table: c.table_name, column: c.column_name })));
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
