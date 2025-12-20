const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function verifyDatabase() {
  const output = [];
  const prisma = new PrismaClient();
  
  output.push('=== DATABASE VERIFICATION ===\n');
  
  try {
    // Check user count
    const userCount = await prisma.user.count();
    output.push(`Total Users: ${userCount}`);
    
    // Check for our specific user
    const user = await prisma.user.findFirst({
      where: { email: 'kmvirtualreassist@gmail.com' }
    });
    
    if (user) {
      output.push('\n✅ USER FOUND:');
      output.push(`  ID: ${user.id}`);
      output.push(`  Username: ${user.username}`);
      output.push(`  Email: ${user.email}`);
      output.push(`  Organization: ${user.orgId}`);
      output.push(`  Created: ${user.createdAt}`);
    } else {
      output.push('\n❌ USER NOT FOUND with email kmvirtualreassist@gmail.com');
    }
    
    // Check upload jobs
    if (prisma.uploadJob && typeof prisma.uploadJob.count === 'function') {
      const jobCount = await prisma.uploadJob.count();
      output.push(`\n\nTotal Upload Jobs: ${jobCount}`);
    
      if (jobCount > 0) {
        const recentJobs = await prisma.uploadJob.findMany({
          orderBy: { createdAt: 'desc' },
          take: 3
        });

        output.push('\nRecent Jobs:');
        recentJobs.forEach((job, i) => {
          output.push(`\n  Job ${i+1}:`);
          output.push(`  - ID: ${job.id}`);
          output.push(`  - File: ${job.originalFilename}`);
          output.push(`  - Status: ${job.status}`);
          output.push(`  - Rows: ${job.totalRows} (Mobile: ${job.mobileCount}, Landline: ${job.landlineCount})`);
          if (job.errorMessage) {
            output.push(`  - Error: ${job.errorMessage}`);
          }
        });
      }
    } else {
      output.push('\n\nUploadJob model not available in Prisma client (run `npx prisma generate`).');
    }
    
    // Check organization count
    const orgCount = await prisma.organization.count();
    output.push(`\n\nTotal Organizations: ${orgCount}`);
    
  } catch (error) {
    output.push(`\n❌ ERROR: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
  
  const result = output.join('\n');
  fs.writeFileSync('db-verification.log', result);
  console.log(result);
}

verifyDatabase().catch(console.error);
