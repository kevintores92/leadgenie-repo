/**
 * POST /api/billing/create-subscription
 * Initiate PayPal subscription
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/prisma'
import { BillingService } from '../../../services/billingService'
import { PayPalService } from '../../../services/paypalService'

const paypalService = new PayPalService({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
})

// Plan IDs - set these up in PayPal Dashboard
const PAYPAL_PLANS = {
  STARTER: process.env.PAYPAL_PLAN_STARTER || '',
  PRO: process.env.PAYPAL_PLAN_PRO || '',
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

    const { plan } = req.body

    if (!plan || !['STARTER', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' })
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
    const planId = PAYPAL_PLANS[plan as keyof typeof PAYPAL_PLANS]

    if (!planId) {
      return res.status(500).json({ error: 'Plan not configured' })
    }

    // Check if already has subscription
    const existingSubscription = await BillingService.getSubscription(orgId)

    if (existingSubscription) {
      return res.status(400).json({ error: 'Organization already has an active subscription' })
    }

    // Create PayPal subscription
    const { subscriptionId, approvalLink } = await paypalService.createSubscription(
      planId,
      user.email,
      user.name || 'Customer'
    )

    // Save subscription in DB (status will be updated via webhook)
    await BillingService.upsertSubscription(
      orgId,
      'PAYPAL',
      subscriptionId,
      plan,
      'PAST_DUE', // Initial status pending activation
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    )

    return res.status(200).json({
      subscriptionId,
      approvalLink,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return res.status(500).json({ error: 'Failed to create subscription' })
  }
}
