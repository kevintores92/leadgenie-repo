/**
 * Validated Lists API Routes
 * Stores and retrieves phone-validated contact lists
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /lists/validated
 * Save a validated contact list
 */
router.post('/validated', async (req, res) => {
  try {
    const { fileName, totalRows, verifiedMobile, verifiedLandline, validatedData } = req.body;
    const organizationId = req.headers['x-organization-id'];

    if (!fileName || !totalRows || !organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store validated list in database
    const validatedList = await prisma.validatedList.create({
      data: {
        organizationId: String(organizationId),
        fileName,
        totalRows,
        verifiedMobile: verifiedMobile || 0,
        verifiedLandline: verifiedLandline || 0,
        validatedData: JSON.stringify(validatedData || []),
        createdAt: new Date()
      }
    });

    res.json({
      id: validatedList.id,
      fileName: validatedList.fileName,
      totalRows: validatedList.totalRows,
      verifiedMobile: validatedList.verifiedMobile,
      verifiedLandline: validatedList.verifiedLandline,
      createdAt: validatedList.createdAt
    });
  } catch (error) {
    console.error('Failed to save validated list:', error);
    res.status(500).json({ error: 'Failed to save validated list' });
  }
});

/**
 * GET /lists/validated/:id
 * Retrieve a specific validated list
 */
router.get('/validated/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'];

    const validatedList = await prisma.validatedList.findFirst({
      where: {
        id: parseInt(id),
        organizationId: String(organizationId)
      }
    });

    if (!validatedList) {
      return res.status(404).json({ error: 'Validated list not found' });
    }

    res.json({
      id: validatedList.id,
      fileName: validatedList.fileName,
      totalRows: validatedList.totalRows,
      verifiedMobile: validatedList.verifiedMobile,
      verifiedLandline: validatedList.verifiedLandline,
      validatedData: JSON.parse(validatedList.validatedData || '[]'),
      createdAt: validatedList.createdAt
    });
  } catch (error) {
    console.error('Failed to retrieve validated list:', error);
    res.status(500).json({ error: 'Failed to retrieve validated list' });
  }
});

/**
 * GET /lists/validated
 * Get all validated lists for an organization
 */
router.get('/validated', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'];

    const lists = await prisma.validatedList.findMany({
      where: {
        organizationId: String(organizationId)
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        fileName: true,
        totalRows: true,
        verifiedMobile: true,
        verifiedLandline: true,
        createdAt: true
      }
    });

    res.json(lists);
  } catch (error) {
    console.error('Failed to retrieve validated lists:', error);
    res.status(500).json({ error: 'Failed to retrieve validated lists' });
  }
});

export default router;
