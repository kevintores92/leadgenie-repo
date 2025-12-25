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

// Helper to provision phone numbers for a campaign (moved from signup)
async function provisionCampaignPhoneNumbers({ orgId, areaCode, count = 1 }) {
  const FAKE = process.env.FAKE_TWILIO === '1';
  const label = 'campaign';

  if (FAKE) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      const fake = `+1555${Math.floor(Math.random() * 900000) + 100000}`;
      const rec = await prisma.sendingNumber.create({
        data: { organizationId: orgId, phoneNumber: fake, label },
      });
      numbers.push(rec);
    }
    return { created: true, numbers, fake: true };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { created: false, reason: 'missing_twilio_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(accountSid, authToken);

  const desiredAreaCode = areaCode || undefined;
  const avail = await client.availablePhoneNumbers('US').local.list({ areaCode: desiredAreaCode, limit: count });
  if (!avail || avail.length === 0) {
    return { created: false, reason: 'no_numbers_available' };
  }

  const numbers = [];
  for (const candidate of avail.slice(0, count)) {
    const purchased = await client.incomingPhoneNumbers.create({ phoneNumber: candidate.phoneNumber });
    const rec = await prisma.sendingNumber.create({
      data: { organizationId: orgId, phoneNumber: purchased.phoneNumber, label },
    });
    numbers.push(rec);
  }
  return { created: true, numbers, fake: false };
}

// Check and start scheduled campaigns that are due
async function checkAndStartScheduledCampaigns(brandId) {
  try {
    const now = new Date();
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        brandId,
        status: 'SCHEDULED',
        scheduledStart: {
          lte: now
        }
      }
    });

    for (const campaign of scheduledCampaigns) {
      // Check if organization has sufficient balance
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand) continue;

      const org = await prisma.organization.findUnique({ where: { id: brand.orgId } });
      if (!org) continue;

      // For now, assume campaigns can start even with low balance
      // The worker will handle balance checks during execution
      try {
        const workerEnqueue = await getEnqueueCampaign();
        if (workerEnqueue) {
          await workerEnqueue(org.id, campaign.id, campaign.batchSize || 50, campaign.intervalMinutes || 30);
          await prisma.campaign.update({ 
            where: { id: campaign.id }, 
            data: { status: 'RUNNING' } 
          });
          console.log(`Started scheduled campaign: ${campaign.name}`);
        }
      } catch (error) {
        console.error(`Failed to start scheduled campaign ${campaign.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking scheduled campaigns:', error);
  }
}

// POST /campaigns - Create a new campaign
router.post('/', async (req, res) => {
  const { name, type, estimatedContacts, areaCode, scheduledStart } = req.body || {};
  const orgId = req.auth.organizationId;

  if (!name || !type) {
    return res.status(400).json({ error: 'missing required fields: name, type' });
  }

  // Get org's default brand
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  if (!brand) {
    return res.status(404).json({ error: 'no brand found for organization' });
  }

  // Daily campaign sending limit: 2000 messages per brand per day
  // (Manual SMS is not affected by this limit)
  const DAILY_CAMPAIGN_LIMIT = 2000;
  const contactsToSendToday = Math.min(estimatedContacts || 0, DAILY_CAMPAIGN_LIMIT);
  const contactsQueuedForLater = Math.max(0, (estimatedContacts || 0) - DAILY_CAMPAIGN_LIMIT);

  // Calculate number of phone numbers needed (1 per 250 contacts)
  const CONTACTS_PER_NUMBER = 250;
  const numbersNeededTotal = Math.max(1, Math.ceil(contactsToSendToday / CONTACTS_PER_NUMBER));

  // Check existing phone numbers for this organization
  const existingNumbers = await prisma.sendingNumber.findMany({
    where: { 
      organizationId: orgId,
      enabled: true
    }
  });

  const existingCount = existingNumbers.length;
  const numbersToPurchase = Math.max(0, numbersNeededTotal - existingCount);

  // Create campaign
  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      name,
      callingMode: type,
      status: scheduledStart ? 'SCHEDULED' : 'DRAFT',
      batchSize: 50,
      intervalMinutes: 30,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
    },
  });

  // Provision phone numbers with the specified area code (only if needed)
  let phoneNumbersResult = null;
  if (numbersToPurchase > 0) {
    try {
      phoneNumbersResult = await provisionCampaignPhoneNumbers({ 
        orgId, 
        areaCode, 
        count: numbersToPurchase 
      });
    } catch (e) {
      console.error('Failed to provision campaign phone numbers:', e);
      phoneNumbersResult = { 
        created: false, 
        reason: 'phone_provisioning_error', 
        details: e && e.message 
      };
    }
  } else {
    phoneNumbersResult = {
      created: false,
      reason: 'using_existing_numbers',
      message: `Using ${existingCount} existing phone numbers`
    };
  }

  res.status(201).json({
    ok: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      type: campaign.callingMode,
      status: campaign.status,
      scheduledStart: campaign.scheduledStart,
    },
    phoneNumbers: phoneNumbersResult,
    limits: {
      dailyCampaignLimit: DAILY_CAMPAIGN_LIMIT,
      contactsToSendToday,
      contactsQueuedForLater,
      existingNumbers: existingCount,
      numbersPurchased: numbersToPurchase,
      totalNumbers: existingCount + (phoneNumbersResult?.numbers?.length || 0)
    }
  });
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

// GET /campaigns - List all campaigns for the organization
router.get('/', async (req, res) => {
  const orgId = req.auth.organizationId;

  // Get org's default brand
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  if (!brand) {
    return res.json([]); // Return empty array if no brand found
  }

  // Check for scheduled campaigns that should be started
  await checkAndStartScheduledCampaigns(brand.id);

  // Get all campaigns for this brand
  const campaigns = await prisma.campaign.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      callingMode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      scheduledStart: true
    }
  });

  res.json(campaigns);
});

module.exports = router;
