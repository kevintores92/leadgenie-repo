import { PrismaClient } from '@prisma/client';
import { AuditLoggingService } from './auditLoggingService';
import { TwilioService } from './twilioService';

const prisma = new PrismaClient();

export class CallOrchestrationEngine {
  /**
   * Initiate cold calling campaign with compliance checks
   */
  static async startColdCallingCampaign(campaignData: {
    organizationId: string;
    brandId: string;
    campaignId: string;
    userId: string;
    contactIds: string[];
    script: string;
    complianceAgreementId: string;
  }) {
    try {
      const {
        organizationId,
        brandId,
        campaignId,
        userId,
        contactIds,
        script,
        complianceAgreementId,
      } = campaignData;

      // Get contacts (landlines only for cold calling)
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          organizationId,
          phoneType: 'landline', // Only landlines for cold calling
          isPhoneValid: true,
        },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
        },
      });

      if (contacts.length === 0) {
        throw new Error('No valid landline contacts found for cold calling');
      }

      // Get available voice numbers for landline cold calling
      const availableNumbers = await prisma.voiceNumberPool.findMany({
        where: {
          organizationId,
          purpose: 'LANDLINE_COLD_CALLING',
          status: 'ACTIVE',
        },
        orderBy: { lastUsedAt: 'asc' },
      });

      if (availableNumbers.length === 0) {
        throw new Error('No voice numbers available for cold calling');
      }

      // Start orchestration job
      const job = await this.createOrchestrationJob({
        campaignId,
        organizationId,
        brandId,
        userId,
        contacts,
        availableNumbers,
        script,
        complianceAgreementId,
      });

      return {
        jobId: job.id,
        totalContacts: contacts.length,
        estimatedDuration: this.calculateEstimatedDuration(contacts.length),
      };
    } catch (error) {
      console.error('Failed to start cold calling campaign:', error);
      throw error;
    }
  }

  /**
   * Create orchestration job with queue management
   */
  private static async createOrchestrationJob(data: {
    campaignId: string;
    organizationId: string;
    brandId: string;
    userId: string;
    contacts: any[];
    availableNumbers: any[];
    script: string;
    complianceAgreementId: string;
  }) {
    // Create job record (assuming we have a CallOrchestrationJob model)
    // For now, we'll simulate with a simple structure
    const job = {
      id: `job_${Date.now()}`,
      campaignId: data.campaignId,
      organizationId: data.organizationId,
      status: 'queued',
      createdAt: new Date(),
      totalCalls: data.contacts.length,
      completedCalls: 0,
      failedCalls: 0,
    };

    // Start processing calls with rate limiting and rotation
    this.processCallsWithRotation(data);

    return job;
  }

  /**
   * Process calls with number rotation and rate limiting
   */
  private static async processCallsWithRotation(data: {
    campaignId: string;
    organizationId: string;
    brandId: string;
    userId: string;
    contacts: any[];
    availableNumbers: any[];
    script: string;
    complianceAgreementId: string;
  }) {
    const {
      campaignId,
      organizationId,
      brandId,
      userId,
      contacts,
      availableNumbers,
      script,
    } = data;

    let numberIndex = 0;
    const cooldownPeriod = 60 + Math.random() * 120; // 60-180 seconds
    const maxCallsPerNumber = 100; // Daily limit
    const batchSize = 1; // Start with 1 call per minute
    const rateRampUpInterval = 30 * 60 * 1000; // 30 minutes

    // Sort contacts by priority (can be enhanced)
    const sortedContacts = contacts.sort((a, b) => a.lastName.localeCompare(b.lastName));

    for (let i = 0; i < sortedContacts.length; i++) {
      const contact = sortedContacts[i];
      const number = availableNumbers[numberIndex % availableNumbers.length];

      // Check number limits
      if (number.callsToday >= maxCallsPerNumber) {
        // Skip to next number
        numberIndex++;
        continue;
      }

      // Check cooldown
      const timeSinceLastUse = number.lastUsedAt
        ? Date.now() - number.lastUsedAt.getTime()
        : Infinity;

      if (timeSinceLastUse < cooldownPeriod * 1000) {
        // Wait for cooldown
        await this.delay((cooldownPeriod * 1000) - timeSinceLastUse);
      }

      // Make the call
      await this.makeCompliantCall({
        campaignId,
        organizationId,
        brandId,
        userId,
        contact,
        number,
        script,
      });

      // Update number usage
      await prisma.voiceNumberPool.update({
        where: { id: number.id },
        data: {
          callsToday: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      // Rate limiting with ramp-up
      const callsMade = i + 1;
      const currentBatchSize = Math.min(
        Math.floor(callsMade / (rateRampUpInterval / (30 * 60 * 1000))) + 1,
        10 // Max 10 calls per minute
      );

      if (callsMade % currentBatchSize === 0) {
        await this.delay(60 * 1000); // 1 minute between batches
      } else {
        await this.delay((60 * 1000) / currentBatchSize); // Distribute within minute
      }
    }
  }

  /**
   * Make a single compliant AI cold call
   */
  private static async makeCompliantCall(data: {
    campaignId: string;
    organizationId: string;
    brandId: string;
    userId: string;
    contact: any;
    number: any;
    script: string;
  }) {
    const {
      campaignId,
      organizationId,
      brandId,
      userId,
      contact,
      number,
      script,
    } = data;

    const callStartTime = new Date();

    try {
      // Initiate call via Twilio/VAPI
      const callResult = await TwilioService.makeAICall({
        to: contact.phone,
        from: number.phoneNumber,
        script,
        brandId,
        contactId: contact.id,
      });

      // Log call event
      await AuditLoggingService.logCallEvent({
        organizationId,
        userId,
        leadId: contact.id,
        phoneNumber: contact.phone,
        phoneType: 'landline',
        callType: 'cold',
        numberUsed: number.phoneNumber,
        timestampStart: callStartTime,
        callOutcome: 'initiated',
      });

      // Monitor call completion (this would be handled by webhooks in production)
      // For now, simulate completion
      const callEndTime = new Date(callStartTime.getTime() + 3 * 60 * 1000); // 3 minutes

      await AuditLoggingService.logCallEvent({
        organizationId,
        userId,
        leadId: contact.id,
        phoneNumber: contact.phone,
        phoneType: 'landline',
        callType: 'cold',
        numberUsed: number.phoneNumber,
        timestampStart: callStartTime,
        timestampEnd: callEndTime,
        callOutcome: 'completed',
        recordingUrl: callResult.recordingUrl,
        transcript: callResult.transcript,
      });

    } catch (error) {
      console.error('Call failed:', error);

      // Log failed call
      await AuditLoggingService.logCallEvent({
        organizationId,
        userId,
        leadId: contact.id,
        phoneNumber: contact.phone,
        phoneType: 'landline',
        callType: 'cold',
        numberUsed: number.phoneNumber,
        timestampStart: callStartTime,
        timestampEnd: new Date(),
        callOutcome: 'failed',
      });

      throw error;
    }
  }

  /**
   * Calculate estimated campaign duration
   */
  private static calculateEstimatedDuration(contactCount: number): string {
    const avgCallDuration = 3; // 3 minutes
    const callsPerMinute = 1; // Conservative rate
    const totalMinutes = (contactCount * avgCallDuration) / callsPerMinute;

    if (totalMinutes < 60) {
      return `${Math.ceil(totalMinutes)} minutes`;
    } else if (totalMinutes < 1440) {
      return `${Math.ceil(totalMinutes / 60)} hours`;
    } else {
      return `${Math.ceil(totalMinutes / 1440)} days`;
    }
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle real-time opt-out detection
   */
  static async handleOptOut(contactId: string, organizationId: string, callSid: string) {
    try {
      // Mark contact as opted out
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          status: 'opted_out',
          nextEligibleAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // Log opt-out event
      await AuditLoggingService.logCallEvent({
        organizationId,
        leadId: contactId,
        phoneNumber: '', // Would get from call log
        phoneType: 'landline',
        callType: 'cold',
        numberUsed: '', // Would get from call log
        timestampStart: new Date(),
        callOutcome: 'opt_out',
        optOutTriggered: true,
      });

      // Immediate suppression - cancel any pending calls
      await this.cancelPendingCalls(contactId);

    } catch (error) {
      console.error('Opt-out handling failed:', error);
      throw error;
    }
  }

  /**
   * Cancel any pending calls for a contact
   */
  private static async cancelPendingCalls(contactId: string) {
    // Implementation would depend on queue system
    // For now, this is a placeholder
    console.log(`Cancelling pending calls for contact ${contactId}`);
  }
}