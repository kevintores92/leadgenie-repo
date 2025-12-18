const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

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
    return res.json({ ok: true, redirect: '/dashboard', user: { id: user.id, username: user.username, email: user.email } });
  }
  let user = null;
  if (email) user = await prisma.user.findUnique({ where: { email } });
  if (!user && username) user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ error: 'user not found' });
  const valid = user.passwordHash ? await bcrypt.compare(String(password), user.passwordHash) : false;
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });
  res.json({ ok: true, redirect: '/dashboard', user: { id: user.id, username: user.username, email: user.email } });
});

// Simple signup stub (creates a user for dev). Returns redirect to dashboard.
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing username or password' });
  // create user if not exists
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const hash = await bcrypt.hash(String(password), 10);
    // ensure there is a dev organization to attach to
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({ data: { name: 'Dev Org' } });
    }
    user = await prisma.user.create({ data: { username, email: email || null, passwordHash: hash, orgId: org.id } });
  }
  res.status(201).json({ ok: true, redirect: '/dashboard', user: { id: user.id, username: user.username, email: user.email } });
});

module.exports = router;
