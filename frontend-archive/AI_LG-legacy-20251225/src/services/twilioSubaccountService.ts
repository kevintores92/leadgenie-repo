/**
 * Twilio Subaccount Automation Service
 * Handles suspension/activation of Twilio subaccounts based on subscription status
 */

import twilio from 'twilio'
import prisma from '../lib/prisma'
import { BillingService } from './billingService'

export class TwilioSubaccountService {
  private twilioClient: any

  constructor(masterAccountSid: string, masterAuthToken: string) {
    this.twilioClient = twilio(masterAccountSid, masterAuthToken)
  }

  /**
   * Suspend a Twilio subaccount
   * This prevents the subaccount from making API calls and sending messages
   */
  async suspendSubaccount(subaccountSid: string): Promise<void> {
    try {
      await this.twilioClient.api.accounts(subaccountSid).update({
        status: 'suspended',
      })
      console.log(`✓ Suspended Twilio subaccount: ${subaccountSid}`)
    } catch (error) {
      console.error(`✗ Failed to suspend Twilio subaccount ${subaccountSid}:`, error)
      throw error
    }
  }

  /**
   * Activate a Twilio subaccount
   * This allows the subaccount to make API calls and send messages
   */
  async activateSubaccount(subaccountSid: string): Promise<void> {
    try {
      await this.twilioClient.api.accounts(subaccountSid).update({
        status: 'active',
      })
      console.log(`✓ Activated Twilio subaccount: ${subaccountSid}`)
    } catch (error) {
      console.error(`✗ Failed to activate Twilio subaccount ${subaccountSid}:`, error)
      throw error
    }
  }

  /**
   * Handle subscription status change
   * Suspends/activates Twilio subaccount and freezes/unfreezes wallet
   */
  async handleSubscriptionStatusChange(
    organizationId: string,
    newStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED'
  ): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        wallet: true,
      },
    })

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`)
    }

    // Get all brands (which contain Twilio subaccounts) for this org
    const brands = await prisma.brand.findMany({
      where: { orgId: organizationId },
    })

    const isActive = newStatus === 'ACTIVE'

    for (const brand of brands) {
      if (!brand.twilioSubaccountSid) {
        continue
      }

      if (isActive) {
        // Subscription is now ACTIVE
        await this.activateSubaccount(brand.twilioSubaccountSid)
        await BillingService.unfreezeWallet(organizationId)
        console.log(`✓ Unfroze wallet for organization: ${organizationId}`)
      } else {
        // Subscription is NOT ACTIVE
        await this.suspendSubaccount(brand.twilioSubaccountSid)
        await BillingService.freezeWallet(organizationId)
        console.log(`✓ Froze wallet for organization: ${organizationId}`)
      }
    }
  }

  /**
   * Verify subaccount status
   */
  async getSubaccountStatus(
    subaccountSid: string
  ): Promise<'active' | 'suspended' | 'closed'> {
    try {
      const account = await this.twilioClient.api.accounts(subaccountSid).fetch()
      return account.status as 'active' | 'suspended' | 'closed'
    } catch (error) {
      console.error(`Failed to fetch account status for ${subaccountSid}:`, error)
      throw error
    }
  }
}

// Singleton instance
let subaccountServiceInstance: TwilioSubaccountService | null = null

export function getTwilioSubaccountService(): TwilioSubaccountService {
  if (!subaccountServiceInstance) {
    const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID
    const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN

    if (!masterAccountSid || !masterAuthToken) {
      throw new Error('TWILIO_MASTER_ACCOUNT_SID or TWILIO_MASTER_AUTH_TOKEN not set')
    }

    subaccountServiceInstance = new TwilioSubaccountService(
      masterAccountSid,
      masterAuthToken
    )
  }

  return subaccountServiceInstance
}
