const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ComplianceEnforcementMiddleware {
  /**
   * Middleware to enforce TCPA compliance requirements
   * Must be called before any call execution
   */
  static async enforceCallCompliance(req, res, next) {
    try {
      const { organizationId, userId, campaignId } = req.body;

      if (!organizationId || !userId) {
        return res.status(400).json({
          error: 'Organization ID and User ID required for compliance check'
        });
      }

      // Check if user has accepted current terms
      const latestAgreement = await prisma.agreementLedger.findFirst({
        where: { userId, organizationId },
        orderBy: { acceptedAt: 'desc' },
      });

      if (!latestAgreement) {
        return res.status(403).json({
          error: 'TCPA compliance agreement required before executing calls',
          code: 'NO_AGREEMENT'
        });
      }

      // Check if terms are current (implement version checking logic)
      const currentTermsVersion = process.env.CURRENT_TERMS_VERSION || '1.0';
      if (latestAgreement.termsVersion !== currentTermsVersion) {
        return res.status(403).json({
          error: 'Terms of service must be accepted in current version',
          code: 'OUTDATED_AGREEMENT'
        });
      }

      // Check for required checkbox states
      const requiredCheckboxes = ['tcpacompliance', 'consent_warranty', 'indemnification', 'recording_disclosure'];
      const checkboxStates = latestAgreement.checkboxStates;

      for (const checkbox of requiredCheckboxes) {
        if (!checkboxStates[checkbox]) {
          return res.status(403).json({
            error: `Required agreement checkbox not accepted: ${checkbox}`,
            code: 'MISSING_CHECKBOX'
          });
        }
      }

      // Check organization compliance status
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          aiCallsEnabled: true,
          dlcBrandRegistered: true,
          dlcCampaignRegistered: true,
        },
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (!organization.aiCallsEnabled) {
        return res.status(403).json({
          error: 'AI calls not enabled for this organization',
          code: 'AI_CALLS_DISABLED'
        });
      }

      // For SMS campaigns, ensure 10DLC registration
      if (req.body.campaignType === 'sms' && !organization.dlcBrandRegistered) {
        return res.status(403).json({
          error: '10DLC brand registration required for SMS campaigns',
          code: 'DLC_REQUIRED'
        });
      }

      // Add compliance metadata to request
      req.compliance = {
        agreementId: latestAgreement.id,
        acceptedAt: latestAgreement.acceptedAt,
        termsVersion: latestAgreement.termsVersion,
      };

      next();
    } catch (error) {
      console.error('Compliance enforcement error:', error);
      res.status(500).json({ error: 'Compliance check failed' });
    }
  }

  /**
   * Middleware to enforce permitted actions based on lead type
   */
  static enforcePermittedActions(req, res, next) {
    const { leads, action } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return next();
    }

    for (const lead of leads) {
      const { phoneType, action: leadAction } = lead;

      // Permitted actions matrix
      const permittedActions = {
        landline: ['ai_cold_call'],
        mobile: ['sms'],
        'mobile_engaged': ['warm_ai_call'],
      };

      const allowedActions = permittedActions[phoneType] || [];

      if (!allowedActions.includes(leadAction || action)) {
        return res.status(403).json({
          error: `Action '${leadAction || action}' not permitted for ${phoneType} numbers`,
          code: 'INVALID_ACTION_FOR_TYPE',
          permittedActions: allowedActions,
        });
      }
    }

    next();
  }

  /**
   * Middleware to prevent mobile cold calling
   */
  static preventMobileColdCalling(req, res, next) {
    const { leads, campaignType } = req.body;

    if (campaignType === 'cold_call') {
      const hasMobile = leads?.some(lead => lead.phoneType === 'mobile');
      if (hasMobile) {
        return res.status(403).json({
          error: 'Mobile cold calling is strictly prohibited',
          code: 'MOBILE_COLD_CALL_BLOCKED'
        });
      }
    }

    next();
  }

  /**
   * Middleware to enforce number pool separation
   */
  static async enforceNumberPoolSeparation(req, res, next) {
    try {
      const { organizationId, purpose, numberType } = req.body;

      if (!organizationId || !purpose) {
        return next();
      }

      let poolQuery;
      if (numberType === 'voice') {
        poolQuery = prisma.voiceNumberPool.findFirst({
          where: { organizationId, purpose, status: 'ACTIVE' },
        });
      } else if (numberType === 'sms') {
        poolQuery = prisma.smsNumberPool.findFirst({
          where: { organizationId, purpose, status: 'ACTIVE' },
        });
      }

      if (poolQuery) {
        const number = await poolQuery;
        if (!number) {
          return res.status(403).json({
            error: `No active numbers available for purpose: ${purpose}`,
            code: 'NO_NUMBERS_FOR_PURPOSE'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Number pool enforcement error:', error);
      res.status(500).json({ error: 'Number pool check failed' });
    }
  }
}

module.exports = ComplianceEnforcementMiddleware;