const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Auth middleware
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

router.get('/balance', async (req, res) => {
  const orgId = req.auth.organizationId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'organization not found' });
  res.json({ balance: Number(org.walletBalance) });
});

router.get('/usage/summary', async (req, res) => {
  const orgId = req.auth.organizationId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const [todayCount, monthCount, org] = await Promise.all([
    prisma.usage.count({ where: { organizationId: orgId, createdAt: { gte: today } } }),
    prisma.usage.count({ where: { organizationId: orgId, createdAt: { gte: month } } }),
    prisma.organization.findUnique({ where: { id: orgId } }),
  ]);

  // Return usage counts and balance; do not expose legacy limits
  res.json({ todayCount, monthCount, balance: Number(org?.walletBalance || 0) });
});

router.post('/topup', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { amount } = req.body;
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'invalid amount' });

  const updated = await prisma.organization.update({ where: { id: orgId }, data: { walletBalance: { increment: amount } } });

  // If amount tops up from zero, do not automatically re-enable AI — org must opt-in
  res.json({ balance: Number(updated.walletBalance) });
});

// Internal: deduct balance and create Usage
router.post('/deduct', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { type, cost } = req.body;
  if (!type || typeof cost !== 'number') return res.status(400).json({ error: 'invalid payload' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: orgId } });
      if (!org) throw new Error('org not found');
      if (Number(org.walletBalance) - cost < 0) return { ok: false, error: 'Insufficient funds' };
      const updated = await tx.organization.update({ where: { id: orgId }, data: { walletBalance: { decrement: cost } } });
      await tx.usage.create({ data: { organizationId: orgId, type, cost } });

      // If balance hits zero, automatically disable AI toggles
      if (Number(updated.walletBalance) === 0) {
        await tx.organization.update({ where: { id: orgId }, data: { aiRepliesEnabled: false, aiCallsEnabled: false } });
      }

      return { ok: true, balance: Number(updated.walletBalance) };
    });

    if (!result.ok) return res.status(402).json({ error: 'Insufficient funds' });
    res.json({ balance: result.balance });
  } catch (e) {
    console.error('deduct error', e);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
