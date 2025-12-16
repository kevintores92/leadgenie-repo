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

  // find sending number
  const sending = await prisma.sendingNumber.findUnique({ where: { phoneNumber: To } });
  if (!sending) return res.status(404).send('unknown to number');

  const orgId = sending.organizationId;

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

  await prisma.message.updateMany({ where: { twilioSid: MessageSid }, data: { status: normalized } });

  res.json({ ok: true });
});

module.exports = router;
