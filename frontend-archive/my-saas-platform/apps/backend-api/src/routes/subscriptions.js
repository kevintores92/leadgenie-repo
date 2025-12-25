const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Confirm subscription for authenticated user's organization
router.post('/confirm', async (req, res) => {
  try {
    const auth = (req.headers.authorization || '').split(' ');
    if (auth.length !== 2 || auth[0] !== 'Bearer') return res.status(401).json({ error: 'missing token' });
    const token = auth[1];
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'invalid token' }); }

    const userId = decoded.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const orgId = user.orgId;
    const { subscriptionId, provider = 'PAYPAL', planId = 'default' } = req.body || {};
    if (!subscriptionId) return res.status(400).json({ error: 'missing subscriptionId' });

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Upsert organization subscription
    await prisma.organizationSubscription.upsert({
      where: { organizationId: orgId },
      update: {
        provider,
        providerSubId: subscriptionId,
        planId,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd
      },
      create: {
        organizationId: orgId,
        provider,
        providerSubId: subscriptionId,
        planId,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd
      }
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('subscriptions/confirm error', err && err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
