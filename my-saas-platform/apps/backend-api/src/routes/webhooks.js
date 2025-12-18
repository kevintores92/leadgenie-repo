const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { webhookLogger, globalRateLimiter } = require('../middleware/webhookSecurity');

const suffix = process.env.WEBHOOK_SUFFIX || 'default';

router.use(webhookLogger);
router.use(globalRateLimiter);

router.post(`/twilio/inbound-${suffix}`, async (req, res) => {
  const { To, From, Body } = req.body || {};
  if (!To || !From) return res.status(400).send('missing fields');

  // find sending number: prefer PhoneNumber pool, fallback to legacy SendingNumber
  let sending = await prisma.phoneNumber.findUnique({ where: { phoneNumber: To } });
  let orgId;
  if (sending) {
    orgId = sending.organizationId;
  } else {
    const legacy = await prisma.sendingNumber.findUnique({ where: { phoneNumber: To } });
    if (!legacy) return res.status(404).send('unknown to number');
    orgId = legacy.organizationId;
  }

  // upsert contact by (organizationId, phoneNumber)
  // ensure there's a brand for this organization
  let brand = await prisma.brand.findFirst({ where: { orgId } });
  if (!brand) {
    brand = await prisma.brand.create({ data: { orgId, name: `${sending.phoneNumber} Brand` } });
  }

  const contact = await prisma.contact.upsert({
    where: { organizationId_phoneNumber: { organizationId: orgId, phoneNumber: From } },
    update: { phone: From },
    create: { firstName: '', phone: From, phoneNumber: From, organizationId: orgId, brandId: brand.id },
  });

  // create inbound message
  await prisma.message.create({
    data: {
      brandId: contact.brandId,
      contactId: contact.id,
      direction: 'INBOUND',
      status: 'DELIVERED',
      channel: 'SMS',
      fromNumber: From,
      toNumber: To,
      body: Body || '',
    },
  });

  // mark contact as replied
  try {
    await prisma.contact.update({ where: { id: contact.id }, data: { hasReplied: true, lastInboundAt: new Date() } });
  } catch (e) { console.warn('failed to mark contact reply', e && e.message); }

  res.send('<Response></Response>');
});

router.post(`/twilio/status-callback-${suffix}`, async (req, res) => {
  const { MessageSid, MessageStatus } = req.body || {};
  if (!MessageSid) return res.status(400).send('missing sid');

  const mapping = {
    delivered: 'DELIVERED',
    failed: 'FAILED',
    sent: 'SENT',
    queued: 'QUEUED',
  };
  const normalized = mapping[(MessageStatus || '').toLowerCase()] || 'SENT';

  const ErrorCode = req.body && (req.body.ErrorCode || req.body.error_code || req.body.errorCode);

  // Update message status
  await prisma.message.updateMany({ where: { twilioSid: MessageSid }, data: { status: normalized } });

  // If failed with non-retryable error (carrier filtering / opted-out), mark phone number blocked where relevant
  const nonRetryable = new Set([21610, 21612, 21614, 21408, 21611]);
  const codeNum = ErrorCode ? Number(ErrorCode) : null;
  if (normalized === 'FAILED' && codeNum && nonRetryable.has(codeNum)) {
    try {
      // Find messages with this sid to get the to/from number
      const msg = await prisma.message.findUnique({ where: { twilioSid: MessageSid } });
      if (msg) {
        // Prefer PhoneNumber table
        const pn = await prisma.phoneNumber.findUnique({ where: { phoneNumber: msg.fromNumber } });
        if (pn) {
          await prisma.phoneNumber.update({ where: { id: pn.id }, data: { status: 'BLOCKED' } });
          await prisma.complianceAuditLog.create({ data: { organizationId: orgId, entityType: 'PHONE_NUMBER', entityId: pn.id, action: 'BLOCKED', reason: 'TWILIO_CODE_'+codeNum, metadata: { twilioError: codeNum } } });
        }
      }
    } catch (e) { console.warn('failed to mark blocked number', e && e.message); }
  }

  // Deliverability scoring adjustments
  try {
    // Find message to get fromNumber
    const msg = await prisma.message.findUnique({ where: { twilioSid: MessageSid } });
    if (msg) {
      // Map event to score delta
      let delta = 0;
      if (normalized === 'DELIVERED') delta = 0;
      else if (normalized === 'FAILED') {
        if (codeNum === 21610) delta = -40; // opt-out
        else if (codeNum === 21611) delta = -25; // blocked
        else delta = -10; // undelivered/failure
      } else if (normalized === 'QUEUED' || normalized === 'SENT') delta = 0;

      if (delta !== 0) {
        // find PhoneNumber record
        const pn = await prisma.phoneNumber.findUnique({ where: { phoneNumber: msg.fromNumber } });
        if (pn) {
          // upsert deliverability score for this phone
          const existing = await prisma.deliverabilityScore.findFirst({ where: { entityType: 'PHONE_NUMBER', entityId: pn.id } });
          if (existing) {
            const next = Math.max(0, Math.min(100, existing.score + delta));
            await prisma.deliverabilityScore.update({ where: { id: existing.id }, data: { score: next } });
            // take action if thresholds crossed
            if (next < 30) {
              await prisma.phoneNumber.update({ where: { id: pn.id }, data: { status: 'BLOCKED' } });
            } else if (next < 50) {
              await prisma.phoneNumber.update({ where: { id: pn.id }, data: { status: 'PAUSED' } });
            }
          } else {
            const initial = Math.max(0, Math.min(100, 100 + delta));
            await prisma.deliverabilityScore.create({ data: { entityType: 'PHONE_NUMBER', entityId: pn.id, score: initial } });
          }
        }
      }
    }
  } catch (e) { console.warn('deliverability scoring update failed', e && e.message); }

  res.json({ ok: true });
});

module.exports = router;
