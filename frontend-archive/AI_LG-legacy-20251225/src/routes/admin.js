const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /admin/holds - contacts in HOLD or PAUSED states
router.get('/holds', async (req, res) => {
  const rows = await prisma.contact.findMany({ where: { OR: [{ status: 'HOLD' }, { status: 'PAUSED' }] }, include: { brand: true } });
  const out = rows.map(c => ({ phone: c.phone, campaign: null, reason: c.status, timestamp: c.updatedAt, nextEligibleAt: c.nextEligibleAt }));
  res.json(out);
});

// GET /admin/deferrals - contacts deferred for 24h
router.get('/deferrals', async (req, res) => {
  const rows = await prisma.contact.findMany({ where: { status: 'DEFERRED_24H' } });
  const out = rows.map(c => ({ phone: c.phone, campaign: null, reason: 'DEFERRED_24H', timestamp: c.updatedAt, nextEligibleAt: c.nextEligibleAt }));
  res.json(out);
});

// GET /admin/blocked-numbers - phone numbers blocked or paused for deliverability
router.get('/blocked-numbers', async (req, res) => {
  const rows = await prisma.phoneNumber.findMany({ where: { OR: [{ status: 'BLOCKED' }, { status: 'PAUSED' }] } });
  const out = rows.map(p => ({ phone: p.phoneNumber, reason: p.status, timestamp: p.lastUsedAt || p.createdAt }));
  res.json(out);
});

module.exports = router;
