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
