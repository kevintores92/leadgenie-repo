const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { normalizePhone } = require('../utils/normalizePhone');
const { normalizeAddress } = require('../utils/normalizeAddress');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

function authenticate(req, res, next) {
  // Prefer Bearer JWT (used by AI_LG and /upload). Fallback to x-organization-id for legacy/dev.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded?.orgId) return res.status(401).json({ error: 'unauthorized' });
      req.auth = { organizationId: decoded.orgId, userId: decoded.id };
      return next();
    } catch (e) {
      // If caller also provided x-organization-id (dev/legacy), fall back to that.
      // Otherwise, treat as unauthorized.
      const orgId = req.header('x-organization-id');
      if (!orgId) return res.status(401).json({ error: 'authentication failed' });
    }
  }

  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId, userId: req.header('x-user-id') || null };
  next();
}

router.use(authenticate);

// GET all contacts (DB)
router.get('/', async (req, res) => {
  try {
    const orgId = req.auth.organizationId;
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: {
        customFields: { include: { fieldDefinition: true } },
      },
    });

    const shaped = contacts.map((c) => ({
      ...c,
      customFields: (c.customFields || []).map((v) => ({
        name: v.fieldDefinition?.name,
        type: v.fieldDefinition?.type,
        value: v.value,
      })),
    }));

    res.json(shaped);
  } catch (error) {
    console.error('Error loading contacts:', error);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

// Custom field definitions for a brand
router.get('/custom-fields/definitions', async (req, res) => {
  try {
    const orgId = req.auth.organizationId;
    const brandId = String(req.query.brandId || '');
    if (!brandId) return res.status(400).json({ error: 'missing brandId' });

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

    const defs = await prisma.customFieldDefinition.findMany({
      where: { brandId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(defs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load definitions' });
  }
});

// Get custom fields for a contact
router.get('/:id/custom-fields', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  const brand = await prisma.brand.findUnique({ where: { id: contact.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  const values = await prisma.contactCustomField.findMany({
    where: { contactId: id },
    include: { fieldDefinition: true },
    orderBy: { createdAt: 'asc' },
  });

  res.json(values.map((v) => ({
    id: v.id,
    name: v.fieldDefinition?.name,
    type: v.fieldDefinition?.type,
    value: v.value,
  })));
});

// Upsert custom fields for a contact. Body: { fields: { [name]: any } }
router.put('/:id/custom-fields', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;
  const fields = (req.body && req.body.fields) || {};
  if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'invalid fields payload' });

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  const brand = await prisma.brand.findUnique({ where: { id: contact.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  const names = Object.keys(fields)
    .map((n) => String(n).trim())
    .filter(Boolean)
    .slice(0, 200);

  const existingDefs = await prisma.customFieldDefinition.findMany({
    where: { brandId: contact.brandId, name: { in: names } },
  });
  const defByName = new Map(existingDefs.map((d) => [d.name, d]));

  for (const name of names) {
    if (!defByName.has(name)) {
      const created = await prisma.customFieldDefinition.create({
        data: { brandId: contact.brandId, name, type: 'STRING' },
      });
      defByName.set(name, created);
    }
  }

  const defs = Array.from(defByName.values());
  const defIdByName = new Map(defs.map((d) => [d.name, d.id]));
  const defIds = defs.map((d) => d.id);

  const existing = await prisma.contactCustomField.findMany({
    where: { contactId: id, fieldDefinitionId: { in: defIds } },
  });
  const existingByDefId = new Map(existing.map((v) => [v.fieldDefinitionId, v]));

  for (const name of names) {
    const defId = defIdByName.get(name);
    if (!defId) continue;
    const value = fields[name];
    const existingValue = existingByDefId.get(defId);
    if (existingValue) {
      await prisma.contactCustomField.update({
        where: { id: existingValue.id },
        data: { value },
      });
    } else {
      await prisma.contactCustomField.create({
        data: { contactId: id, fieldDefinitionId: defId, value },
      });
    }
  }

  res.json({ ok: true });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;
  const allowed = [
    'firstName',
    'lastName',
    'phone',
    'propertyAddress',
    'propertyCity',
    'propertyState',
    'propertyZip',
    'mailingAddress',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'status',
    'tags',
    'hasReplied',
  ];
  const payload = {};
  for (const k of allowed) if (k in req.body) payload[k] = req.body[k];

  // Normalize before DB writes.
  if (typeof payload.phone === 'string') {
    const nextRaw = payload.phone.trim();
    if (!nextRaw) {
      return res.status(400).json({ error: 'invalid phone', message: 'Phone cannot be empty' });
    }
    const e164 = normalizePhone(nextRaw, 'US');
    if (!e164) {
      return res.status(400).json({
        error: 'invalid phone',
        message: 'Phone must be a valid number (we accept many formats; it will be saved as +1XXXXXXXXXX).',
      });
    }
    payload.phone = e164;
  }
  if (typeof payload.propertyAddress === 'string') payload.propertyAddress = normalizeAddress(payload.propertyAddress);
  if (typeof payload.mailingAddress === 'string') payload.mailingAddress = normalizeAddress(payload.mailingAddress);

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'contact not found' });

  // verify brand -> org
  const brand = await prisma.brand.findUnique({ where: { id: existing.brandId } });
  if (!brand || brand.orgId !== orgId) return res.status(403).json({ error: 'forbidden' });

  // create audit entry: compute changed fields
  const changed = {};
  for (const k of Object.keys(payload)) {
    // normalize undefined/null differences
    const before = existing[k] === undefined ? null : existing[k];
    const after = payload[k] === undefined ? null : payload[k];
    if (String(before) !== String(after)) changed[k] = { before, after };
  }

  const updated = await prisma.contact.update({ where: { id }, data: payload });

  try {
    const changedByUserId = req.header('x-user-id') || null;
    const changedBy = req.header('x-user') || null;
    if (Object.keys(changed).length > 0) {
      await prisma.contactAudit.create({ data: {
        contactId: id,
        changedByUserId,
        changedBy,
        changes: changed,
        action: 'UPDATE'
      }});
    }
  } catch (e) {
    console.error('audit log error', e);
  }

  res.json(updated);
});

module.exports = router;
