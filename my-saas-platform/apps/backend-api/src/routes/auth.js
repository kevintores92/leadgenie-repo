const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, orgId: user.orgId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function provisionTrialSendingNumber({ orgId, areaCode }) {
  const FAKE = process.env.FAKE_TWILIO === '1';
  const label = 'trial';

  // If org already has at least one sending number, don't create another automatically.
  const existing = await prisma.sendingNumber.findFirst({ where: { organizationId: orgId } });
  if (existing) {
    return { created: false, number: existing.phoneNumber, reason: 'already_has_number' };
  }

  if (FAKE) {
    const fake = `+1555${Math.floor(Math.random() * 900000) + 100000}`;
    const rec = await prisma.sendingNumber.create({
      data: { organizationId: orgId, phoneNumber: fake, label },
    });
    return { created: true, number: rec.phoneNumber, fake: true };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { created: false, reason: 'missing_twilio_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(accountSid, authToken);

  const count = 1;
  const desiredAreaCode = areaCode || undefined;
  const avail = await client.availablePhoneNumbers('US').local.list({ areaCode: desiredAreaCode, limit: count });
  if (!avail || avail.length === 0) {
    return { created: false, reason: 'no_numbers_available' };
  }

  const candidate = avail[0];
  const purchased = await client.incomingPhoneNumbers.create({ phoneNumber: candidate.phoneNumber });
  const rec = await prisma.sendingNumber.create({
    data: { organizationId: orgId, phoneNumber: purchased.phoneNumber, label },
  });
  return { created: true, number: rec.phoneNumber, fake: false };
}

async function createTwilioSubaccountIfConfigured({ orgId, brandId }) {
  const masterAccountSid = process.env.TWILIO_MASTER_ACCOUNT_SID;
  const masterAuthToken = process.env.TWILIO_MASTER_AUTH_TOKEN;
  if (!masterAccountSid || !masterAuthToken) {
    return { created: false, reason: 'missing_twilio_subaccount_master_creds' };
  }

  const Twilio = require('twilio');
  const client = Twilio(masterAccountSid, masterAuthToken);

  // If brand already has a subaccount, do not create another.
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { created: false, reason: 'brand_not_found' };
  if (brand.twilioSubaccountSid) {
    return { created: false, reason: 'already_has_subaccount', subaccountSid: brand.twilioSubaccountSid };
  }

  const friendlyName = `LeadGenie-${orgId}`;

  // Twilio may or may not return authToken. We store it only if present.
  const acct = await client.api.accounts.create({ friendlyName });
  const subaccountSid = acct && acct.sid;
  const subaccountAuthToken = acct && (acct.authToken || acct.auth_token);

  if (!subaccountSid) {
    return { created: false, reason: 'twilio_subaccount_create_failed' };
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      twilioSubaccountSid: subaccountSid,
      subaccountAuthToken: subaccountAuthToken || null,
    },
  });

  return { created: true, subaccountSid, hasAuthToken: Boolean(subaccountAuthToken) };
}

// Lightweight healthcheck for proxying
router.get('/ping', async (req, res) => {
  res.json({ ok: true, service: 'auth', env: process.env.NODE_ENV || 'development' });
});

// Login: accept email or username + password
router.post('/login', async (req, res) => {
  const { email, username, password } = req.body || {};
  if ((!email && !username) || !password) return res.status(400).json({ error: 'missing credentials' });
  // Dev bypass: if DEV_AUTH_EMAIL and DEV_AUTH_PASSWORD are set, accept those credentials
  const devEmail = process.env.DEV_AUTH_EMAIL;
  const devPass = process.env.DEV_AUTH_PASSWORD;
  if (devEmail && devPass && email === devEmail && String(password) === String(devPass)) {
    // ensure dev user exists
    let user = await prisma.user.findUnique({ where: { email: devEmail } });
    if (!user) {
      let org = await prisma.organization.findFirst();
      if (!org) org = await prisma.organization.create({ data: { name: 'Dev Org' } });
      const uname = devEmail.split('@')[0];
      const hash = await bcrypt.hash(String(devPass), 10);
      user = await prisma.user.create({ data: { username: uname, email: devEmail, passwordHash: hash, orgId: org.id } });
    }
    const token = signToken(user);
    return res.json({ ok: true, redirect: '/dashboard', token, user: { id: user.id, username: user.username, email: user.email, orgId: user.orgId } });
  }
  let user = null;
  if (email) user = await prisma.user.findUnique({ where: { email } });
  if (!user && username) user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ error: 'user not found' });
  const valid = user.passwordHash ? await bcrypt.compare(String(password), user.passwordHash) : false;
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken(user);
  res.json({ ok: true, redirect: '/dashboard', token, user: { id: user.id, username: user.username, email: user.email, orgId: user.orgId } });
});

