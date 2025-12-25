import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditLoggingService {
  /**
   * Log call events for TCPA compliance
   */
  static async logCallEvent(data: {
    organizationId: string;
    userId?: string;
    leadId: string;
    phoneNumber: string;
    phoneType: 'mobile' | 'landline';
    callType: 'cold' | 'warm';
    numberUsed: string;
    timestampStart: Date;
    timestampEnd?: Date;
    callOutcome: string;
    optOutTriggered?: boolean;
    recordingUrl?: string;
    transcript?: string;
  }) {
    try {
      return await prisma.callEventLog.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          leadId: data.leadId,
          phoneNumber: data.phoneNumber,
          phoneType: data.phoneType,
          callType: data.callType,
          numberUsed: data.numberUsed,
          timestampStart: data.timestampStart,
          timestampEnd: data.timestampEnd,
          callOutcome: data.callOutcome,
          optOutTriggered: data.optOutTriggered || false,
          recordingUrl: data.recordingUrl,
          transcript: data.transcript,
        },
      });
    } catch (error) {
      console.error('Failed to log call event:', error);
      throw error;
    }
  }

  /**
   * Log consent for TCPA compliance
   */
  static async logConsent(data: {
    leadId: string;
    organizationId: string;
    consentType: string;
    source: string;
    proofReference?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      return await prisma.consentLedger.create({
        data: {
          leadId: data.leadId,
          organizationId: data.organizationId,
          consentType: data.consentType,
          source: data.source,
          timestamp: new Date(),
          proofReference: data.proofReference,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log consent:', error);
      throw error;
    }
  }

  /**
   * Log user agreement acceptance
   */
  static async logAgreement(data: {
    userId: string;
    organizationId: string;
    termsVersion: string;
    termsVersionHash: string;
    ipAddress: string;
    checkboxStates: any;
  }) {
    try {
      return await prisma.agreementLedger.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          termsVersion: data.termsVersion,
          termsVersionHash: data.termsVersionHash,
          ipAddress: data.ipAddress,
          acceptedAt: new Date(),
          checkboxStates: data.checkboxStates,
        },
      });
    } catch (error) {
      console.error('Failed to log agreement:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for compliance review
   */
  static async getCallEventLogs(organizationId: string, filters?: {
    leadId?: string;
    phoneNumber?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      return await prisma.callEventLog.findMany({
        where: {
          organizationId,
          ...(filters?.leadId && { leadId: filters.leadId }),
          ...(filters?.phoneNumber && { phoneNumber: filters.phoneNumber }),
          ...(filters?.startDate && { timestampStart: { gte: filters.startDate } }),
          ...(filters?.endDate && { timestampStart: { lte: filters.endDate } }),
        },
        orderBy: { timestampStart: 'desc' },
      });
    } catch (error) {
      console.error('Failed to get call event logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for legal defense (immutable, append-only)
   */
  static async exportAuditLogs(organizationId: string, startDate: Date, endDate: Date) {
    try {
      const [callLogs, consentLogs, agreementLogs] = await Promise.all([
        prisma.callEventLog.findMany({
          where: {
            organizationId,
            timestampStart: { gte: startDate, lte: endDate },
          },
          orderBy: { timestampStart: 'asc' },
        }),
        prisma.consentLedger.findMany({
          where: {
            organizationId,
            timestamp: { gte: startDate, lte: endDate },
          },
          orderBy: { timestamp: 'asc' },
        }),
        prisma.agreementLedger.findMany({
          where: {
            organizationId,
            acceptedAt: { gte: startDate, lte: endDate },
          },
          orderBy: { acceptedAt: 'asc' },
        }),
      ]);

      return {
        callEvents: callLogs,
        consents: consentLogs,
        agreements: agreementLogs,
        exportedAt: new Date(),
        retentionPeriod: '5+ years',
      };
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }
}