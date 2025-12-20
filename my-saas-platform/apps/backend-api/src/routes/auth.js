const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, orgId: user.orgId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
  const { username, email, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing username or password' });
  // create user if not exists
  let user = await prisma.user.findUnique({ where: { username } });
  if (user) {
    return res.status(409).json({ error: 'username already exists' });
  }

  const hash = await bcrypt.hash(String(password), 10);
  // ensure there is an organization to attach to
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Dev Org' } });
  }

  user = await prisma.user.create({ data: { username, email: email || null, passwordHash: hash, orgId: org.id } });
  const token = signToken(user);
  res.status(201).json({ ok: true, redirect: '/dashboard', token, user: { id: user.id, username: user.username, email: user.email, orgId: user.orgId } });
});

module.exports = router;
