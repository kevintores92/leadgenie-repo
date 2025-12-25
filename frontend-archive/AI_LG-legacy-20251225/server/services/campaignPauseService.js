/**
 * Campaign Pause / Resume Service
 * Automatically pauses/resumes campaigns based on wallet and subscription status
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Pause all active campaigns for organization
 * Called when subscription is suspended or wallet is frozen/depleted
 */
async function pauseCampaigns(organizationId) {
  try {
    const result = await prisma.campaign.updateMany({
      where: {
        brand: { orgId: organizationId },
        status: "RUNNING",
      },
      data: {
        status: "PAUSED",
        pausedReason: "Subscription inactive or wallet insufficient",
      },
    });

    if (result.count > 0) {
      console.log(
        `[Campaigns] ✓ Paused ${result.count} campaigns for org: ${organizationId}`
      );
    }
  } catch (error) {
    console.error(
      `[Campaigns] Error pausing campaigns for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Resume campaigns if conditions are met
 * Only resumes if:
 * - Subscription is ACTIVE
 * - Wallet is NOT frozen
 * - Wallet has balance > 0
 */
async function resumeCampaignsIfEligible(
  organizationId
) {
  try {
    // Get wallet and subscription status
    const wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId },
    });

    const sub = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    // Check eligibility
    if (!wallet || !sub) {
      console.log(
        `[Campaigns] Wallet or subscription not found for org: ${organizationId}`
      );
      return;
    }

    if (sub.status !== "ACTIVE") {
      console.log(
        `[Campaigns] Subscription not ACTIVE (${sub.status}), not resuming`
      );
      return;
    }

    if (wallet.isFrozen) {
      console.log(`[Campaigns] Wallet frozen, not resuming`);
      return;
    }

    if (wallet.balanceCents <= 0) {
      console.log(`[Campaigns] Wallet balance insufficient, not resuming`);
      return;
    }

    // All conditions met - resume campaigns
    const result = await prisma.campaign.updateMany({
      where: {
        brand: { orgId: organizationId },
        status: "PAUSED",
        pausedReason: {
          in: [
            "Subscription inactive or wallet insufficient",
            "Subscription suspended",
            "Insufficient balance",
          ],
        },
      },
      data: {
        status: "RUNNING",
        pausedReason: null,
      },
    });

    if (result.count > 0) {
      console.log(
        `[Campaigns] ✓ Resumed ${result.count} campaigns for org: ${organizationId}`
      );
    }
  } catch (error) {
    console.error(
      `[Campaigns] Error resuming campaigns for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get campaign status
 */
async function getCampaignStatus(campaignId) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      pausedReason: true,
      name: true,
      brand: {
        select: {
          orgId: true,
        },
      },
    },
  });
}

module.exports = {
  pauseCampaigns,
  resumeCampaignsIfEligible,
  getCampaignStatus,
};