const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  try {
    console.log('Dropping public schema and recreating (CASCADE) ...');
    await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    console.log('Schema reset complete.');
  } catch (e) {
    console.error('Error resetting schema:', e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
