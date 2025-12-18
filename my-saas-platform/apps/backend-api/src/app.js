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

const app = express();

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

app.get('/', (req, res) => res.json({ ok: true }));

module.exports = app;
