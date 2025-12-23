const { PrismaClient } = require('@prisma/client');

const BRAND_ID = process.env.BRAND_ID || 'cmjinzcyc0004ysu2s7pecgdn';
const NEW_NAME = process.env.NEW_NAME || 'Task VA';

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log(`Updating brand ${BRAND_ID} -> name="${NEW_NAME}"`);
    const updated = await prisma.brand.update({
      where: { id: BRAND_ID },
      data: { name: NEW_NAME },
    });
    console.log('Updated brand:', updated);
    process.exit(0);
  } catch (err) {
    console.error('Failed to update brand:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
