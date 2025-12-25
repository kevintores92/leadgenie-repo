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

router.get('/numbers', async (req, res) => {
  const orgId = req.auth.organizationId;
  const nums = await prisma.sendingNumber.findMany({ where: { organizationId: orgId } });
  res.json(nums);
});

// Provision numbers via Twilio or fake provisioning (for dev) per plan
router.post('/add', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { marketplace = 'default', count: requestedCount, areaCode } = req.body || {};

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'org not found' });

  const perMarketplace = org.plan === 'PRO' ? 10 : 5;
  const count = typeof requestedCount === 'number' && requestedCount > 0 ? requestedCount : perMarketplace;

  const created = [];
  const FAKE = process.env.FAKE_TWILIO === '1';

  if (FAKE) {
    for (let i = 0; i < count; i++) {
      const fake = `+1555${Math.floor(Math.random() * 900000) + 100000}`;
      const rec = await prisma.sendingNumber.create({ data: { organizationId: orgId, phoneNumber: fake, label: marketplace } });
      created.push(rec);
    }
  } else {
    const Twilio = require('twilio');
    const client = Twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || '');
    try {
      const avail = await client.availablePhoneNumbers('US').local.list({ areaCode, limit: count });
      for (const a of avail) {
        try {
          const purchased = await client.incomingPhoneNumbers.create({ phoneNumber: a.phoneNumber });
          const rec = await prisma.sendingNumber.create({ data: { organizationId: orgId, phoneNumber: purchased.phoneNumber, label: marketplace } });
          created.push(rec);
        } catch (e) {
          console.error('purchase failed', e && e.message);
        }
      }
    } catch (e) {
      console.error('twilio search failed', e && e.message);
      return res.status(500).json({ error: 'twilio error' });
    }
  }

  // record marketplace purchase on org (append)
  try {
    await prisma.organization.update({ where: { id: orgId }, data: { marketplaces: { push: marketplace } } });
  } catch (e) {
    console.warn('failed to update org marketplaces', e && e.message);
  }

  res.json({ created });
});

module.exports = router;
