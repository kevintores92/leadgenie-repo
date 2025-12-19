/**
 * PayPal Webhook Handler
 * Receives and processes PayPal subscription and payment events
 */

import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { BillingService } from '../../../services/billingService'
import { PayPalService } from '../../../services/paypalService'
import { getTwilioSubaccountService } from '../../../services/twilioSubaccountService'

const paypalService = new PayPalService({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature
    const isValid = await paypalService.verifyWebhookSignature(
      process.env.PAYPAL_WEBHOOK_ID || '',
      req.body,
      req.headers['paypal-transmission-id'] as string,
      req.headers['paypal-transmission-time'] as string,
      req.headers['paypal-cert-url'] as string,
      req.headers['paypal-auth-algo'] as string,
      req.headers['paypal-transmission-sig'] as string
    )

    if (!isValid) {
      console.warn('Invalid PayPal webhook signature')
      // Return 200 anyway to prevent retries (idempotent)
      return res.status(200).json({ received: true })
    }

    const event = req.body

    // Track that we've processed this event (idempotency)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { externalId: event.id },
    })

    if (existingEvent) {
      return res.status(200).json({ received: true, duplicate: true })
    }

    // Record the event
    await prisma.webhookEvent.create({
      data: {
        externalId: event.id,
        type: event.event_type,
        data: event,
      },
    })

    // Handle different event types
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event)
        break

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(event)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(event)
        break

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(event)
        break

      case 'PAYMENT.SALE.DENIED':
        await handlePaymentDenied(event)
        break

      default:
        console.log(`Unhandled event type: ${event.event_type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    // Return 200 to prevent retries
    res.status(200).json({ received: true, error: String(error) })
  }
}

/**
 * Subscription activated
 */
async function handleSubscriptionActivated(event: any) {
  const { resource } = event
  const subscriptionId = resource.id

  // Find organization by PayPal subscription ID
  const subscription = await prisma.organizationSubscription.findUnique({
    where: { providerSubId: subscriptionId },
    include: { organization: true },
  })

  if (!subscription) {
    console.warn(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Update subscription status to ACTIVE
  await BillingService.upsertSubscription(
    subscription.organizationId,
    'PAYPAL',
    subscriptionId,
    subscription.planId,
    'ACTIVE',
    new Date(resource.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000)
  )

  // Activate Twilio subaccount
  const twilioService = getTwilioSubaccountService()
  await twilioService.handleSubscriptionStatusChange(subscription.organizationId, 'ACTIVE')

  console.log(`✓ Activated subscription: ${subscriptionId}`)
}

/**
 * Subscription cancelled
 */
async function handleSubscriptionCancelled(event: any) {
  const { resource } = event
  const subscriptionId = resource.id

  const subscription = await prisma.organizationSubscription.findUnique({
    where: { providerSubId: subscriptionId },
    include: { organization: true },
  })

  if (!subscription) {
    console.warn(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Update to CANCELED
  await BillingService.upsertSubscription(
    subscription.organizationId,
    'PAYPAL',
    subscriptionId,
    subscription.planId,
    'CANCELED',
    subscription.subscription?.currentPeriodEnd || new Date()
  )

  // Suspend Twilio subaccount
  const twilioService = getTwilioSubaccountService()
  await twilioService.handleSubscriptionStatusChange(
    subscription.organizationId,
    'CANCELED'
  )

  console.log(`✓ Cancelled subscription: ${subscriptionId}`)
}

/**
 * Subscription updated
 */
async function handleSubscriptionUpdated(event: any) {
  const { resource } = event
  const subscriptionId = resource.id

  const subscription = await prisma.organizationSubscription.findUnique({
    where: { providerSubId: subscriptionId },
  })

  if (!subscription) {
    console.warn(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Update period end
  await prisma.organizationSubscription.update({
    where: { providerSubId: subscriptionId },
    data: {
      currentPeriodEnd: new Date(
        resource.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000
      ),
    },
  })

  console.log(`✓ Updated subscription: ${subscriptionId}`)
}

/**
 * Subscription suspended (payment failed)
 */
async function handleSubscriptionSuspended(event: any) {
  const { resource } = event
  const subscriptionId = resource.id

  const subscription = await prisma.organizationSubscription.findUnique({
    where: { providerSubId: subscriptionId },
    include: { organization: true },
  })

  if (!subscription) {
    console.warn(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Update to PAST_DUE
  await BillingService.upsertSubscription(
    subscription.organizationId,
    'PAYPAL',
    subscriptionId,
    subscription.planId,
    'PAST_DUE',
    subscription.subscription?.currentPeriodEnd || new Date()
  )

  // Suspend Twilio subaccount
  const twilioService = getTwilioSubaccountService()
  await twilioService.handleSubscriptionStatusChange(subscription.organizationId, 'PAST_DUE')

  console.log(`⚠ Suspended subscription (payment failed): ${subscriptionId}`)
}

/**
 * Payment completed (wallet top-up)
 */
async function handlePaymentCompleted(event: any) {
  const { resource } = event

  // Look for our custom field with organization ID
  // You'll need to store this when creating the order
  const orgIdField = resource.custom_id || resource.description?.split('|')?.[1]

  if (!orgIdField) {
    console.warn('No organization ID found in payment')
    return
  }

  const organizationId = orgIdField
  const amountUsd = parseFloat(resource.amount.total)
  const amountCents = Math.round(amountUsd * 100)

  // Credit wallet
  await BillingService.creditWallet(
    organizationId,
    amountCents,
    resource.id // Payment ID as reference
  )

  console.log(`✓ Credited wallet: ${organizationId} +${amountCents}¢`)
}

/**
 * Payment denied
 */
async function handlePaymentDenied(event: any) {
  const { resource } = event

  const orgIdField = resource.custom_id || resource.description?.split('|')?.[1]

  if (!orgIdField) {
    console.warn('No organization ID found in denied payment')
    return
  }

  const organizationId = orgIdField

  // Log the denial - don't credit wallet
  console.log(`✗ Payment denied for organization: ${organizationId}`)

  // Optionally send notification to user
  // await sendPaymentFailedEmail(organizationId, resource.id)
}
