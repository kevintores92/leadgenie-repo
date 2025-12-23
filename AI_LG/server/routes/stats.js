const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple auth middleware
router.use((req, res, next) => {
  const orgId = req.header('x-organization-id');
  if (!orgId) return res.status(401).json({ error: 'missing org header' });
  req.auth = { organizationId: orgId };
  next();
});

// GET /stats/dashboard - Overall dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const orgId = req.auth.organizationId;
    
    // Total contacts
    const totalContacts = await prisma.contact.count({
      where: { organizationId: orgId }
    });
    
    // Contacts by classification
    const hotLeads = await prisma.contact.count({
      where: { organizationId: orgId, classification: 'HOT' }
    });
    
    const warmLeads = await prisma.contact.count({
      where: { organizationId: orgId, classification: 'WARM' }
    });
    
    const coldLeads = await prisma.contact.count({
      where: { organizationId: orgId, classification: 'COLD' }
    });
    
    // Total SMS sent (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const smsSent = await prisma.sMS.count({
      where: {
        organizationId: orgId,
        sentAt: { gte: thirtyDaysAgo }
      }
    });
    
    // SMS delivered
    const smsDelivered = await prisma.sMS.count({
      where: {
        organizationId: orgId,
        sentAt: { gte: thirtyDaysAgo },
        status: 'DELIVERED'
      }
    });
    
    // SMS responded (count contacts with replies)
    const smsResponded = await prisma.sMS.count({
      where: {
        organizationId: orgId,
        sentAt: { gte: thirtyDaysAgo },
        direction: 'INBOUND'
      }
    });
    
    // Active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        brand: { orgId: orgId },
        status: 'RUNNING'
      }
    });
    
    res.json({
      totalContacts,
      hotLeads,
      warmLeads,
      coldLeads,
      smsSent,
      smsDelivered,
      smsResponded,
      activeCampaigns
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /stats/sms - SMS statistics over time
router.get('/sms', async (req, res) => {
  try {
    const orgId = req.auth.organizationId;
    const { campaignId, days = 7 } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const where = {
      organizationId: orgId,
      sentAt: { gte: daysAgo }
    };
    
    if (campaignId) {
      where.campaignId = campaignId;
    }
    
    // Group by day
    const messages = await prisma.sMS.findMany({
      where,
      select: {
        sentAt: true,
        status: true,
        direction: true
      }
    });
    
    // Aggregate by day
    const dailyStats = {};
    messages.forEach(msg => {
      const day = msg.sentAt.toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { sent: 0, delivered: 0, responded: 0 };
      }
      
      if (msg.direction === 'OUTBOUND') {
        dailyStats[day].sent++;
        if (msg.status === 'DELIVERED') {
          dailyStats[day].delivered++;
        }
      } else if (msg.direction === 'INBOUND') {
        dailyStats[day].responded++;
      }
    });
    
    // Convert to array format
    const data = Object.keys(dailyStats).sort().map(day => ({
      name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      date: day,
      ...dailyStats[day]
    }));
    
    res.json(data);
  } catch (error) {
    console.error('SMS stats error:', error);
    res.status(500).json({ error: 'Failed to fetch SMS stats' });
  }
});

// GET /stats/leads - Leads breakdown by classification
router.get('/leads', async (req, res) => {
  try {
    const orgId = req.auth.organizationId;
    const { campaignId } = req.query;
    
    const where = { organizationId: orgId };
    if (campaignId) {
      // Filter contacts that were sent messages in this campaign
      const campaignContacts = await prisma.sMS.findMany({
        where: { campaignId, organizationId: orgId },
        select: { contactId: true },
        distinct: ['contactId']
      });
      where.id = { in: campaignContacts.map(c => c.contactId) };
    }
    
    const classifications = await prisma.contact.groupBy({
      by: ['classification'],
      where,
      _count: true
    });
    
    const colors = {
      HOT: '#f87171',
      WARM: '#fbbf24',
      COLD: '#60a5fa',
      NOT_INTERESTED: '#6b7280',
      DNC: '#1f2937',
      WRONG_NUMBER: '#9ca3af'
    };
    
    const data = classifications.map(item => ({
      name: item.classification || 'No Status',
      value: item._count,
      color: colors[item.classification] || '#6b7280'
    }));
    
    res.json(data);
  } catch (error) {
    console.error('Leads stats error:', error);
    res.status(500).json({ error: 'Failed to fetch leads stats' });
  }
});

module.exports = router;
