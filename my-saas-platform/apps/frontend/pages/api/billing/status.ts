/**
 * GET /api/billing/status
 * Get wallet and subscription status for current organization
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/prisma'
import { BillingService } from '../../../services/billingService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getSession({ req })

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    })

    if (!user?.organization) {
      return res.status(404).json({ error: 'No organization found' })
    }

    const orgId = user.organization.id

    // Get wallet balance
    const walletBalance = await BillingService.getWalletBalance(orgId)

    // Get subscription
    const subscription = await BillingService.getSubscription(orgId)

    // Get wallet
    const wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId: orgId },
    })

    return res.status(200).json({
      wallet: {
        balanceCents: walletBalance,
        isFrozen: wallet?.isFrozen || false,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            provider: subscription.provider,
            currentPeriodEnd: subscription.currentPeriodEnd,
            planId: subscription.planId,
          }
        : null,
      canSend: subscription?.status === 'ACTIVE' && (wallet?.isFrozen === false),
    })
  } catch (error) {
    console.error('Error fetching billing status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
