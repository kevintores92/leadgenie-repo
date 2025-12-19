/**
 * POST /api/webhooks/twilio
 * Receives message delivery status updates from Twilio
 * Updates wallet based on actual Twilio pricing
 */

import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { BillingService } from '../../../services/billingService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify request is from Twilio
    // In production, use Twilio's request validation
    // For now, we trust the webhook

    const { MessageSid, MessageStatus, Price, PriceUnit } = req.body

    if (!MessageSid || !MessageStatus) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Find message in database
    const message = await prisma.message.findFirst({
      where: { twilio_sid: MessageSid },
      include: { contact: { include: { organization: true } } },
    })

    if (!message || !message.contact?.organization) {
      console.warn(`Message not found for SID: ${MessageSid}`)
      // Still return 200 to acknowledge webhook
      return res.status(200).json({ received: true })
    }

    const organizationId = message.contact.organization.id
    const priceUsd = parseFloat(Price) || 0
    const priceCents = Math.round(priceUsd * 100)

    // Only debit on successful delivery
    if (MessageStatus === 'delivered') {
      // Calculate final cost with markup
      const finalCost = await BillingService.calculateFinalCost(
        organizationId,
        priceCents
      )

      // Debit wallet
      try {
        await BillingService.debitWallet(
          organizationId,
          finalCost,
          MessageSid
        )

        console.log(
          `✓ Debited wallet for message ${MessageSid}: ${finalCost}¢`
        )
      } catch (error) {
        console.error(`Failed to debit wallet for ${MessageSid}:`, error)
        // Log but don't fail - message was already sent
      }
    } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      // Don't debit for failed messages
      console.log(`Message ${MessageSid} ${MessageStatus} - no charge`)
    }

    // Update message status in database
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: mapTwilioStatusToOurs(MessageStatus),
        twilio_price: priceCents,
      },
    })

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    // Return 200 anyway to prevent retries
    return res.status(200).json({ received: true, error: String(error) })
  }
}

/**
 * Map Twilio message status to our MessageStatus enum
 */
function mapTwilioStatusToOurs(
  twilioStatus: string
): string {
  const statusMap: { [key: string]: string } = {
    queued: 'QUEUED',
    sending: 'QUEUED',
    sent: 'SENT',
    delivered: 'DELIVERED',
    failed: 'FAILED',
    undelivered: 'FAILED',
    read: 'DELIVERED',
  }

  return statusMap[twilioStatus] || 'QUEUED'
}
