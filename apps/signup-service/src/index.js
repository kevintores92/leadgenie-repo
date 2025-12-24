require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Prefer local installed @prisma/client; avoid hardcoded cross-package paths which break in containers
let PrismaClient;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch (e) {
  // Fallback to workspace path if available (legacy), else rethrow
  try {
    ({ PrismaClient } = require('../../../my-saas-platform/apps/backend-api/node_modules/@prisma/client'));
  } catch (err) {
    console.error('Failed to load @prisma/client from both local node_modules and workspace path.');
    throw err;
  }
}
const Twilio = require('twilio');

const app = express();
// For PayPal webhook verification we must access raw body for signature checks
// We only capture raw body for the PayPal webhook path; all other routes use normal JSON parsing.
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (req.method === 'POST' && contentType.indexOf('application/json') !== -1 && (req.path === '/paypal/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch (e) { req.body = {}; }
      next();
    });
  } else {
    // Enforce configurable allowed origins for CORS
    const allowed = (process.env.ALLOWED_ORIGINS || 'https://leadgenie.online,https://app.leadgenie.online').split(',').map(s => s.trim()).filter(Boolean);
    const corsOptions = {
      origin: function (origin, callback) {
        // allow requests with no origin (e.g., server-to-server or native clients)
        if (!origin) return callback(null, true);
        if (allowed.indexOf(origin) !== -1) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    };

    cors(corsOptions)(req, res, () => {
      bodyParser.json()(req, res, next);
    });
  }
});

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_JWT_SECRET || 'dev-secret';

const prisma = new PrismaClient();

app.get('/health', (req, res) => res.json({ ok: true, service: 'signup-service' }));

// Create organization, user, brand, wallet and optional subscription
app.post('/signup', async (req, res) => {
  const { email, password, legalName, brandName, subscription } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { legalName: legalName || brandName || email, timeZone: 'UTC', walletBalance: 0 } });
      const user = await tx.user.create({ data: { email: email.toLowerCase(), passwordHash: hashed, orgId: org.id, role: 'OWNER' } });
      const brand = await tx.brand.create({ data: { orgId: org.id, name: brandName || legalName || 'New Brand' } });
      const wallet = await tx.wallet.create({ data: { organizationId: org.id, balance: 0 } }).catch(() => null);

      // persist subscription if provided
      let orgSub = null;
      if (subscription && subscription.provider && subscription.providerSubscriptionId) {
        orgSub = await tx.organizationSubscription.create({ data: { organizationId: org.id, provider: subscription.provider, providerSubscriptionId: subscription.providerSubscriptionId, status: 'ACTIVE', planId: subscription.planId || null } });
      }

      return { org, user, brand, wallet, orgSub };
    });

    const token = jwt.sign({ sub: result.user.id, email: result.user.email, orgId: result.org.id }, JWT_SECRET, { expiresIn: '30d' });

    // Optionally create Twilio subaccount for brand if master creds are present
    if (process.env.TWILIO_MASTER_ACCOUNT_SID && process.env.TWILIO_MASTER_AUTH_TOKEN) {
      try {
        const master = Twilio(process.env.TWILIO_MASTER_ACCOUNT_SID, process.env.TWILIO_MASTER_AUTH_TOKEN);
        const sub = await master.api.accounts.create({ friendlyName: `sub-${result.brand.id}` });
        // Twilio returns authToken only at creation; if not returned, we can't retrieve it
        const authToken = sub.authToken || null;
        await prisma.brand.update({ where: { id: result.brand.id }, data: { twilioSubaccountSid: sub.sid, subaccountAuthToken: authToken } });
      } catch (e) {
        console.warn('Twilio subaccount creation failed', e && e.message);
      }
    }

    return res.json({ user: { id: result.user.id, email: result.user.email }, org: { id: result.org.id }, brand: { id: result.brand.id }, token });
  } catch (err) {
    console.error('Signup error', err && err.message);
    return res.status(500).json({ error: 'signup_failed', detail: err && (err.message || err) });
  }
});

