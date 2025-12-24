const express = require('express')
const http = require('http')
const path = require('path')
const bodyParser = require('body-parser')
const logger = require('./utils/logger')
const VoiceWebhook = require('./twilio/voiceWebhook')
const MediaStreamServer = require('./ws/mediaStream')
const { CallOrchestrator } = require('./orchestrator/CallOrchestrator')

const PORT = process.env.PORT || 3000
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use('/twilio', VoiceWebhook)

// simple REST to start a call
app.post('/startCall', async (req, res) => {
  const { phone, equity, address } = req.body || {}
  const callId = `call_${Date.now()}`
  const lead = { phone, equity: Number(equity)||0, address }
  // Twilio client optional
  let twilioClient = null
  if(process.env.TWILIO_SID && process.env.TWILIO_TOKEN){
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    twilioClient = twilio
  }
  const orchestrator = new CallOrchestrator({callId, lead, twilioClient})

  // Hook up events to log and forward to any connected front-end clients if desired
  orchestrator.on('transcript', text => logger.log('TRANSCRIPT', text))
  orchestrator.on('compUpdate', score => logger.log('COMPSCORE', score))
  orchestrator.on('decision', d => logger.log('DECISION', d))
  orchestrator.on('speak', msg => logger.log('AI_SPEAK', msg))
  orchestrator.on('ended', payload => logger.log('CALL_ENDED', payload))

  // Store orchestrator on request for demo; in real app you'd persist
  activeOrchestrator = orchestrator

  // start call
  orchestrator.startOutboundCall()

  res.json({ok:true, callId})
})

// Start campaign by reading attached_assets/leads.csv
const fs = require('fs')
const path = require('path')
app.post('/campaign/start', async (req, res) => {
  try{
    const csvPath = path.join(__dirname, '..', 'attached_assets', 'leads.csv')
    if(!fs.existsSync(csvPath)) return res.status(400).json({ok:false, error:'leads.csv not found in attached_assets'})
    const txt = fs.readFileSync(csvPath, 'utf8')
    const lines = txt.split(/\r?\n/).filter(l=>l.trim())
    // assume header phone,equity,address
    const rows = lines.slice(1).map(l=>{
      const parts = l.split(',')
      return { phone: parts[0]?.trim(), equity: Number(parts[1])||0, address: parts[2]?.trim() }
    })
    // sequentially start calls with small delay
    (async ()=>{
      for(const r of rows){
        await fetch('http://localhost:' + (process.env.PORT||3000) + '/startCall', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(r)})
        await new Promise(s=>setTimeout(s, 2000))
      }
    })()
    res.json({ok:true, count: rows.length})
  }catch(e){
    res.status(500).json({ok:false, error:e.message})
  }
})

// minimal health
app.get('/health', (req, res) => res.json({ok:true}))

const server = http.createServer(app)
const mediaServer = new MediaStreamServer({})

// integrate upgrade for Twilio media stream on /ws/media
server.on('upgrade', function upgrade(request, socket, head) {
  const { url } = request
  if(url && url.startsWith('/ws/media')){
    mediaServer.handleUpgrade(request, socket, head)
  } else {
    socket.destroy()
  }
})

// wire media events to the last active orchestrator for demo purposes
let activeOrchestrator = null
mediaServer.on('speech', text => {
  if(activeOrchestrator) activeOrchestrator.onSpeechPartial(text)
})
mediaServer.on('final-speech', text => {
  if(activeOrchestrator) activeOrchestrator.onSpeechFinal(text)
})

server.listen(PORT, () => logger.log('Server listening on', PORT))

module.exports = { app, server }
