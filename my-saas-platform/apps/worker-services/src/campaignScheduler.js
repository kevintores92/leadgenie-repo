const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScheduledCampaigns() {
  console.log('[Campaign Scheduler] Checking for scheduled campaigns...');

  try {
    const now = new Date();

    // Find campaigns that are scheduled and due to start
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledStart: {
          lte: now
        }
      },
      include: {
        brand: true
      }
    });

    console.log(`[Campaign Scheduler] Found ${dueCampaigns.length} campaigns due to start`);

    for (const campaign of dueCampaigns) {
      try {
        console.log(`[Campaign Scheduler] Starting campaign: ${campaign.name} (${campaign.id})`);

        // Import the enqueue function
        const { enqueueCampaign } = require('./campaignSender');

        // Start the campaign
        await enqueueCampaign(
          campaign.brand.orgId,
          campaign.id,
          campaign.batchSize || 50,
          campaign.intervalMinutes || 30
        );

        // Update campaign status
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'RUNNING' }
        });

        console.log(`[Campaign Scheduler] Successfully started campaign: ${campaign.name}`);

      } catch (error) {
        console.error(`[Campaign Scheduler] Failed to start campaign ${campaign.id}:`, error);
      }
    }

  } catch (error) {
    console.error('[Campaign Scheduler] Error checking scheduled campaigns:', error);
  }
}

// Export for use in other modules
module.exports = {
  checkScheduledCampaigns
};

// If run directly, execute once
if (require.main === module) {
  checkScheduledCampaigns()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Campaign scheduler failed:', error);
      process.exit(1);
    });
}