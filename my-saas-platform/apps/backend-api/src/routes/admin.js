const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');
const path = require('path');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ADMIN_SHARED_SECRET = process.env.ADMIN_SHARED_SECRET || null;

function requireAdmin(req, res, next) {
  if (!ADMIN_SHARED_SECRET) return next(); // no secret set — allow (useful for dev)
  const header = (req.headers['x-admin-secret'] || req.headers['x-admin-token'] || '').toString();
  if (!header || header !== ADMIN_SHARED_SECRET) return res.status(401).json({ error: 'admin auth required' });
  return next();
}

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

// Admin: create a dev user and return a JWT (dev bypass)
router.post('/dev-login', requireAdmin, async (req, res) => {
  try {
    // create/find an organization and user for quick dev access
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({ data: { name: 'Dev Org' } });
    }

    // reuse or create a brand
    let brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { orgId: org.id, name: 'Dev Brand', callingMode: 'SMS' } });
    }

    const now = Date.now();
    const email = req.body?.email || `dev+${now}@example.local`;
    const username = req.body?.username || `dev_${Math.floor(now/1000)}`;
    // create a user if not found
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const pass = Math.random().toString(36).slice(2, 10);
      const hash = await bcrypt.hash(pass, 10);
      user = await prisma.user.create({ data: { username, email, passwordHash: hash, orgId: org.id, activeBrandId: brand.id } });
    }

    const token = jwt.sign({ id: user.id, username: user.username, orgId: user.orgId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ ok: true, token, user: { id: user.id, username: user.username, email: user.email, orgId: user.orgId, activeBrandId: brand.id }, redirect: '/campaigns' });
  } catch (e) {
    console.error('dev-login error', e && e.message);
    res.status(500).json({ error: 'dev-login-failed', message: e && e.message });
  }
});

// Admin: purchase Twilio numbers by invoking the admin script. Expects body { brandId, areaCode, count, voiceUrl, smsUrl }
router.post('/purchase-twilio-numbers', requireAdmin, async (req, res) => {
  const { brandId, areaCode, count, voiceUrl, smsUrl } = req.body || {};
  if (!brandId || !voiceUrl) return res.status(400).json({ error: 'missing brandId or voiceUrl' });

  // Path to the script
  const scriptPath = path.join(__dirname, '../../scripts/create_subaccount_and_purchase_numbers.js');

  // Prepare env for child
  const childEnv = Object.assign({}, process.env, {
    BRAND_ID: String(brandId),
    AREA_CODE: areaCode || '614',
    COUNT: String(count || 3),
    VOICE_URL: voiceUrl,
    SMS_URL: smsUrl || ''
  });

  try {
    const child = spawn(process.execPath, [scriptPath], { env: childEnv });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      // send final status to the client by storing logs in DB or returning via a status endpoint.
      // For now, respond with combined output.
    });

    // Immediately return accepted and child PID; logs can be checked in server logs
    res.status(202).json({ ok: true, pid: child.pid, message: 'Started Twilio purchase job; check server logs for progress.' });
  } catch (e) {
    console.error('purchase-twilio-numbers failed', e && e.message);
    res.status(500).json({ error: 'purchase_failed', message: e && e.message });
  }
});
