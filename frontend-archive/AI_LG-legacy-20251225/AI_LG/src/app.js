const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const authRouter = require('./routes/auth');
const campaignsRouter = require('./routes/campaigns');
const webhooksRouter = require('./routes/webhooks');
const contactsRouter = require('./routes/contacts');
const walletRouter = require('./routes/wallet');
const settingsRouter = require('./routes/settings');
const marketplaceRouter = require('./routes/marketplace');
const adminRouter = require('./routes/admin');
const aiRouter = require('./routes/ai');
const paypalWebhookRouter = require('../routes/paypal-webhook');
const uploadRouter = require('../routes/upload');
const voiceRouter = require('./routes/voice');
const statsRouter = require('./routes/stats');
const organizationRouter = require('./routes/organization');
const validatedListsRouter = require('../routes/validated-lists');
const verificationRouter = require('./routes/verification');
const complianceRouter = require('../routes/compliance');

const app = express();

// PayPal webhook requires raw body for signature verification
// This must come BEFORE other body parsers for the /webhooks/paypal route
app.use('/webhooks/paypal', express.raw({ type: 'application/json' }), (req, res, next) => {
  (req).rawBody = req.body; // Store raw body for signature verification
  req.body = JSON.parse(req.body.toString());
  next();
});

app.use(express.json());
app.use(morgan('dev'));

// Allow CORS from the dev client and other origins
app.use(cors({ origin: true, credentials: true }));

app.use('/auth', authRouter);
app.use('/campaigns', campaignsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/contacts', contactsRouter);
app.use('/wallet', walletRouter);
app.use('/settings', settingsRouter);
app.use('/marketplace', marketplaceRouter);
app.use('/admin', adminRouter);
app.use('/ai', aiRouter);
app.use('/upload', uploadRouter);
app.use('/webhooks', voiceRouter); // Vapi voice webhooks
app.use('/stats', statsRouter);
app.use('/organization', organizationRouter);
app.use('/lists', validatedListsRouter);
app.use('/verification', verificationRouter);
app.use('/compliance', complianceRouter);
app.use('/', paypalWebhookRouter);

app.get('/', (req, res) => res.json({ ok: true }));

module.exports = app;
