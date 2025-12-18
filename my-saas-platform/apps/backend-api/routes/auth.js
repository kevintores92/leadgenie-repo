const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Simple in-memory user store for now (until DB migration runs)
const users = new Map();

async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check in-memory store first
    const user = users.get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
        activeBrandId: user.activeBrandId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

// Login endpoint
router.post('/login', handleLogin);
// Neon-style endpoint mapping
router.post('/sign-in/email', handleLogin);

// Lightweight ping for proxy / health checks
router.get('/ping', (req, res) => res.json({ ok: true, route: '/auth/ping' }));
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check in-memory store first
    const user = users.get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
        activeBrandId: user.activeBrandId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

async function handleSignup(req, res) {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if username already exists
    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in memory
    const userId = `user-${Date.now()}`;
    const orgId = `org-${Date.now()}`;
    
    const user = {
      id: userId,
      username,
      email: email || username,
      passwordHash,
      orgId,
      activeBrandId: null,
    };

    users.set(username, user);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
        activeBrandId: user.activeBrandId,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
}

// Signup endpoint
router.post('/signup', handleSignup);
// Neon-style endpoint mapping
router.post('/sign-up/email', handleSignup);
  try {
    const { username, email, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if username already exists
    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in memory
    const userId = `user-${Date.now()}`;
    const orgId = `org-${Date.now()}`;
    
    const user = {
      id: userId,
      username,
      email: email || username,
      passwordHash,
      orgId,
      activeBrandId: null,
    };

    users.set(username, user);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        orgId: user.orgId,
        activeBrandId: user.activeBrandId,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

module.exports = router;

