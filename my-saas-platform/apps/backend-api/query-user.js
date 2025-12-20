#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Attempting to query database...');
  
  try {
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    console.log('✅ Database connection successful');
    console.log('Total users:', result[0]?.count || 0);
    
    // Now try to find our specific user
    const user = await prisma.user.findFirst({
      where: {
        email: 'kmvirtualreassist@gmail.com'
      }
    });
    
    if (user) {
      console.log('\n✅ User FOUND:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('\n❌ User NOT found');
      console.log('\nThis means the signup failed or the email was different.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
