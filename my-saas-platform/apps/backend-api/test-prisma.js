const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  console.log('Testing Prisma connection...');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');

    // Try a simple query
    const count = await prisma.organization.count();
    console.log(`✅ Found ${count} organizations`);

    await prisma.$disconnect();
    console.log('✅ Prisma disconnected successfully');
  } catch (error) {
    console.error('❌ Prisma error:', error);
  }
}

testPrisma();