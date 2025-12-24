const WebSocket = require('ws')
const EventEmitter = require('events')
const logger = require('../utils/logger')

// This module creates a WebSocket server handler to accept Twilio Media Streams.
// It parses Twilio events and forwards text to the orchestrator via emitted events.

class MediaStreamServer extends EventEmitter {
  constructor({server, path}){
    super()
    this.wss = new WebSocket.Server({noServer: true})
    this.wss.on('connection', ws => this._handleConnection(ws))
    // integration with http server is done externally (index.js)
  }

  handleUpgrade(req, socket, head){
    this.wss.handleUpgrade(req, socket, head, ws => {
      this.wss.emit('connection', ws, req)
    })
  }

  _handleConnection(ws){
    logger.log('Media WS connected')
    ws.on('message', msg => {
      try{
        const obj = JSON.parse(msg.toString())
        // Twilio sends events with "event": "media" or "start" or "stop"
        if(obj.event === 'media' && obj.media && obj.media.payload){
          // For MVP we will NOT transcribe real audio. Instead, simulate STT by generating
          // deterministic messages based on simple rules for demo purposes.
          // Notify partial then final
          const simulated = this._simulateSttFromPayload(obj.media.payload)
          if(simulated.partial){
            this.emit('speech', simulated.partial)
          }
          if(simulated.final){
            this.emit('final-speech', simulated.final)
          }
        }else if(obj.event === 'start'){
          logger.log('Twilio Media Stream started')
        }else if(obj.event === 'stop'){
          logger.log('Twilio Media Stream stopped')
        }
      }catch(e){
        logger.log('WS parse error', e.message)
      }
    })

    ws.on('close', ()=> logger.log('Media WS closed'))
  }

  _simulateSttFromPayload(payload){
    // Very small deterministic stub: if payload present, return a short partial and final.
    // This keeps the system deterministic and allows testing without an external STT.
    return { partial: 'Yes', final: 'Yes, I am interested and my timeline is now.' }
  }
}

module.exports = MediaStreamServer
