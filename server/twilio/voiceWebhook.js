const express = require('express')
const fs = require('fs')
const path = require('path')
const https = require('https')
const router = express.Router()

// This webhook returns the exact TwiML required by the spec
router.post('/voiceWebhook', (req, res) => {
  res.type('text/xml')
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Start>\n    <Stream url="wss://YOUR_SERVER/ws/media" />\n  </Start>\n  <Say>Connecting you now.</Say>\n</Response>`
  res.send(twiml)
})

// Recording status callback - Twilio will POST recording info here
router.post('/recording', express.urlencoded({extended:true}), (req, res) => {
  try{
    const body = req.body || {}
    const recordingSid = body.RecordingSid || body.RecordingSid || null
    const recordingUrl = body.RecordingUrl || null
    const callSid = body.CallSid || null
    const content = { recordingSid, recordingUrl, callSid, receivedAt: new Date().toISOString(), raw: body }
    const outDir = path.join(__dirname, '..', 'recordings')
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true})
    const metaPath = path.join(outDir, `${recordingSid || 'unknown'}.json`)
    fs.writeFileSync(metaPath, JSON.stringify(content, null, 2))

    // attempt to download the recording as WAV if RecordingUrl present and credentials available
    if(recordingUrl && process.env.TWILIO_SID && process.env.TWILIO_TOKEN){
      const url = recordingUrl.endsWith('.wav') ? recordingUrl : recordingUrl + '.wav'
      const outPath = path.join(outDir, `${recordingSid || Date.now()}.wav`)
      const auth = 'Basic ' + Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString('base64')
      const file = fs.createWriteStream(outPath)
      const options = new URL(url)
      options.headers = { Authorization: auth }
      https.get(options, (resp) => {
        resp.pipe(file)
        file.on('finish', () => file.close())
      }).on('error', (err)=>{
        // download failure - leave metadata only
      })
    }

    res.sendStatus(200)
  }catch(e){
    res.sendStatus(500)
  }
})

module.exports = router
