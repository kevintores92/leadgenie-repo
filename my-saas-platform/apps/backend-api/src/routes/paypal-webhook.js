const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// PayPal webhook receiver (expects raw body parsed in app.js middleware)
router.post('/paypal', async (req, res) => {
  try {
    const event = req.body;
    // Store raw webhook event for auditing
    try {
      await prisma.webhookEvent.create({ data: { externalId: event?.id || '', type: event?.event_type || 'paypal.unknown', data: event } });
    } catch (e) {
      console.error('Failed to store webhook event', e && e.message);
    }

    // Handle subscription activation events
    const type = event?.event_type || '';
    const resource = event?.resource || {};

    if (type.startsWith('BILLING.SUBSCRIPTION')) {
      const subscriptionId = resource?.id || resource?.subscription_id || null;
      const status = resource?.status || null;
      if (subscriptionId) {
        try {
          // Find organization subscription by providerSubId and update status
          const sub = await prisma.organizationSubscription.findUnique({ where: { providerSubId: subscriptionId } });
          if (sub) {
            await prisma.organizationSubscription.update({ where: { id: sub.id }, data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'PAST_DUE', updatedAt: new Date() } });
          }
        } catch (e) {
          console.error('Failed to update subscription status from PayPal webhook', e && e.message);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('paypal webhook error', err && err.message);
    res.status(500).send('ERROR');
  }
});

module.exports = router;
