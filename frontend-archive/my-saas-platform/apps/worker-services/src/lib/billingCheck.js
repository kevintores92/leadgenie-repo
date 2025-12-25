/**
 * Billing Check Utility for Message Sending
 * Used by worker services to verify subscription and wallet before sending
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Check if organization can send messages and estimate cost
 * Returns { canSend, reason, estimatedCostCents }
 */
async function checkBillingBeforeSend(organizationId, twilioEstimatedCostUsd) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
        wallet: true,
      },
    });

    if (!org) {
      return {
        canSend: false,
        reason: 'Organization not found',
        estimatedCostCents: 0,
      };
    }

    // Check subscription
    if (!org.subscription) {
      return {
        canSend: false,
        reason: 'No subscription found',
        estimatedCostCents: 0,
      };
    }

    if (org.subscription.status !== 'ACTIVE') {
      return {
        canSend: false,
        reason: `Subscription is ${org.subscription.status}`,
        estimatedCostCents: 0,
      };
    }

    // Check wallet
    const wallet = org.wallet || (await getOrCreateWallet(organizationId));

    if (wallet.isFrozen) {
      return {
        canSend: false,
        reason: 'Wallet is frozen due to non-payment',
        estimatedCostCents: 0,
      };
    }

    // Calculate estimated cost with markup
    const estimatedCostCents = calculateCostWithMarkup(
      twilioEstimatedCostUsd,
      org.pricingMarkupPercent || 30
    );

    if (wallet.balanceCents < estimatedCostCents) {
      return {
        canSend: false,
        reason: `Insufficient wallet balance. Need ${estimatedCostCents}¢, have ${wallet.balanceCents}¢`,
        estimatedCostCents,
      };
    }

    return {
      canSend: true,
      reason: null,
      estimatedCostCents,
    };
  } catch (error) {
    console.error('Error checking billing:', error);
    return {
      canSend: false,
      reason: 'Billing check failed',
      estimatedCostCents: 0,
    };
  }
}

/**
 * Calculate cost with markup
 */
function calculateCostWithMarkup(usdAmount, markupPercent) {
  const cents = Math.round(usdAmount * 100);
  const markup = Math.round((cents * markupPercent) / 100);
  return cents + markup;
}

/**
 * Get or create wallet
 */
async function getOrCreateWallet(organizationId) {
  let wallet = await prisma.organizationWallet.findUnique({
    where: { organizationId },
  });

  if (!wallet) {
    wallet = await prisma.organizationWallet.create({
      data: {
        organizationId,
        balanceCents: 0,
        isFrozen: false,
      },
    });
  }

  return wallet;
}

/**
 * Debit wallet after successful send
 */
async function debitWalletForMessage(organizationId, amountCents, messageId) {
  try {
    const wallet = await getOrCreateWallet(organizationId);

    if (wallet.balanceCents < amountCents) {
      console.error(
        `Insufficient balance for debit: ${wallet.balanceCents}¢ < ${amountCents}¢`
      );
      return false;
    }

    await prisma.organizationWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: {
          decrement: amountCents,
        },
      },
    });

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        organizationId,
        type: 'MESSAGE_DEBIT',
        amountCents: -amountCents,
        referenceId: messageId,
      },
    });

    return true;
  } catch (error) {
    console.error('Error debiting wallet:', error);
    return false;
  }
}

module.exports = {
  checkBillingBeforeSend,
  debitWalletForMessage,
  calculateCostWithMarkup,
};