// Sign in: verify credentials using Prisma
app.post('/signin', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  try {
    const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({ sub: user.id, email: user.email, orgId: user.orgId }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e) {
    console.error('Signin error', e && e.message);
    return res.status(500).json({ error: 'signin_failed' });
  }
});

// Accept subscription confirmation from frontend / payment provider and persist
app.post('/subscribe', async (req, res) => {
  const { orgId, provider, providerSubscriptionId, planId } = req.body || {};
  if (!orgId || !provider || !providerSubscriptionId) return res.status(400).json({ error: 'orgId+provider+providerSubscriptionId required' });
  try {
    const sub = await prisma.organizationSubscription.create({ data: { organizationId: orgId, provider, providerSubscriptionId, planId: planId || null, status: 'ACTIVE' } });
    return res.json({ ok: true, subscription: sub });
  } catch (e) {
    console.error('Subscribe error', e && e.message);
    return res.status(500).json({ error: 'subscribe_failed' });
  }
});

// PayPal webhook verifier endpoint (calls PayPal verify API)
app.post('/paypal/webhook', async (req, res) => {
  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) return res.status(500).json({ error: 'missing_paypal_webhook_id' });

  try {
    const verifyPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: req.body,
    };

    const tokenRes = await fetch(`${process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    const verifyRes = await fetch(`${process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload)
    });
    const verifyJson = await verifyRes.json();

    if (verifyJson.verification_status === 'SUCCESS') {
      const evt = req.body;
      if (evt.event_type && evt.event_type.startsWith('BILLING.SUBSCRIPTION')) {
        const subId = evt.resource && evt.resource.id;
        try {
          await prisma.organizationSubscription.create({ data: { organizationId: evt.resource.custom_id || null, provider: 'paypal', providerSubscriptionId: subId, status: 'ACTIVE' } });
        } catch (e) { }
      }
      return res.status(200).send('OK');
    } else {
      console.warn('PayPal verify failed', verifyJson);
      return res.status(400).json({ ok: false, verify: verifyJson });
    }
  } catch (e) {
    console.error('PayPal webhook verify error', e && e.message);
    return res.status(500).json({ error: 'paypal_verify_failed' });
  }
});

// 10DLC registration endpoint: persist brand registration intent
app.post('/10dlc/register', async (req, res) => {
  const { organizationId, brandProfile, campaigns } = req.body || {};
  if (!organizationId || !brandProfile) return res.status(400).json({ error: 'organizationId+brandProfile required' });
  try {
    const reg = await prisma.tenDlcRegistration.create({ data: { organizationId, brandProfile, campaigns: campaigns || [] } });
    return res.json({ ok: true, registration: reg });
  } catch (e) {
    console.error('10DLC register failed', e && e.message);
    return res.status(500).json({ error: '10dlc_register_failed' });
  }
});

// Compatibility routes expected by frontend
app.post('/auth/signup', async (req, res) => {
  // Reuse the same signup logic shape but accept multiple frontend payload shapes
  const { email, password } = req.body || {};
  // accept different keys from various frontends
  const legalName = req.body.legalName || req.body.organizationName || req.body.username || null;
  const brandName = req.body.brandName || req.body.organizationName || null;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { legalName: legalName || brandName || email, timeZone: 'UTC', walletBalance: 0 } });
      const user = await tx.user.create({ data: { email: email.toLowerCase(), passwordHash: hashed, orgId: org.id, role: 'OWNER' } });
      const brand = await tx.brand.create({ data: { orgId: org.id, name: brandName || legalName || 'New Brand' } });
      return { org, user, brand };
    });
    const token = jwt.sign({ sub: result.user.id, email: result.user.email, orgId: result.org.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user: { id: result.user.id, email: result.user.email, orgId: result.org.id } });
  } catch (e) {
    console.error('auth/signup error', e && e.message);
    return res.status(500).json({ error: 'signup_failed' });
  }
});

app.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  try {
    const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({ sub: user.id, email: user.email, orgId: user.orgId }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user: { id: user.id, email: user.email, orgId: user.orgId } });
  } catch (e) {
    console.error('auth/signin error', e && e.message);
    return res.status(500).json({ error: 'signin_failed' });
  }
});

app.listen(PORT, () => console.log(`signup-service listening on ${PORT}`));
