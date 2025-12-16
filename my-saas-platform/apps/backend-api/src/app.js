const express = require('express');
const morgan = require('morgan');
const campaignsRouter = require('./routes/campaigns');
const webhooksRouter = require('./routes/webhooks');
const contactsRouter = require('./routes/contacts');
const walletRouter = require('./routes/wallet');
const settingsRouter = require('./routes/settings');
const marketplaceRouter = require('./routes/marketplace');

const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.use('/campaigns', campaignsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/contacts', contactsRouter);
app.use('/wallet', walletRouter);
app.use('/settings', settingsRouter);
app.use('/marketplace', marketplaceRouter);

app.get('/', (req, res) => res.json({ ok: true }));

module.exports = app;
