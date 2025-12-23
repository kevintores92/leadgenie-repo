const express = require('express')
const router = express.Router()

// This webhook returns the exact TwiML required by the spec
router.post('/voiceWebhook', (req, res) => {
  res.type('text/xml')
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Start>\n    <Stream url="wss://YOUR_SERVER/ws/media" />\n  </Start>\n  <Say>Connecting you now.</Say>\n</Response>`
  res.send(twiml)
})

module.exports = router
