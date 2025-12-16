const express = require('express');
const path = require('path');
const app = express();
let TwilioLib;
try {
  TwilioLib = require('twilio');
} catch (err) {
  // twilio package not installed — /token will return a stub token
  TwilioLib = null;
}

// Parse application/x-www-form-urlencoded and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static UI under /webrtc
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Simple helper to sanitize client name (very small check)
function sanitizeClient(name) {
  if (!name) return 'alice';
  // allow alphanum, dash, underscore
  const m = String(name).match(/[A-Za-z0-9_-]+/);
  return m ? m[0] : 'alice';
}

// POST /twiml — returns TwiML that instructs Twilio to dial provided client
app.post('/twiml', (req, res) => {
  const clientFromBody = req.body && (req.body.client || req.body.clientName || req.body.identity);
  const clientFromQuery = req.query && req.query.client;
  const client = sanitizeClient(clientFromBody || clientFromQuery || 'alice');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Dial>\n    <Client>${client}</Client>\n  </Dial>\n</Response>`;
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// Fallback to serve a small UI page at /webrtc (index.html in public/webrtc)
app.get('/webrtc', (req, res) => {
  res.sendFile(path.join(publicDir, 'webrtc', 'index.html'));
});

// GET or POST /token — returns a JSON object with an access token for Twilio Client
app.all('/token', (req, res) => {
  const clientFromBody = req.body && (req.body.client || req.body.clientName || req.body.identity);
  const clientFromQuery = req.query && req.query.client;
  const client = sanitizeClient(clientFromBody || clientFromQuery || 'alice');

  // If Twilio library is available and credentials are set, build a real token
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

  if (TwilioLib && accountSid && apiKeySid && apiKeySecret) {
    try {
      const AccessToken = TwilioLib.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant || TwilioLib.jwt.AccessToken.VoiceGrant;
      const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { ttl: 3600 });
      const grant = new VoiceGrant({ outgoingApplicationSid: process.env.TWILIO_APP_SID });
      token.addGrant(grant);
      token.identity = client;
      const jwt = token.toJwt();
      return res.json({ token: jwt, identity: client });
    } catch (err) {
      // fall through to stub below
      console.error('Failed to create Twilio token:', err && err.message);
    }
  }

  // Fallback stub token response (for development without Twilio creds)
  res.json({ token: 'STUB-TOKEN', identity: client, note: 'Install twilio package and set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to receive a real token.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Twilio TwiML server listening on port ${port}`);
  console.log(`Web UI available at http://localhost:${port}/webrtc`);
});