// Simple signup stub (creates a user for dev). Returns redirect to dashboard.
router.post('/signup', async (req, res) => {
  const { username, email, password, organizationName, areaCode, timeZone } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing username or password' });

  // create user if not exists
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: 'username already exists' });

  const hash = await bcrypt.hash(String(password), 10);

  // Create core records (org/user/brand/wallet/subscription) first.
  const created = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: organizationName || `${username}'s Organization`,
        areaCode: areaCode || null,
        timeZone: timeZone || null,
        aiRepliesEnabled: true,
        aiCallsEnabled: false,
      },
    });

    const user = await tx.user.create({
      data: {
        username,
        email: email || null,
        passwordHash: hash,
        orgId: org.id,
      },
    });

    // Default brand required by many org flows.
    const brand = await tx.brand.create({
      data: {
        orgId: org.id,
        name: organizationName || `${username} Brand`,
        callingMode: 'SMS',
      },
    });

    // Seed wallet + subscription so workers can send during trial.
    const trialBalanceCents = Number(process.env.TRIAL_WALLET_CENTS || '500');
    await tx.organizationWallet.create({
      data: {
        organizationId: org.id,
        balanceCents: Number.isFinite(trialBalanceCents) ? trialBalanceCents : 0,
        isFrozen: false,
      },
    });

    // Subscription is required by worker billing gate. Use a deterministic unique providerSubId.
    const trialDays = Number(process.env.TRIAL_DAYS || '7');
    const currentPeriodEnd = new Date(Date.now() + (Number.isFinite(trialDays) ? trialDays : 7) * 24 * 60 * 60 * 1000);
    await tx.organizationSubscription.create({
      data: {
        organizationId: org.id,
        provider: 'PAYPAL',
        providerSubId: `trial_${org.id}_${uuidv4()}`,
        planId: 'TRIAL',
        status: 'ACTIVE',
        currentPeriodEnd,
      },
    });

    // Set user's active brand
    await tx.user.update({ where: { id: user.id }, data: { activeBrandId: brand.id } });

    return { org, user: { ...user, activeBrandId: brand.id }, brand };
  });

  // Best-effort Twilio provisioning (do not fail signup if Twilio is misconfigured).
  let twilioSubaccount = null;
  let trialNumber = null;
  try {
    twilioSubaccount = await createTwilioSubaccountIfConfigured({ orgId: created.org.id, brandId: created.brand.id });
  } catch (e) {
    twilioSubaccount = { created: false, reason: 'twilio_subaccount_error', details: e && e.message };
  }

  try {
    trialNumber = await provisionTrialSendingNumber({ orgId: created.org.id, areaCode: created.org.areaCode });
  } catch (e) {
    trialNumber = { created: false, reason: 'trial_number_error', details: e && e.message };
  }

  const token = signToken(created.user);
  res.status(201).json({
    ok: true,
    redirect: '/dashboard',
    token,
    user: { id: created.user.id, username: created.user.username, email: created.user.email, orgId: created.user.orgId, activeBrandId: created.user.activeBrandId },
    organization: { id: created.org.id, name: created.org.name, areaCode: created.org.areaCode, timeZone: created.org.timeZone },
    brand: { id: created.brand.id, name: created.brand.name },
    provisioning: { twilioSubaccount, trialNumber },
  });
});

module.exports = router;
