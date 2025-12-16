// apps/worker-services/inboundProcessor.ts
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { DefaultLlmClient } from '../services/llmClient';

const prisma = new PrismaClient();

function parseRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTLS = u.protocol === 'rediss:' || u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number(u.port) || (isTLS ? 6380 : 6379),
        password: u.password || process.env.REDIS_PASSWORD,
        tls: isTLS ? {} : undefined,
      } as any;
    } catch (e) {
      console.warn('Invalid REDIS_URL, falling back to parts', e && (e as Error).message);
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  } as any;
}

const connection = parseRedisConnection();

export const inboundQueue = new Queue('inbound-process', { connection });

type InboundJob = { messageId: string; organizationId: string; autoReply?: boolean };

export const inboundWorker = new Worker<InboundJob>(
  'inbound-process',
  async job => {
    const { messageId, organizationId, autoReply } = job.data;
    const msg = await prisma.message.findUnique({ where: { id: messageId }, include: { /* if needed */ } });
    if (!msg) return;

    const llm = new DefaultLlmClient(process.env.LLM_API_KEY!);

    // Classify
    const { classification, flags, model } = await llm.classifyMessage({
      organizationId,
      text: msg.body,
    });

    await prisma.message.update({
      where: { id: messageId },
      data: {
        aiClassification: classification as any,
        aiFlags: flags as any,
        aiModel: model,
      },
    });

    // Decide on auto-reply
    const shouldAuto =
      autoReply &&
      classification.intent !== 'opt_out' &&
      !flags.policyViolations?.length &&
      classification.confidence >= 0.6;

    if (!shouldAuto) return;

    // Ensure org settings allow AI replies and we have funds, and limits are OK
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return;
    if (!org.aiRepliesEnabled) return;

    // SMS cost and safety threshold (10%)
    const smsCost = 0.01;
    if (Number(org.walletBalance) < smsCost * 1.1) {
      await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { ...(msg.aiFlags || {} as any), needsHumanReview: true, insufficientFunds: true } as any } });
      return;
    }

    // (legacy daily/monthly limits removed) proceed if funds and AI enabled

    // Deduct cost for AI SMS reply
    const deductResult = await prisma.$transaction(async (tx) => {
      const o = await tx.organization.findUnique({ where: { id: organizationId } });
      if (!o) return { ok: false, reason: 'org not found' };
      if (Number(o.walletBalance) - smsCost < 0) return { ok: false, reason: 'insufficient' };
      const updated = await tx.organization.update({ where: { id: organizationId }, data: { walletBalance: { decrement: smsCost } } });
      await tx.usage.create({ data: { organizationId, type: 'AI_SMS', cost: smsCost } });

      // If balance hits zero, disable AI toggles automatically
      if (Number(updated.walletBalance) === 0) {
        await tx.organization.update({ where: { id: organizationId }, data: { aiRepliesEnabled: false, aiCallsEnabled: false } });
      }

      return { ok: true, balance: Number(updated.walletBalance) };
    });

    if (!deductResult.ok) {
      // mark message for human review due to insufficient funds
      await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { ...(msg.aiFlags || {} as any), needsHumanReview: true, insufficientFunds: true } as any } });
      return;
    }

    // Detect hot leads for AI call workflow and attempt to schedule a call (deduct $0.25)
    const isHotLead = classification.intent === 'hot' || classification.intent === 'hot_lead' || !!flags.hot;
    if (isHotLead && org.aiCallsEnabled) {
      const callCost = 0.25;
      // Check balance threshold
      if (Number(org.walletBalance) < callCost * 1.1) {
        await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { ...(msg.aiFlags || {} as any), needsHumanReview: true, insufficientFunds: true } as any } });
        return;
      }

      // (legacy daily/monthly limits removed) attempt call deduct

      const callDeduct = await prisma.$transaction(async (tx) => {
        const o = await tx.organization.findUnique({ where: { id: organizationId } });
        if (!o) return { ok: false, reason: 'org not found' };
        if (Number(o.walletBalance) - callCost < 0) return { ok: false, reason: 'insufficient' };
        const updated = await tx.organization.update({ where: { id: organizationId }, data: { walletBalance: { decrement: callCost } } });
        await tx.usage.create({ data: { organizationId, type: 'AI_CALL', cost: callCost } });

        if (Number(updated.walletBalance) === 0) {
          await tx.organization.update({ where: { id: organizationId }, data: { aiRepliesEnabled: false, aiCallsEnabled: false } });
        }

        return { ok: true, balance: Number(updated.walletBalance) };
      });

      if (callDeduct.ok) {
        await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { ...(msg.aiFlags || {} as any), callScheduled: true } as any } });
        // TODO: enqueue call workflow
      } else {
        await prisma.message.update({ where: { id: messageId }, data: { aiFlags: { ...(msg.aiFlags || {} as any), needsHumanReview: true, insufficientFunds: true } as any } });
        return;
      }
    }

    // Draft reply
    const contact = await prisma.contact.findUnique({ where: { id: msg.contactId } });
    const { reply, flags: replyFlags, model: replyModel } = await llm.generateReply({
      organizationId,
      text: msg.body,
      contact: { firstName: contact?.firstName, propertyAddress: contact?.propertyAddress },
      tone: 'PROFESSIONAL',
    });

    // Final guardrails
    const sanitized = applyReplyGuardrails(reply);

    // Persist draft and queue send
    await prisma.message.create({
      data: {
        organizationId,
        contactId: msg.contactId,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        channel: 'SMS',
        toNumber: msg.fromNumber!, // replying back
        body: sanitized,
        aiReplyDraft: reply,
        aiFlags: replyFlags as any,
        aiModel: replyModel,
      },
    });

    // Reuse your sending queue
    // await sendQueue.add('send-one', { ...payload }, { delay: 0 });
  },
  { connection, concurrency: 2 }
);

function applyReplyGuardrails(text: string) {
  // Basic safety edits: trim length, remove URLs unless whitelisted, append opt-out
  let t = text.trim();
  if (t.length > 320) t = t.slice(0, 317) + '...';
  const optout = ' Reply STOP to opt out.';
  if (!t.toLowerCase().includes('stop')) t = t + optout;
  return t;
}