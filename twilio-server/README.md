# Twilio TwiML Server

Simple Node.js Express server that exposes a POST `/twiml` endpoint which returns TwiML instructing Twilio to dial a client named "alice".

Quick start

1. Install dependencies and start the server:

```powershell
cd twilio-server
npm install
npm start
```

2. The server listens on port `3000` by default. To expose it publicly (so Twilio can reach it), use a tunnel such as `ngrok`:

```powershell
npx ngrok http 3000
# then set your TwiML App Voice Request URL to https://<your-ngrok-id>.ngrok.io/twiml
```

Notes

- The endpoint accepts URL-encoded request bodies (Twilio sends POSTs as form-encoded).
- Response uses `Content-Type: text/xml` and returns valid TwiML XML.

Additional demo UI

This repo also includes a minimal demo UI at `/webrtc` that can request an access token and initialize the Twilio Client in the browser.

Run locally:

```powershell
cd twilio-server
npm install express
# for real token support, also install twilio and set env vars:
# npm install twilio
# set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET (and optionally TWILIO_APP_SID)
node index.js
```

Open http://localhost:3000/webrtc and use the UI to pick a client identity, request a token, and (if configured) initialize `Twilio.Device` for calls.

Without Twilio credentials the `/token` endpoint returns a stub token and the UI will only display it.