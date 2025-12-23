/**
 * Compliance API Routes
 * Handles TCPA compliance, audit logging, and regulatory requirements
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Import compliance services (these would need to be created if they don't exist)
const AuditLoggingService = require('../src/services/auditLoggingService');
const ComplianceEnforcementMiddleware = require('../src/middleware/ComplianceEnforcementMiddleware');

/**
 * GET /compliance/audit-logs
 * Retrieve audit logs for compliance monitoring
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'];
    const { page = 1, limit = 50 } = req.query;

    // This would use the AuditLoggingService
    const logs = await prisma.callEventLog.findMany({
      where: {
        organizationId: String(organizationId)
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: {
        contact: true
      }
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

/**
 * GET /compliance/consent-ledger
 * Retrieve consent records for TCPA compliance
 */
router.get('/consent-ledger', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'];

    const consents = await prisma.consentLedger.findMany({
      where: {
        organizationId: String(organizationId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(consents);
  } catch (error) {
    console.error('Failed to retrieve consent ledger:', error);
    res.status(500).json({ error: 'Failed to retrieve consent ledger' });
  }
});

/**
 * POST /compliance/record-consent
 * Record user consent for TCPA compliance
 */
router.post('/record-consent', async (req, res) => {
  try {
    const { contactId, consentType, consentGiven, ipAddress, userAgent } = req.body;
    const organizationId = req.headers['x-organization-id'];

    const consent = await prisma.consentLedger.create({
      data: {
        organizationId: String(organizationId),
        contactId,
        consentType,
        consentGiven: Boolean(consentGiven),
        ipAddress,
        userAgent,
        recordedAt: new Date()
      }
    });

    res.json(consent);
  } catch (error) {
    console.error('Failed to record consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

/**
 * GET /compliance/agreement-ledger
 * Retrieve agreement records for regulatory compliance
 */
router.get('/agreement-ledger', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'];

    const agreements = await prisma.agreementLedger.findMany({
      where: {
        organizationId: String(organizationId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(agreements);
  } catch (error) {
    console.error('Failed to retrieve agreement ledger:', error);
    res.status(500).json({ error: 'Failed to retrieve agreement ledger' });
  }
});

module.exports = router;