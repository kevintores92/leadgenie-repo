/**
 * POST /api/billing/create-topup
 * Initiate wallet top-up with PayPal Checkout
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/prisma'
import { PayPalService } from '../../../services/paypalService'

const paypalService = new PayPalService({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
})

const TOPUP_AMOUNTS = {
  '50': '50.00',
  '100': '100.00',
  '250': '250.00',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getSession({ req })

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { amount } = req.body

    if (!amount || !TOPUP_AMOUNTS[amount as keyof typeof TOPUP_AMOUNTS]) {
      return res.status(400).json({
        error: 'Invalid amount. Allowed: 50, 100, 250',
      })
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

    // Create PayPal checkout order
    const { id: orderId, approveLink } = await paypalService.createCheckoutSession(
      TOPUP_AMOUNTS[amount as keyof typeof TOPUP_AMOUNTS]
    )

    // Store pending payment (we'll credit wallet after PayPal webhook confirmation)
    // For now, just return the approval link
    // In a real app, you might store this in a temporary PendingPayment table

    return res.status(200).json({
      orderId,
      approveLink,
      amount: TOPUP_AMOUNTS[amount as keyof typeof TOPUP_AMOUNTS],
    })
  } catch (error) {
    console.error('Error creating top-up checkout:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
