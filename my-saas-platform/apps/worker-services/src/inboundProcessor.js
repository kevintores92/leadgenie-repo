require('dotenv').config();

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const Twilio = require('twilio');

const prisma = new PrismaClient({ errorFormat: 'pretty' });

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

const inboundQueue = new Queue('inbound-process', { connection });

function getOpenAiClient() {
  if (!process.env.LLM_API_KEY) throw new Error('Missing LLM_API_KEY');
  return new OpenAI({ apiKey: process.env.LLM_API_KEY });
}

function normalizeStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'NO_STATUS';
  if (s === 'no status' || s === 'nostatus' || s === 'none') return 'NO_STATUS';
  if (s === 'hot') return 'HOT';
  if (s === 'warm') return 'WARM';
  if (s === 'nurture') return 'NURTURE';
  if (s === 'drip') return 'DRIP';
  if (s === 'not interested' || s === 'not_interested') return 'NOT_INTERESTED';
  if (s === 'wrong number' || s === 'wrong_number') return 'WRONG_NUMBER';
  if (s === 'dnc' || s === 'opt_out' || s === 'stop') return 'DNC';
  return 'NO_STATUS';
}

function sentimentForStatus(status) {
  if (status === 'HOT' || status === 'WARM') return 'POSITIVE';
  if (status === 'NURTURE' || status === 'DRIP' || status === 'NO_STATUS') return 'NEUTRAL';
  return 'NEGATIVE';
}

function applyReplyGuardrails(text) {
  let t = String(text || '').trim();
  if (t.length > 320) t = t.slice(0, 317) + '...';
  const optout = ' Reply STOP to opt out.';
  if (!t.toLowerCase().includes('stop')) t = t + optout;
  return t;
}

async function classifyInboundSms(openai, messageText) {
  const prompt = `You are classifying inbound SMS replies for a real estate investing team.
Return STRICT JSON ONLY.

Allowed statuses (choose exactly one):
- HOT
- WARM
- NURTURE
- DRIP
- NOT_INTERESTED
- WRONG_NUMBER
- DNC
- NO_STATUS

Rules:
- If the message is an opt-out (STOP, unsubscribe, do not contact, hostile stop), status=DNC.
- If it's wrong person/property/number, status=WRONG_NUMBER.
- If clearly not interested, status=NOT_INTERESTED.
- If positive/open to offers/selling, status=WARM.
- If they show motivation indicators (2+): poor condition, urgent timeline, reason not using broker, price expectation w/ motivation, then status=HOT.
- If unclear, status=NO_STATUS.
- If they want follow-up later / not now / long-term, status=DRIP or NURTURE depending on tone (DRIP for no response or later follow-up; NURTURE for still engaging but needs rapport/info).

Also return tags[] (short strings), confidence (0-1).

Message: """${messageText}"""`;

  const response = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json' },
  });

  const raw = response.choices[0].message.content;
  const data = JSON.parse(raw);
  const status = normalizeStatus(data.status);
  const confidence = Number(data.confidence);

  return {
    status,
    sentiment: sentimentForStatus(status),
    tags: Array.isArray(data.tags) ? data.tags.map(String).slice(0, 12) : [],
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    model: response.model,
    raw: data,
  };
}

async function draftReply(openai, { inboundText, contact, tone }) {
  const prompt = `Draft a concise, compliant SMS reply for a real estate investing conversation.
Constraints:
- Keep under 320 chars.
- No promises/guarantees.
- Respect opt-out.
- Be considerate and courteous.
- Ask a single next question when appropriate.

Tone: ${tone}
Contact context: firstName=${contact?.firstName || ''}, propertyAddress=${contact?.propertyAddress || ''}
Inbound message: """${inboundText}"""

Return STRICT JSON ONLY: { reply }`;

  const response = await openai.chat.completions.create({
    model: process.env.LLM_REPLY_MODEL || process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json' },
  });

  const data = JSON.parse(response.choices[0].message.content);
  return { reply: String(data.reply || ''), model: response.model };
}

