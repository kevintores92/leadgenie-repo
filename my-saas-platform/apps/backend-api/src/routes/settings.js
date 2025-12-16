const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { readSettings, writeSettings } = require('../lib/fileSettings');

router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

router.get('/', async (req, res) => {
  const orgId = req.auth.organizationId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } }).catch(()=>null);
  if (!org) return res.status(404).json({ error: 'organization not found' });
  // file-backed settings (fallback until DB migration applied)
  const fsSettings = readSettings();
  const orgSettings = fsSettings[orgId] || {};
  res.json({ aiRepliesEnabled: !!org.aiRepliesEnabled, aiCallsEnabled: !!org.aiCallsEnabled, reenqueueDeferred: !!orgSettings.reenqueueDeferred, duplicateWindowHours: Number(orgSettings.duplicateWindowHours || 24) });
});

// feature support endpoint - checks if nextEligibleAt column exists
router.get('/feature-support', async (req, res) => {
  try {
    // try selecting the column to verify migration applied
    await prisma.$queryRawUnsafe('SELECT "nextEligibleAt" FROM "Contact" LIMIT 1;');
    return res.json({ migrationApplied: true });
  } catch (e) {
    return res.json({ migrationApplied: false, error: String(e.message || e) });
  }
});

router.post('/ai-replies-toggle', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'invalid payload' });
  const updated = await prisma.organization.update({ where: { id: orgId }, data: { aiRepliesEnabled: enabled } });
  res.json({ aiRepliesEnabled: !!updated.aiRepliesEnabled });
});

router.post('/ai-calls-toggle', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'invalid payload' });
  const updated = await prisma.organization.update({ where: { id: orgId }, data: { aiCallsEnabled: enabled } });
  res.json({ aiCallsEnabled: !!updated.aiCallsEnabled });
});

router.post('/reenqueue-toggle', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'invalid payload' });
  const fsSettings = readSettings();
  fsSettings[orgId] = fsSettings[orgId] || {};
  fsSettings[orgId].reenqueueDeferred = !!enabled;
  writeSettings(fsSettings);
  res.json({ reenqueueDeferred: !!enabled });
});

router.post('/duplicate-window', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { hours } = req.body;
  const h = Number(hours || 24);
  if (!Number.isFinite(h) || h <= 0) return res.status(400).json({ error: 'invalid hours' });
  const fsSettings = readSettings();
  fsSettings[orgId] = fsSettings[orgId] || {};
  fsSettings[orgId].duplicateWindowHours = Math.floor(h);
  writeSettings(fsSettings);
  res.json({ duplicateWindowHours: Math.floor(h) });
});

module.exports = router;
