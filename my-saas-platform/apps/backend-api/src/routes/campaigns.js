const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enqueueCampaign } = require('../../../worker-services/src/campaignSender');

// Simple auth middleware: expect header x-organization-id or set via req.auth
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

router.post('/:id/start', async (req, res) => {
  const { id } = req.params;
  const { batchSize, intervalMinutes } = req.body || {};
  const orgId = req.auth.organizationId;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: 'campaign not found' });
  // verify campaign belongs to org via brand -> organization
  const brand = await prisma.brand.findUnique({ where: { id: campaign.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  await enqueueCampaign(orgId, id, batchSize || campaign.batchSize || 50, intervalMinutes || campaign.intervalMinutes || 30);

  res.json({ ok: true });
});

router.post('/:id/pause', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: 'campaign not found' });
  const brand = await prisma.brand.findUnique({ where: { id: campaign.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  await prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } });
  res.json({ ok: true });
});

module.exports = router;
