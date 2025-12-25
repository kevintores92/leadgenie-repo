const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log('Total users in database:', count);
    
    const user = await prisma.user.findFirst({
      where: { email: 'kmvirtualreassist@gmail.com' }
    });
    
    if (user) {
      console.log('✅ User FOUND:', JSON.stringify(user, null, 2));
    } else {
      console.log('❌ User NOT FOUND with email kmvirtualreassist@gmail.com');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