function getTwilioClientForSend() {
  // Note: this uses env credentials. If you want subaccount-per-brand, we can extend this
  // to fetch Brand.twilioSubaccountSid + subaccountAuthToken and use those.
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  return Twilio(sid, token);
}

const worker = new Worker(
  'inbound-process',
  async (job) => {
    const { messageId, organizationId, autoReply } = job.data || {};
    if (!messageId || !organizationId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) return;

    // Only process inbound SMS
    if (msg.direction !== 'INBOUND' || msg.channel !== 'SMS') return;

    const openai = getOpenAiClient();

    const classification = await classifyInboundSms(openai, msg.body || '');

    // Persist AI results on the message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        aiClassification: classification.raw,
        aiStatus: classification.status,
        aiSentiment: classification.sentiment,
        aiModel: classification.model,
      },
    });

    // Update contact status/tags (auto-tag)
    const contact = await prisma.contact.findUnique({ where: { id: msg.contactId } });
    if (contact) {
      const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
      const sentimentTag = classification.sentiment === 'POSITIVE' ? 'Positive' : classification.sentiment === 'NEGATIVE' ? 'Negative' : 'Neutral';
      const statusTag = `Status:${classification.status}`;
      const nextTags = Array.from(new Set([...existingTags, sentimentTag, statusTag, ...classification.tags])).slice(0, 50);

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          status: classification.status,
          tags: nextTags,
          hasReplied: true,
          lastInboundAt: new Date(),
        },
      });
    }

    // Auto reply rules
    if (!autoReply) return;
    if (classification.status === 'DNC' || classification.status === 'WRONG_NUMBER') return;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || !org.aiRepliesEnabled) return;

    // Draft reply (simple SMS behavior for now)
    const replyDraft = await draftReply(openai, {
      inboundText: msg.body || '',
      contact,
      tone: 'PROFESSIONAL',
    });

    const sanitized = applyReplyGuardrails(replyDraft.reply);

    // Bill for AI reply (same cost model used elsewhere)
    const smsCost = 0.01;
    const billed = await prisma.$transaction(async (tx) => {
      const o = await tx.organization.findUnique({ where: { id: organizationId } });
      if (!o) return { ok: false, reason: 'org not found' };
      if (Number(o.walletBalance) - smsCost < 0) return { ok: false, reason: 'insufficient' };
      await tx.organization.update({ where: { id: organizationId }, data: { walletBalance: { decrement: smsCost } } });
      await tx.usage.create({ data: { organizationId, type: 'AI_SMS_REPLY', cost: smsCost } });
      return { ok: true };
    });

    if (!billed.ok) {
      await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { insufficientFunds: true } } });
      return;
    }

    // Send via Twilio from the same number the prospect texted
    const twilio = getTwilioClientForSend();
    const from = msg.toNumber;
    const to = msg.fromNumber;

    const outboundRecord = await prisma.message.create({
      data: {
        brandId: msg.brandId,
        contactId: msg.contactId,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        channel: 'SMS',
        fromNumber: from,
        toNumber: to,
        body: sanitized,
        isAiGenerated: true,
        aiReplyDraft: replyDraft.reply,
        aiModel: replyDraft.model,
      },
    });

    try {
      const sent = await twilio.messages.create({ from, to, body: sanitized });
      await prisma.message.update({
        where: { id: outboundRecord.id },
        data: { status: 'SENT', sentAt: new Date(), twilioSid: sent.sid, aiReplySentAt: new Date() },
      });
    } catch (e) {
      await prisma.message.update({ where: { id: outboundRecord.id }, data: { status: 'FAILED' } });
      console.warn('AI reply send failed', e && e.message);
    }
  },
  { connection, concurrency: 3 }
);

worker.on('failed', (job, err) => {
  console.warn('inbound-process job failed', job && job.id, err && err.message);
});

console.log('Inbound AI processor running (queue: inbound-process)');

module.exports = { inboundQueue };
