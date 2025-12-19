/**
 * GET /api/billing/wallet-summary
 * Fetch wallet balance, subscription status, and frozen state
 * 
 * Returns wallet data for UI display
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getSession({ req });

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user?.organization) {
      return res.status(404).json({ error: "No organization found" });
    }

    const orgId = user.organization.id;

    // Fetch wallet
    const wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId: orgId },
    });

    // Fetch subscription
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId: orgId },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Calculate next renewal date
    const nextRenewal = subscription?.currentPeriodEnd?.toISOString() || null;

    // Build response
    const response = {
      balanceCents: wallet.balanceCents,
      balanceUSD: (wallet.balanceCents / 100).toFixed(2),
      isFrozen: wallet.isFrozen,
      subscriptionStatus: subscription?.status || "INACTIVE",
      nextRenewal,
      provider: subscription?.provider || null,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("[Wallet Summary API] Error:", error);
    return res.status(500).json({ error: "Failed to fetch wallet summary" });
  }
}
