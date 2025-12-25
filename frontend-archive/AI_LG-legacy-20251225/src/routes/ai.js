const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Requires x-organization-id header (same as other routes).
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

router.get('/messages/:id/ai', async (req, res) => {
  const orgId = req.auth.organizationId;
  const msg = await prisma.message.findUnique({ where: { id: req.params.id }, include: { contact: true, brand: true } });
  if (!msg) return res.status(404).json({ error: 'Not found' });

  // Authorization: message must belong to this org (via brand -> orgId or contact.organizationId)
  const brandOrgId = msg.brand && msg.brand.orgId;
  const contactOrgId = msg.contact && msg.contact.organizationId;
  if (brandOrgId !== orgId && contactOrgId !== orgId) return res.status(403).json({ error: 'Forbidden' });

  res.json({
    classification: msg.aiClassification,
    status: msg.aiStatus,
    sentiment: msg.aiSentiment,
    replyDraft: msg.aiReplyDraft,
    flags: msg.aiFlags,
    model: msg.aiModel,
    replySentAt: msg.aiReplySentAt,
  });
});

// Manual approval endpoint (optional). For now this just marks the draft approved.
router.post('/messages/:id/approve-reply', async (req, res) => {
  const orgId = req.auth.organizationId;
  const msg = await prisma.message.findUnique({ where: { id: req.params.id }, include: { contact: true, brand: true } });
  if (!msg) return res.status(404).json({ error: 'Not found' });

  const brandOrgId = msg.brand && msg.brand.orgId;
  const contactOrgId = msg.contact && msg.contact.organizationId;
  if (brandOrgId !== orgId && contactOrgId !== orgId) return res.status(403).json({ error: 'Forbidden' });

  await prisma.message.update({ where: { id: msg.id }, data: { aiFlags: { ...(msg.aiFlags || {}), approved: true } } });
  res.json({ ok: true });
});

module.exports = router;
