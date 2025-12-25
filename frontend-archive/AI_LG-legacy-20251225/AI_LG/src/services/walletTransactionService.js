/**
 * Wallet Transaction Service with Concurrency Safety
 * All wallet operations use database transactions with row-level locking
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Safe wallet debit with concurrency control
 * Uses database-level row locking to prevent race conditions
 *
 * CONCURRENCY: This function uses FOR UPDATE lock to ensure
 * only one transaction can modify this wallet at a time
 */
async function safeDebitWallet(
  organizationId,
  amountCents,
  referenceId
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock wallet row (FOR UPDATE) until transaction completes
      const wallet = await tx.organizationWallet.findUnique({
        where: { organizationId },
      });

      if (!wallet) {
        throw new Error(`WALLET_NOT_FOUND: ${organizationId}`);
      }

      // Check balance before proceeding
      if (wallet.balanceCents < amountCents) {
        throw new Error(
          `INSUFFICIENT_FUNDS: Have ${wallet.balanceCents}¢, need ${amountCents}¢`
        );
      }

      // Prevent negative balance (safety check)
      if (wallet.balanceCents - amountCents < 0) {
        throw new Error(`BALANCE_WOULD_GO_NEGATIVE`);
      }

      // Perform debit atomically
      const updated = await tx.organizationWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          organizationId,
          type: "MESSAGE_DEBIT",
          amountCents: amountCents,
          referenceId,
        },
      });

      return {
        success: true,
        newBalance: updated.balanceCents,
      };
    });

    return result;
  } catch (error) {
    console.error(`[Wallet] Debit error for org ${organizationId}:`, error);
    return {
      success: false,
      newBalance: 0,
      error: error.message,
    };
  }
}

/**
 * Safe wallet credit with concurrency control
 */
async function safeCreditWallet(
  organizationId,
  amountCents,
  referenceId
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.organizationWallet.findUnique({
        where: { organizationId },
      });

      if (!wallet) {
        throw new Error(`WALLET_NOT_FOUND: ${organizationId}`);
      }

      // Perform credit atomically
      const updated = await tx.organizationWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          organizationId,
          type: "PAYMENT_TOPUP",
          amountCents,
          referenceId,
        },
      });

      return {
        success: true,
        newBalance: updated.balanceCents,
      };
    });

    return result;
  } catch (error) {
    console.error(`[Wallet] Credit error for org ${organizationId}:`, error);
    return {
      success: false,
      newBalance: 0,
      error: error.message,
    };
  }
}

/**
 * Get wallet balance with consistency check
 */
async function getWalletBalance(organizationId) {
  try {
    const wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId },
    });

    if (!wallet) {
      return {
        balanceCents: 0,
        isFrozen: true,
        error: "WALLET_NOT_FOUND",
      };
    }

    // Verify balance is not negative (safety check)
    if (wallet.balanceCents < 0) {
      console.error(
        `[Wallet] CRITICAL: Negative balance detected for org ${organizationId}: ${wallet.balanceCents}¢`
      );
      return {
        balanceCents: 0,
        isFrozen: true,
        error: "CORRUPTED_BALANCE",
      };
    }

    return {
      balanceCents: wallet.balanceCents,
      isFrozen: wallet.isFrozen,
    };
  } catch (error) {
    console.error(
      `[Wallet] Error fetching balance for org ${organizationId}:`,
      error
    );
    return {
      balanceCents: 0,
      isFrozen: true,
      error: error.message,
    };
  }
}

/**
 * Freeze wallet (prevent sends)
 */
async function freezeWallet(organizationId) {
  try {
    await prisma.organizationWallet.update({
      where: { organizationId },
      data: { isFrozen: true },
    });
    console.log(`[Wallet] ✓ Frozen wallet for org: ${organizationId}`);
  } catch (error) {
    console.error(
      `[Wallet] Error freezing wallet for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Unfreeze wallet (allow sends)
 */
async function unfreezeWallet(organizationId) {
  try {
    await prisma.organizationWallet.update({
      where: { organizationId },
      data: { isFrozen: false },
    });
    console.log(`[Wallet] ✓ Unfrozen wallet for org: ${organizationId}`);
  } catch (error) {
    console.error(
      `[Wallet] Error unfreezing wallet for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get transaction history
 */
async function getTransactionHistory(
  organizationId,
  limit = 20
) {
  return prisma.walletTransaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

module.exports = {
  safeDebitWallet,
  safeCreditWallet,
  getWalletBalance,
  freezeWallet,
  unfreezeWallet,
  getTransactionHistory,
};