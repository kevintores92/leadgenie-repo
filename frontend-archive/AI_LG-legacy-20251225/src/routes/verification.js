const express = require('express');
const router = express.Router();
const Twilio = require('twilio');

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Send phone verification code via SMS
 * POST /verification/phone/send
 */
router.post('/phone/send', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!VERIFY_SERVICE_SID) {
      return res.status(500).json({ error: 'Verification service not configured' });
    }

    // Send verification code via Twilio Verify
    const verification = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });

    res.json({
      success: true,
      status: verification.status,
      to: phoneNumber
    });
  } catch (error) {
    console.error('Phone verification send error:', error);
    res.status(500).json({
      error: 'Failed to send verification code',
      details: error.message
    });
  }
});

/**
 * Verify phone number with code
 * POST /verification/phone/verify
 */
router.post('/phone/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' });
    }

    if (!VERIFY_SERVICE_SID) {
      return res.status(500).json({ error: 'Verification service not configured' });
    }

    // Verify the code
    const verificationCheck = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phoneNumber,
        code: code
      });

    if (verificationCheck.status === 'approved') {
      res.json({
        success: true,
        verified: true,
        status: verificationCheck.status
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        status: verificationCheck.status,
        error: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('Phone verification check error:', error);
    res.status(500).json({
      error: 'Failed to verify code',
      details: error.message
    });
  }
});


// In-memory store for email verification codes (for demo; use Redis in production)
const emailVerificationCodes = new Map();
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const VERIFICATION_FROM_EMAIL = process.env.VERIFICATION_FROM_EMAIL || 'noreply@leadgenie.online';
// const fetch = require('node-fetch'); // Node.js 18+ has built-in fetch

/**
 * Send email verification code using Resend
 * POST /verification/email/send
 */
router.post('/email/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Resend API key not configured' });
    }
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store code in memory for 10 minutes
    emailVerificationCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: VERIFICATION_FROM_EMAIL,
        to: email,
        subject: 'Your Lead Genie Verification Code',
        html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code will expire in 10 minutes.</p>`
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Resend API error: ' + errText);
    }
    res.json({ success: true, to: email });
  } catch (error) {
    console.error('Email verification send error:', error);
    res.status(500).json({
      error: 'Failed to send verification code',
      details: error.message
    });
  }
});


/**
 * Verify email with code (Resend)
 * POST /verification/email/verify
 */
router.post('/email/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const entry = emailVerificationCodes.get(email);
    if (!entry || entry.code !== code) {
      return res.status(400).json({ success: false, verified: false, error: 'Invalid verification code' });
    }
    if (Date.now() > entry.expires) {
      emailVerificationCodes.delete(email);
      return res.status(400).json({ success: false, verified: false, error: 'Verification code expired' });
    }
    emailVerificationCodes.delete(email);
    res.json({ success: true, verified: true });
  } catch (error) {
    console.error('Email verification check error:', error);
    res.status(500).json({
      error: 'Failed to verify code',
      details: error.message
    });
  }
});

module.exports = router;
