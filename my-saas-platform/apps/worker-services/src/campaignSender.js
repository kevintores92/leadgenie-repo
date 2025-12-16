const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const Twilio = require('twilio');

const prisma = new PrismaClient();

function parseRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTLS = u.protocol === 'rediss:' || u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number(u.port) || (isTLS ? 6380 : 6379),
        password: u.password || process.env.REDIS_PASSWORD || undefined,
        tls: isTLS ? {} : undefined,
      };
    } catch (e) {
      console.warn('Invalid REDIS_URL, falling back to parts', e && e.message);
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

const redisConnection = parseRedisConnection();

const connection = new IORedis(redisConnection);
const queueName = 'campaign-send';
const queue = new Queue(queueName, { connection });
new QueueScheduler(queueName, { connection });

const twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || '');

// Templates loaded from CSV at startup
const path = require('path');
const fs = require('fs');

const TEMPLATES_CSV = process.env.TEMPLATES_CSV || 'C:\\Users\\Anne Gayl\\Documents\\GitHub\\Genie\\my-saas-platform\\Temporary_Templates.csv';
let templates = { main: [], alt: [] };

function loadTemplatesFromCsv(csvPath) {
  try {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    // assume header present: type,template
    const header = lines.shift();
    for (const line of lines) {
      // split on first comma to allow commas in template text
      const idx = line.indexOf(',');
      if (idx === -1) continue;
      let type = line.slice(0, idx).trim().toLowerCase();
      let tmpl = line.slice(idx + 1).trim();
      // remove surrounding quotes if present
      if (tmpl.startsWith('"') && tmpl.endsWith('"')) tmpl = tmpl.slice(1, -1);
      if (type === 'main') templates.main.push(tmpl);
      else templates.alt.push(tmpl);
    }
  } catch (e) {
    console.warn('Could not load templates CSV', e && e.message);
  }
}

// Initialize templates on module load
loadTemplatesFromCsv(TEMPLATES_CSV);

