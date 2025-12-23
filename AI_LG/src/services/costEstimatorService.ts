import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CostEstimatorService {
  private static readonly SMS_COST = 0.0075; // $0.0075 per SMS
  private static readonly VOICE_COST_PER_MINUTE = 0.014; // $0.014 per minute
  private static readonly ESTIMATED_CALL_DURATION_MINUTES = 3; // 3 minutes average
  private static readonly DLC_BRAND_REGISTRATION = 40; // $40 one-time
  private static readonly DLC_CAMPAIGN_REGISTRATION = 13; // $13 per campaign
  private static readonly PHONE_NUMBER_COST = 1; // $1 per month
  private static readonly PHONE_VALIDATION_COST = 0.01; // $0.01 per validation
  private static readonly CONTACTS_PER_NUMBER = 1000; // Max contacts per number
  private static readonly ESTIMATED_HOT_LEAD_RATE = 0.05; // 5% hot lead rate
  private static readonly ESTIMATED_REPLY_RATE = 0.20; // 20% reply rate
  private static readonly PLATFORM_MARKUP_PERCENT = 30; // 30% markup

  /**
   * Calculate cost estimate for a campaign before execution
   */
  static async calculateCampaignCost(organizationId: string, campaignData: {
    totalContacts: number;
    mobileCount: number;
    landlineCount: number;
    campaignType: 'sms' | 'voice' | 'cold_call';
    estimatedDurationMinutes?: number;
    includeDlcRegistration?: boolean;
  }) {
    try {
      const {
        totalContacts,
        mobileCount,
        landlineCount,
        campaignType,
        estimatedDurationMinutes = this.ESTIMATED_CALL_DURATION_MINUTES,
        includeDlcRegistration = false,
      } = campaignData;

      let totalCost = 0;
      const costBreakdown: any = {};

      // Phone validation costs
      const validationCost = totalContacts * this.PHONE_VALIDATION_COST;
      costBreakdown.phoneValidation = {
        cost: validationCost,
        description: `Phone validation for ${totalContacts} contacts`,
      };
      totalCost += validationCost;

      if (campaignType === 'sms') {
        // SMS campaign costs
        const smsCost = mobileCount * this.SMS_COST;
        costBreakdown.sms = {
          cost: smsCost,
          description: `SMS messages to ${mobileCount} mobile numbers`,
        };
        totalCost += smsCost;

        // Estimated replies (follow-up SMS)
        const estimatedReplies = Math.ceil(mobileCount * this.ESTIMATED_REPLY_RATE);
        const replyCost = estimatedReplies * this.SMS_COST;
        costBreakdown.estimatedReplies = {
          cost: replyCost,
          description: `Estimated ${estimatedReplies} reply SMS messages`,
        };
        totalCost += replyCost;

        // 10DLC registration if needed
        if (includeDlcRegistration) {
          const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { dlcBrandRegistered: true, dlcCampaignRegistered: true },
          });

          if (!organization?.dlcBrandRegistered) {
            costBreakdown.dlcBrand = {
              cost: this.DLC_BRAND_REGISTRATION,
              description: '10DLC Brand registration (one-time)',
            };
            totalCost += this.DLC_BRAND_REGISTRATION;
          }

          if (!organization?.dlcCampaignRegistered) {
            costBreakdown.dlcCampaign = {
              cost: this.DLC_CAMPAIGN_REGISTRATION,
              description: '10DLC Campaign registration',
            };
            totalCost += this.DLC_CAMPAIGN_REGISTRATION;
          }
        }

        // Phone number costs (10DLC numbers)
        const numbersNeeded = Math.ceil(mobileCount / this.CONTACTS_PER_NUMBER);
        const numberCost = numbersNeeded * this.PHONE_NUMBER_COST;
        costBreakdown.phoneNumbers = {
          cost: numberCost,
          description: `${numbersNeeded} 10DLC phone numbers (monthly)`,
        };
        totalCost += numberCost;

      } else if (campaignType === 'voice' || campaignType === 'cold_call') {
        // Voice call costs (landlines only for cold calls)
        const callableContacts = campaignType === 'cold_call' ? landlineCount : totalContacts;
        const callMinutes = callableContacts * estimatedDurationMinutes;
        const voiceCost = callMinutes * this.VOICE_COST_PER_MINUTE;
        costBreakdown.voice = {
          cost: voiceCost,
          description: `Voice calls: ${callableContacts} contacts × ${estimatedDurationMinutes} min average`,
        };
        totalCost += voiceCost;

        // Phone number costs (voice numbers)
        const numbersNeeded = Math.ceil(callableContacts / this.CONTACTS_PER_NUMBER);
        const numberCost = numbersNeeded * this.PHONE_NUMBER_COST;
        costBreakdown.phoneNumbers = {
          cost: numberCost,
          description: `${numbersNeeded} voice phone numbers (monthly)`,
        };
        totalCost += numberCost;

        // AI compute costs (estimated)
        const aiCostPerMinute = 0.002; // $0.002 per minute AI processing
        const aiCost = callMinutes * aiCostPerMinute;
        costBreakdown.aiCompute = {
          cost: aiCost,
          description: `AI processing for ${callMinutes} minutes of calls`,
        };
        totalCost += aiCost;
      }

      // Platform markup
      const markupAmount = totalCost * (this.PLATFORM_MARKUP_PERCENT / 100);
      costBreakdown.platformMarkup = {
        cost: markupAmount,
        description: `${this.PLATFORM_MARKUP_PERCENT}% platform markup`,
      };
      totalCost += markupAmount;

      // Apply organization pricing markup if any
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { pricingMarkupPercent: true },
      });

      if (organization?.pricingMarkupPercent) {
        const orgMarkup = totalCost * (organization.pricingMarkupPercent / 100);
        costBreakdown.organizationMarkup = {
          cost: orgMarkup,
          description: `${organization.pricingMarkupPercent}% organization markup`,
        };
        totalCost += orgMarkup;
      }

      return {
        totalCost: Math.ceil(totalCost * 100) / 100, // Round to cents
        costBreakdown,
        estimates: {
          callableContacts: campaignType === 'cold_call' ? landlineCount : totalContacts,
          estimatedHotLeads: Math.ceil(totalContacts * this.ESTIMATED_HOT_LEAD_RATE),
          estimatedReplies: campaignType === 'sms' ? Math.ceil(mobileCount * this.ESTIMATED_REPLY_RATE) : 0,
        },
        mobileExcluded: campaignType === 'cold_call' && mobileCount > 0,
        disclaimer: 'Costs are estimates. Actual costs may vary based on usage patterns and Twilio pricing.',
      };
    } catch (error) {
      console.error('Cost estimation error:', error);
      throw new Error('Failed to calculate campaign cost');
    }
  }

  /**
   * Validate if organization has sufficient balance for estimated cost
   */
  static async validateBalanceForCost(organizationId: string, estimatedCost: number) {
    try {
      const wallet = await prisma.organizationWallet.findUnique({
        where: { organizationId },
        select: { balanceCents: true, isFrozen: true },
      });

      if (!wallet) {
        return { sufficient: false, reason: 'No wallet found' };
      }

      if (wallet.isFrozen) {
        return { sufficient: false, reason: 'Wallet is frozen' };
      }

      const balanceUSD = wallet.balanceCents / 100;
      const sufficient = balanceUSD >= estimatedCost;

      return {
        sufficient,
        currentBalance: balanceUSD,
        estimatedCost,
        shortfall: sufficient ? 0 : estimatedCost - balanceUSD,
      };
    } catch (error) {
      console.error('Balance validation error:', error);
      throw new Error('Failed to validate balance');
    }
  }
}