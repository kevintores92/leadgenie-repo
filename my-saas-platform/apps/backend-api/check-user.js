const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Checking for user: kmvirtualreassist@gmail.com...\n');
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'kmvirtualreassist@gmail.com' },
          { username: 'kmvirtualreassist@gmail.com' }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log('✅ User FOUND in database:');
      console.log('   ID:', user.id);
      console.log('   Username:', user.username);
      console.log('   Email:', user.email);
      console.log('   Created:', user.createdAt);
      
      // Also check for upload jobs for this user
      console.log('\n📤 Checking for upload jobs...');
      const uploadJobs = await prisma.uploadJob.findMany({
        where: {
          // Assuming there's a userId or organizationId we can filter by
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      if (uploadJobs.length > 0) {
        console.log(`✅ Found ${uploadJobs.length} upload job(s):`);
        uploadJobs.forEach((job, i) => {
          console.log(`\n   Job ${i+1}:`);
          console.log(`   - ID: ${job.id}`);
          console.log(`   - File: ${job.originalFilename}`);
          console.log(`   - Status: ${job.status}`);
          console.log(`   - Total rows: ${job.totalRows}`);
          console.log(`   - Mobile: ${job.mobileCount}, Landline: ${job.landlineCount}`);
          console.log(`   - Created: ${job.createdAt}`);
          if (job.errorMessage) {
            console.log(`   - Error: ${job.errorMessage}`);
          }
        });
      } else {
        console.log('❌ No upload jobs found');
      }
    } else {
      console.log('❌ User NOT found in database');
      console.log('\nThis means the signup may have failed.');
      console.log('Check the signup logs for errors.');
    }
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
