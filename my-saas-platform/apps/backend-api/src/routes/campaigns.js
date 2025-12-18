const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Use worker-service helper to enqueue campaigns (delegates to campaign sender queue)
let enqueueCampaign;

async function getEnqueueCampaign() {
  if (enqueueCampaign) return enqueueCampaign;
  try {
    // lazy-load worker helper to avoid connecting to Redis at backend startup
    enqueueCampaign = require('../../../worker-services/src/campaignSender').enqueueCampaign;
    return enqueueCampaign;
  } catch (e) {
    console.warn('Could not load local worker enqueue helper; ensure worker-services is available in monorepo', e && e.message);
    return null;
  }
}

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

  // enqueue campaign work to the campaign sender worker (lazy)
  const workerEnqueue = await getEnqueueCampaign();
  if (workerEnqueue) {
    await workerEnqueue(orgId, id, batchSize || campaign.batchSize || 50, intervalMinutes || campaign.intervalMinutes || 30);
    return res.json({ ok: true, queuedToWorker: true });
  }

  // Worker unavailable (e.g., Redis not running). Fall back to marking campaign queued in DB
  try {
    await prisma.campaign.update({ where: { id }, data: { status: 'QUEUED' } });
    await prisma.activity.create({ data: { organizationId: orgId, type: 'CAMPAIGN_QUEUED_FALLBACK', message: 'Queued in DB; worker unavailable', meta: { campaignId: id } } });
    await prisma.complianceAuditLog.create({ data: { organizationId: orgId, entityType: 'CAMPAIGN', entityId: id, action: 'QUEUED_FALLBACK', reason: 'WORKER_UNAVAILABLE', metadata: { batchSize, intervalMinutes } } });
  } catch (e) {
    console.warn('failed to record fallback queue state', e && e.message);
    return res.status(500).json({ error: 'enqueue failed', details: e && e.message });
  }

  return res.json({ ok: true, queuedToWorker: false, note: 'Worker unavailable; queued in DB' });
});

// POST /campaigns/:id/simulate - run a dry simulation of campaign sends
router.post('/:id/simulate', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: 'campaign not found' });
  const brand = await prisma.brand.findUnique({ where: { id: campaign.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  const contacts = await prisma.contact.findMany({ where: { organizationId: orgId } });
  const contactsCount = contacts.length;

  // Determine pool (campaign numbers else brand numbers)
  const poolLinks = await prisma.campaignPhoneNumber.findMany({ where: { campaignId: id }, include: { phoneNumber: true } });
  let pool = poolLinks.map(p => p.phoneNumber).filter(p => p && p.status !== 'BLOCKED');
  if (pool.length === 0) {
    pool = await prisma.phoneNumber.findMany({ where: { organizationId: orgId, status: { not: 'BLOCKED' } } });
  }

  const poolCapacityPerHour = pool.reduce((sum, p) => sum + ((p.warmupLevel || 1) * 60), 0);
  const estimatedDurationHours = poolCapacityPerHour > 0 ? (contactsCount / poolCapacityPerHour) : null;

  // required numbers to run at 30 msgs/min (full speed)
  const requiredNumbers = Math.ceil(pool.reduce((s, p) => s + (p.warmupLevel || 1), 0) / 30) || 0;

  // 24h block count
  const blockedBy24hRule = contacts.filter(c => c.lastSmsSentAt && ((Date.now() - new Date(c.lastSmsSentAt).getTime()) / 36e5) < 24).length;

  // quiet hour deferrals estimate
  let quietHourDeferrals = 0;
  if (campaign.quietHoursStart != null && campaign.quietHoursEnd != null) {
    // approximate: fraction of hours that fall into quiet window
    const start = Number(campaign.quietHoursStart); const end = Number(campaign.quietHoursEnd);
    const quietHours = start <= end ? (end - start) : (24 - (start - end));
    const frac = quietHours / 24;
    quietHourDeferrals = Math.round(contactsCount * frac);
  }

  // risk level based on average deliverability score across pool
  const scores = [];
  for (const p of pool) {
    const ds = await prisma.deliverabilityScore.findFirst({ where: { entityType: 'PHONE_NUMBER', entityId: p.id } });
    if (ds) scores.push(ds.score);
  }
  const avgScore = scores.length > 0 ? scores.reduce((a,b)=>a+b,0)/scores.length : 100;
  let riskLevel = 'LOW';
  if (avgScore < 50) riskLevel = 'HIGH';
  else if (avgScore < 80) riskLevel = 'MEDIUM';

  // Log simulation run as Audit (read-only, informational)
  try {
    await prisma.complianceAuditLog.create({ data: { organizationId: orgId, entityType: 'CAMPAIGN', entityId: id, action: 'SIMULATION_RUN', reason: 'SIMULATE', metadata: { contacts: contactsCount, estimatedDurationHours, requiredNumbers } } });
  } catch (e) { console.warn('failed to write simulation audit', e && e.message); }

  res.json({ contacts: contactsCount, estimatedDurationHours, requiredNumbers, blockedBy24hRule, quietHourDeferrals, riskLevel });
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
