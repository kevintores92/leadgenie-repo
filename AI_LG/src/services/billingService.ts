/**
 * Billing Service
 * Handles wallet management, subscription checks, and cost calculations
 */

import prisma from '../lib/prisma'
import { SubscriptionStatus, WalletTransactionType } from '@prisma/client'

export class BillingService {
  /**
   * Get or create wallet for organization
   */
  static async getOrCreateWallet(organizationId: string) {
    let wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId },
    })

    if (!wallet) {
      wallet = await prisma.organizationWallet.create({
        data: {
          organizationId,
          balanceCents: 0,
          isFrozen: false,
        },
      })
    }

    return wallet
  }

  /**
   * Check if organization can send messages
   * Returns { canSend, reason }
   */
  static async canSendMessage(organizationId: string, estimatedCostCents: number) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
        wallet: true,
      },
    })

    if (!org) {
      return { canSend: false, reason: 'Organization not found' }
    }

    if (!org.subscription) {
      return { canSend: false, reason: 'No active subscription' }
    }

    if (org.subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        canSend: false,
        reason: `Subscription is ${org.subscription.status}`,
      }
    }

    if (org.wallet?.isFrozen) {
      return { canSend: false, reason: 'Wallet is frozen' }
    }

    const wallet = org.wallet || (await this.getOrCreateWallet(organizationId))

    if (wallet.balanceCents < estimatedCostCents) {
      return {
        canSend: false,
        reason: `Insufficient wallet balance. Need ${estimatedCostCents}¢, have ${wallet.balanceCents}¢`,
      }
    }

    return { canSend: true, reason: null }
  }

  /**
   * Calculate cost with markup applied
   * basePriceCents is in cents
   */
  static async calculateFinalCost(
    organizationId: string,
    basePriceCents: number
  ): Promise<number> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    const markupPercent = org?.pricingMarkupPercent || 30
    const markup = Math.round((basePriceCents * markupPercent) / 100)
    return basePriceCents + markup
  }

  /**
   * Debit wallet for message send (final billing)
   */
  static async debitWallet(
    organizationId: string,
    amountCents: number,
    referenceId?: string
  ) {
    const wallet = await this.getOrCreateWallet(organizationId)

    if (wallet.balanceCents < amountCents) {
      throw new Error(
        `Insufficient wallet balance: ${wallet.balanceCents}¢ < ${amountCents}¢`
      )
    }

    // Update wallet
    const updatedWallet = await prisma.organizationWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: {
          decrement: amountCents,
        },
      },
    })

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        organizationId,
        type: WalletTransactionType.MESSAGE_DEBIT,
        amountCents: -amountCents,
        referenceId,
      },
    })

    return updatedWallet
  }

  /**
   * Credit wallet for top-up
   */
  static async creditWallet(
    organizationId: string,
    amountCents: number,
    referenceId?: string
  ) {
    const wallet = await this.getOrCreateWallet(organizationId)

    const updatedWallet = await prisma.organizationWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: {
          increment: amountCents,
        },
      },
    })

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        organizationId,
        type: WalletTransactionType.PAYMENT_TOPUP,
        amountCents,
        referenceId,
      },
    })

    return updatedWallet
  }

  /**
   * Freeze wallet
   */
  static async freezeWallet(organizationId: string) {
    const wallet = await this.getOrCreateWallet(organizationId)

    return prisma.organizationWallet.update({
      where: { id: wallet.id },
      data: { isFrozen: true },
    })
  }

  /**
   * Unfreeze wallet
   */
  static async unfreezeWallet(organizationId: string) {
    const wallet = await this.getOrCreateWallet(organizationId)

    return prisma.organizationWallet.update({
      where: { id: wallet.id },
      data: { isFrozen: false },
    })
  }

  /**
   * Get subscription status for organization
   */
  static async getSubscription(organizationId: string) {
    return prisma.organizationSubscription.findUnique({
      where: { organizationId },
    })
  }

  /**
   * Create or update subscription
   */
  static async upsertSubscription(
    organizationId: string,
    provider: 'PAYPAL' | 'STRIPE',
    providerSubId: string,
    planId: string,
    status: SubscriptionStatus,
    currentPeriodEnd: Date
  ) {
    return prisma.organizationSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider,
        providerSubId,
        planId,
        status,
        currentPeriodEnd,
      },
      update: {
        status,
        currentPeriodEnd,
      },
    })
  }

  /**
   * Get wallet balance
   */
  static async getWalletBalance(organizationId: string) {
    const wallet = await this.getOrCreateWallet(organizationId)
    return wallet.balanceCents
  }

  /**
   * Get wallet transactions
   */
  static async getWalletTransactions(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return prisma.walletTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }
}