function chooseTemplateForContact(contact) {
  const hasBoth = contact.firstName && contact.propertyAddress;
  const pool = hasBoth ? templates.main : templates.alt;
  if (!pool || pool.length === 0) {
    // fallback: if primary/alternate exist on campaign, they'll be used by orchestrator
    return null;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

async function selectSendingNumber(orgId) {
  const num = await prisma.sendingNumber.findFirst({
    where: { organizationId: orgId, enabled: true },
    orderBy: [{ lastUsedAt: 'asc' }, { lastUsedCount: 'asc' }],
  });
  if (!num) return null;
  const updated = await prisma.sendingNumber.update({
    where: { id: num.id },
    data: { lastUsedAt: new Date(), lastUsedCount: { increment: 1 } },
  });
  return updated;
}

// Pick the least-used sending number for a send without touching lastUsedAt
async function pickSendingNumberForSend(orgId) {
  return await prisma.sendingNumber.findFirst({
    where: { organizationId: orgId, enabled: true },
    orderBy: [{ lastUsedCount: 'asc' }, { lastUsedAt: 'asc' }],
  });
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function renderTemplate(template, contact) {
  if (!template) return '';
  return String(template).replace(/\{firstName\}/g, contact.firstName || '').replace(/\{propertyAddress\}/g, contact.propertyAddress || '');
}

async function sendNow(organizationId, campaignId, contactId) {
  // enqueue immediate job (worker will pick up and use template selection)
  await queue.add('send', { organizationId, campaignId, contactId }, { delay: 0, attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
}

// Given a timestamp (ms) and an IANA timeZone string, return a timestamp (ms)
// that is the same moment if it's within business hours (07:00-19:00 local),
// otherwise returns the timestamp of the next local 07:00.
function adjustToBusinessHoursDelay(timestampMs, timeZone) {
  const dt = new Date(timestampMs);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(dt);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  if (hour >= 7 && hour < 19) return timestampMs;

  // compute next local date that is 07:00
  let addDays = 0;
  if (hour >= 19) addDays = 1;

  // construct a Date for the target local 07:00 by taking the UTC timestamp
  // of current date + addDays and then shifting to 07:00 local by adjusting hours
  const base = new Date(dt.getTime() + addDays * 24 * 60 * 60 * 1000);
  const parts2 = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(base);
  const map2 = {};
  for (const p of parts2) map2[p.type] = p.value;
  const y = Number(map2.year);
  const m = Number(map2.month);
  const d = Number(map2.day);

  // Now construct a Date object that represents 07:00 in that timezone by
  // using Date.UTC for that local wall time and then compensating by the offset
  const targetLocalMs = Date.UTC(y, m - 1, d, 7, 0, 0);

  // Find the offset between UTC and the timezone's representation at that ms
  const tzAtTarget = new Date(targetLocalMs).toLocaleString('en-US', { timeZone });
  const utcAtTarget = new Date(targetLocalMs).toUTCString();
  // Fallback: if the above approach is unreliable, simply return timestampMs + delta days
  // Compute ms for next day's 07:00 by taking base date in UTC and setting hours to 07:00
  const fallback = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 7, 0, 0);
  if (isNaN(fallback)) return timestampMs + addDays * 24 * 60 * 60 * 1000;
  return fallback;
}

async function enqueueCampaign(organizationId, campaignId, batchSize = 50, intervalMinutes = 30) {
  // Business-hours scheduling: schedule sends to occur between 07:00 - 19:00 in org.timeZone.
  // OUTBOUND_REPLY campaigns bypass business-hours scheduling and send immediately.
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const timeZone = org?.timeZone || 'UTC';
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  const bypassBusinessHours = (campaign?.callingMode === 'OUTBOUND_REPLY');

  // load contacts for org
  const contacts = await prisma.contact.findMany({ where: { organizationId } });
  if (!contacts || contacts.length === 0) return;

  // group
  const batches = [];
  for (let i = 0; i < contacts.length; i += batchSize) {
    batches.push(contacts.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    for (const contact of batch) {
      // base batch delay
      const baseDelay = batchIndex * intervalMinutes * 60 * 1000;

      // suppression
      const last = await prisma.message.findFirst({
        where: { contactId: contact.id, status: 'OUTBOUND_API' },
        orderBy: { sentAt: 'desc' },
      });
      let suppressionDelay = 0;
      if (last && last.sentAt) {
        const msUntil = new Date(last.sentAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
        if (msUntil > 0) suppressionDelay = msUntil;
      }

      let delay = Math.max(baseDelay, suppressionDelay);

      if (!bypassBusinessHours) {
        const scheduled = Date.now() + delay;
        const adjustedMs = adjustToBusinessHoursDelay(scheduled, timeZone);
        delay = Math.max(0, adjustedMs - Date.now());
      }

      await queue.add('send', { organizationId, campaignId, contactId: contact.id }, { delay, attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
    }
  }

  // update campaign status
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'QUEUED' } });
}

// Processor
new Worker(queueName, async (job) => {
  const { organizationId, campaignId, contactId } = job.data;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!contact || !campaign) throw new Error('Missing contact or campaign');

  // choose a sending number (round-robin by least-used)
  const sending = await pickSendingNumberForSend(organizationId);
  const from = sending ? sending.phoneNumber : undefined;

  // choose template (prefer CSV pools when available)
  let templateString = chooseTemplateForContact(contact);
  if (!templateString) {
    const useAlt = !contact.firstName || !contact.propertyAddress;
    templateString = useAlt ? campaign.templateAlternate : campaign.templatePrimary;
  }
  const body = renderTemplate(templateString, contact);

  // create queued message
  const queued = await prisma.message.create({
    data: {
      brandId: campaign.brandId,
      contactId: contact.id,
      direction: 'OUTBOUND',
      status: 'QUEUED',
      channel: 'SMS',
      fromNumber: from || '',
      toNumber: contact.phone || '',
      body,
    },
  });

  // send via Twilio
  // Before sending, ensure wallet balance can cover this message cost; stop campaign if depleted
  const MESSAGE_COST = 0.01;
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error('Org not found');
  if (Number(org.walletBalance) < MESSAGE_COST) {
    // Pause the campaign to stop further sends and record reason
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', pausedReason: 'LOW_BALANCE' } });
    // Log activity for paused campaign
    try {
      await prisma.activity.create({ data: { organizationId: organizationId, type: 'CAMPAIGN_PAUSED', message: 'Paused due to low balance', meta: { reason: 'LOW_BALANCE', campaignId } } });
    } catch (e) { console.warn('activity log failed', e && e.message); }
    return;
  }

  if (!from) {
    // No sending numbers available for this org — pause campaign and record reason
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', pausedReason: 'NO_NUMBERS' } });
    try {
      await prisma.activity.create({ data: { organizationId: organizationId, type: 'CAMPAIGN_PAUSED', message: 'Paused due to no sending numbers', meta: { reason: 'NO_NUMBERS', campaignId } } });
    } catch (e) { console.warn('activity log failed', e && e.message); }
    return;
  }
  const to = contact.phone;
  // Per-number throttle: random 3000-6000ms, but don't exceed if number was idle
  const perNumberDelay = Math.floor(Math.random() * 3000) + 3000;
  if (sending && sending.lastUsedAt) {
    const since = Date.now() - new Date(sending.lastUsedAt).getTime();
    if (since < perNumberDelay) await sleep(perNumberDelay - since);
  } else {
    await sleep(perNumberDelay);
  }
  // Apply extended throttling if org has high message volume
  const totalSent = await prisma.usage.count({ where: { organizationId, type: 'AI_SMS' } });
  if (totalSent > 2000) await sleep(2000);

  const msg = await twilioClient.messages.create({ body, from, to });

  // Deduct per-message cost and create usage record
  await prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({ where: { id: organizationId }, data: { walletBalance: { decrement: MESSAGE_COST } } });
    await tx.usage.create({ data: { organizationId, type: 'AI_SMS', cost: MESSAGE_COST } });
    if (Number(updated.walletBalance) === 0) {
      await tx.organization.update({ where: { id: organizationId }, data: { aiRepliesEnabled: false, aiCallsEnabled: false } });
    }
  });

  // Update sending number usage metadata after send
  if (sending) {
    await prisma.sendingNumber.update({ where: { id: sending.id }, data: { lastUsedAt: new Date(), lastUsedCount: { increment: 1 } } });
  }

  // update message to OUTBOUND_API
  await prisma.message.update({ where: { id: queued.id }, data: { status: 'OUTBOUND_API', sentAt: new Date(), twilioSid: msg.sid } });

}, { connection });

module.exports = { enqueueCampaign, adjustToBusinessHoursDelay, sendNow, chooseTemplateForContact, loadTemplatesFromCsv };
