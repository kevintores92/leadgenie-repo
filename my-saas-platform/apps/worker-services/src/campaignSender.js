require('dotenv').config();

const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const Twilio = require('twilio');

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

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

// Retry configuration
const MAX_RETRIES = 2;

const { selectPhoneNumber } = require('./lib/smsPool');
const { runWarmupOnce } = require('./warmupJob');

// Schedule warmup job once a day. Run immediately at startup then every 24h.
(async () => {
  try {
    await runWarmupOnce();
  } catch (e) { console.warn('initial warmup run failed', e && e.message); }
  setInterval(() => {
    runWarmupOnce().catch(e => console.warn('daily warmup failed', e && e.message));
  }, 24 * 60 * 60 * 1000);
})();

// Also start BullMQ repeatable warmup scheduler (ensures a persistent repeatable job)
try {
  require('./warmupScheduler');
} catch (e) { console.warn('warmupScheduler not started', e && e.message); }

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

      // 24-hour cooldown check: do NOT enqueue if contact has received SMS in last 24 hours
      const last = await prisma.message.findFirst({
        where: { contactId: contact.id, status: 'OUTBOUND_API' },
        orderBy: { sentAt: 'desc' },
      });
      if (last && last.sentAt) {
        const hoursSince = (Date.now() - new Date(last.sentAt).getTime()) / 36e5;
        if (hoursSince < 24) {
          // mark deferred for 24h and set nextEligibleAt
          const nextSend = new Date(new Date(last.sentAt).getTime() + 24 * 60 * 60 * 1000);
              await prisma.contact.update({ where: { id: contact.id }, data: { status: 'DEFERRED_24H', nextEligibleAt: nextSend } });
              await prisma.activity.create({ data: { organizationId: organizationId, type: 'DEFERRED_24H', message: 'Deferred due to 24h cooldown', meta: { contactId: contact.id, campaignId, nextEligibleAt: nextSend } } });
              await prisma.complianceAuditLog.create({ data: { organizationId, entityType: 'CONTACT', entityId: contact.id, action: 'DEFERRED_24H', reason: '24H_COOLDOWN', metadata: { campaignId, nextEligibleAt: nextSend } } });
          continue;
        }
      }

      // Org-level cost cap check: if spentThisMonth >= monthlyCapUSD, pause campaign and DO NOT enqueue
      const billing = await prisma.orgBillingControl.findUnique({ where: { organizationId } });
      if (billing && billing.monthlyCapUSD !== null && billing.spentThisMonth >= billing.monthlyCapUSD) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', pausedReason: 'BILLING_CAP' } });
        await prisma.activity.create({ data: { organizationId: organizationId, type: 'CAMPAIGN_PAUSED', message: 'Paused due to org monthly cap', meta: { campaignId } } });
        await prisma.complianceAuditLog.create({ data: { organizationId, entityType: 'CAMPAIGN', entityId: campaignId, action: 'PAUSED', reason: 'ORG_CAP_REACHED', metadata: { campaignId } } });
        return;
      }

      // Quiet hours enforcement: if campaign defines quiet hours, re-schedule to next allowed window
      let delay = baseDelay;
      if (!bypassBusinessHours) {
        const scheduled = Date.now() + delay;
        let adjustedMs = adjustToBusinessHoursDelay(scheduled, timeZone);
        // apply campaign quiet hours if set
        const camp = campaign;
        if (camp.quietHoursStart !== null && camp.quietHoursStart !== undefined && camp.quietHoursEnd !== null && camp.quietHoursEnd !== undefined) {
          const currentHour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(new Date(adjustedMs)));
          const start = Number(camp.quietHoursStart);
          const end = Number(camp.quietHoursEnd);
          const insideQuiet = (start <= end) ? (currentHour >= start && currentHour < end) : (currentHour >= start || currentHour < end);
          if (insideQuiet) {
            // compute next allowed hour in timezone
            let daysToAdd = 0;
            let targetHour = end;
            const nowParts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(adjustedMs));
            const map = {};
            for (const p of nowParts) map[p.type] = p.value;
            const y = Number(map.year); const m = Number(map.month); const d = Number(map.day);
            const targetLocalMs = Date.UTC(y, m - 1, d + daysToAdd, targetHour, 0, 0);
            adjustedMs = targetLocalMs;
          }
        }
        delay = Math.max(0, adjustedMs - Date.now());
      }

      await queue.add('send', { organizationId, campaignId, contactId: contact.id }, { delay, attempts: MAX_RETRIES, backoff: { type: 'exponential', delay: 1000 } });
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

  // Load campaign phone pool (deterministic assignment). Exclude BLOCKED numbers.
  const poolLinks = await prisma.campaignPhoneNumber.findMany({ where: { campaignId }, include: { phoneNumber: true } });
  const pool = poolLinks.map(p => p.phoneNumber).filter(p => p && p.status !== 'BLOCKED');
  let chosenNumber = null;
  if (pool.length > 0) {
    chosenNumber = selectPhoneNumber(contact.id, pool);
  }
  const from = chosenNumber ? chosenNumber.phoneNumber : undefined;

  // choose template (prefer CSV pools when available)
  let templateString = chooseTemplateForContact(contact);
  if (!templateString) {
    const useAlt = !contact.firstName || !contact.propertyAddress;
    templateString = useAlt ? campaign.templateAlternate : campaign.templatePrimary;
  }
  const body = renderTemplate(templateString, contact);

  // create queued message
  // Ensure contact is assigned to chosen number (sticky assignment)
  if (chosenNumber && (!contact.assignedNumberId || contact.assignedNumberId !== chosenNumber.id)) {
    try {
      await prisma.contact.update({ where: { id: contact.id }, data: { assignedNumberId: chosenNumber.id } });
    } catch (e) { console.warn('failed to assign contact number', e && e.message); }
  }

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

  // Org billing control hard cap check
  const billing = await prisma.orgBillingControl.findUnique({ where: { organizationId } });
  if (billing && billing.monthlyCapUSD !== null && billing.spentThisMonth >= billing.monthlyCapUSD) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', pausedReason: 'BILLING_CAP' } });
    await prisma.activity.create({ data: { organizationId: organizationId, type: 'CAMPAIGN_PAUSED', message: 'Paused due to org monthly cap (worker)', meta: { campaignId } } });
    return;
  }

  // Final 24h contact cooldown safeguard: do not send if contact received SMS in last 24h
  if (contact.lastSmsSentAt) {
    const hoursSince = (Date.now() - new Date(contact.lastSmsSentAt).getTime()) / 36e5;
    if (hoursSince < 24) {
      const nextSend = new Date(new Date(contact.lastSmsSentAt).getTime() + 24 * 60 * 60 * 1000);
      await prisma.contact.update({ where: { id: contact.id }, data: { status: 'DEFERRED_24H', nextEligibleAt: nextSend } });
      await prisma.activity.create({ data: { organizationId, type: 'DEFERRED_24H', message: 'Deferred at send-time due to 24h cooldown', meta: { contactId: contact.id, campaignId, nextEligibleAt: nextSend } } });
      return;
    }
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
  // Enforce warmup throttling per-number: convert warmupLevel (msgs/min) to min interval
  let perNumberMinInterval = 1000; // conservative default 1 msg/sec
  if (chosenNumber && chosenNumber.warmupLevel && chosenNumber.warmupLevel > 0) {
    perNumberMinInterval = Math.ceil(60000 / chosenNumber.warmupLevel);
  }
  const lastUsedMs = chosenNumber && chosenNumber.lastUsedAt ? new Date(chosenNumber.lastUsedAt).getTime() : 0;
  const since = Date.now() - lastUsedMs;
  if (since < perNumberMinInterval) await sleep(perNumberMinInterval - since);
  // Apply extended throttling if org has high message volume
  const totalSent = await prisma.usage.count({ where: { organizationId, type: 'AI_SMS' } });
  if (totalSent > 2000) await sleep(2000);

  let msg;
  try {
    msg = await twilioClient.messages.create({ body, from, to });
  } catch (err) {
    // Determine retry-safe errors
    const status = err && (err.status || err.statusCode || (err.response && err.response.status));
    const code = err && err.code;
    const isNetwork = !!(err && (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT'));
    const isServerError = status && status >= 500;

    // Non-retryable Twilio errors (carrier filtering, opt-out, blocked) — common codes include 21610, 21612, 21614, etc.
    const nonRetryableCodes = new Set([21610, 21612, 21614, 21408, 21611]);

    if (isNetwork || isServerError) {
      // allow worker to retry (Bull attempts configured). Throw to surface as retriable.
      console.warn('Transient Twilio error, will retry', { err: err && err.message, status, code });
      // record retry suppressed event only if attempts exhausted (Bull will retry automatically)
      throw err;
    } else if (code && nonRetryableCodes.has(code)) {
      // Mark message failed and do NOT retry
      console.warn('Non-retryable Twilio error (carrier/opt-out). Marking failed.', { code, msg: err && err.message });
      await prisma.message.update({ where: { id: queued.id }, data: { status: 'FAILED' } });
      await prisma.complianceAuditLog.create({ data: { organizationId, entityType: 'MESSAGE', entityId: queued.id, action: 'BLOCKED', reason: 'CARRIER_BLOCK_OR_OPT_OUT', metadata: { code, message: err && err.message } } });
      // If Twilio indicates number blocked, mark number BLOCKED
      if (code === 21610 || code === 21611) {
        if (chosenNumber) {
          await prisma.phoneNumber.update({ where: { id: chosenNumber.id }, data: { status: 'BLOCKED' } });
          await prisma.complianceAuditLog.create({ data: { organizationId, entityType: 'PHONE_NUMBER', entityId: chosenNumber.id, action: 'BLOCKED', reason: 'TWILIO_CODE_'+code, metadata: { code } } });
          // Fallback: attempt to reassign contact to another active number
          const alt = pool.find(p => p.id !== chosenNumber.id && p.status === 'ACTIVE');
          if (alt) {
            await prisma.contact.update({ where: { id: contact.id }, data: { assignedNumberId: alt.id } });
            await prisma.activity.create({ data: { organizationId: organizationId, type: 'NUMBER_REASSIGNED', message: 'Contact reassigned due to blocked number', meta: { from: chosenNumber.phoneNumber, to: alt.phoneNumber, contactId: contact.id, campaignId } } });
            await prisma.complianceAuditLog.create({ data: { organizationId, entityType: 'CONTACT', entityId: contact.id, action: 'REASSIGNED', reason: 'NUMBER_BLOCKED_FALLBACK', metadata: { from: chosenNumber.id, to: alt.id, campaignId } } });
          }
        }
      }
      return;
    } else {
      // Unknown non-server error: do not retry to avoid billing/delivery issues
      console.warn('Twilio error (non-retryable). Marking failed', { err: err && err.message, code, status });
      await prisma.message.update({ where: { id: queued.id }, data: { status: 'FAILED' } });
      return;
    }
  }

  // Deduct per-message cost and create usage record
  await prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({ where: { id: organizationId }, data: { walletBalance: { decrement: MESSAGE_COST } } });
    await tx.usage.create({ data: { organizationId, type: 'AI_SMS', cost: MESSAGE_COST } });
    if (Number(updated.walletBalance) === 0) {
      await tx.organization.update({ where: { id: organizationId }, data: { aiRepliesEnabled: false, aiCallsEnabled: false } });
    }
  });
  // Update org billing control spentThisMonth if record exists
  try {
    await prisma.orgBillingControl.updateMany({ where: { organizationId }, data: { spentThisMonth: { increment: MESSAGE_COST } } });
  } catch (e) { console.warn('failed to update org billing spent', e && e.message); }

  // Update sending number usage metadata after send
  if (chosenNumber) {
    await prisma.phoneNumber.update({ where: { id: chosenNumber.id }, data: { lastUsedAt: new Date() } });
  }

  // update message to OUTBOUND_API
  await prisma.message.update({ where: { id: queued.id }, data: { status: 'OUTBOUND_API', sentAt: new Date(), twilioSid: msg.sid } });

  // Update contact send lock timestamp
  try {
    await prisma.contact.update({ where: { id: contact.id }, data: { lastSmsSentAt: new Date() } });
  } catch (e) { console.warn('failed to update contact lastSmsSentAt', e && e.message); }

}, { connection });

module.exports = { enqueueCampaign, adjustToBusinessHoursDelay, sendNow, chooseTemplateForContact, loadTemplatesFromCsv };
