const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

// Simple auth middleware for these routes
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

// GET all contacts - load from CSV
router.get('/', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../../../Property Export High+Equity-contact-append.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Map CSV to contact format
    const contacts = records.map((row, idx) => ({
      id: `csv_${idx}`,
      firstName: row['First Name'] || row['Owner 1 First Name'] || '',
      lastName: row['Last Name'] || row['Owner 1 Last Name'] || '',
      email: row['Mobile Phone'] || '',
      phone: row['Mobile Phone'] || '',
      propertyAddress: row['Address'] || '',
      mailingAddress: row['Mailing Address'] || '',
      propertyCity: row['City'] || row['Mailing City'] || '',
      propertyState: row['State'] || row['Mailing State'] || '',
      zipCode: row['Zip'] || row['Mailing Zip'] || '',
      propertyType: row['Property Type'] || '',
      bedrooms: row['Bedrooms'] || '',
      bathrooms: row['Total Bathrooms'] || row['Bathroom Condition'] || '',
      buildingSquft: row['Building Sqft'] || '',
      lotSquft: row['Lot Size Sqft'] || '',
      estValue: row['Est. Value'] || '',
      estEquity: row['Est. Equity'] || '',
      apn: row['APN'] || '',
      rawData: row // Store entire row for flexibility
    }));

    res.json(contacts);
  } catch (error) {
    console.error('Error loading contacts:', error);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth.organizationId;
  const allowed = ['firstName','lastName','phone','email','propertyAddress','mailingAddress','owner','apn','timeZone','newField','beds','baths','zillowEstimate','ac','taxAssessment','roof','garage','propertyType','pool','repairs','rent','lastSoldDate'];
  const payload = {};
  for (const k of allowed) if (k in req.body) payload[k] = req.body[k];

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
