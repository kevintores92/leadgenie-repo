const EventEmitter = require('events')
const logger = require('../utils/logger')
const compAnalysis = require('../analysis/compAnalysis')
const decisionEngine = require('../analysis/decisionEngine')

const CALL_STATES = {
  INIT: 'INIT',
  CONNECTING: 'CONNECTING',
  ESTABLISHED: 'ESTABLISHED',
  INTRO: 'INTRO',
  ANALYZING: 'ANALYZING',
  DECISION: 'DECISION',
  FOLLOW_UP: 'FOLLOW_UP',
  END: 'END'
}

class CallOrchestrator extends EventEmitter {
  constructor({callId, lead, twilioClient}){
    super()
    this.callId = callId
    this.lead = lead || {phone: null, equity: 0, address: ''}
    this.state = CALL_STATES.INIT
    this.transcript = []
    this.compScore = null
    this.twilio = twilioClient

    this.on('stateChange', (from, to) => {
      logger.log(`STATE ${this.callId}: ${from} -> ${to}`)
    })
  }

  setState(next){
    const prev = this.state
    // enforce sequential flow: only allow next if it is the immediate next in sequence
    const order = [
      CALL_STATES.INIT,
      CALL_STATES.CONNECTING,
      CALL_STATES.ESTABLISHED,
      CALL_STATES.INTRO,
      CALL_STATES.ANALYZING,
      CALL_STATES.DECISION,
      CALL_STATES.FOLLOW_UP,
      CALL_STATES.END
    ]
    const prevIdx = order.indexOf(prev)
    const nextIdx = order.indexOf(next)
    if(nextIdx === -1) throw new Error('Invalid state')
    if(nextIdx !== prevIdx + 1 && !(prev === CALL_STATES.DECISION && next === CALL_STATES.END) ){
      throw new Error(`Invalid transition from ${prev} to ${next}`)
    }
    this.state = next
    this.emit('stateChange', prev, next)
  }

  async startOutboundCall(){
    if(this.state !== CALL_STATES.INIT) throw new Error('Call must start from INIT')
    this.setState(CALL_STATES.CONNECTING)
    // initiate outbound call via Twilio - answerUrl should hit /twilio/voiceWebhook
    if(!this.twilio) {
      logger.log('No Twilio client configured - simulating dial')
      setTimeout(()=> this._onCallAnswered(), 1000)
      return
    }
    try{
      const host = process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT||3000}`
      const resp = await this.twilio.calls.create({
        to: this.lead.phone,
        from: process.env.TWILIO_FROM,
        url: `${host}/twilio/voiceWebhook`
      })
      logger.log('Twilio call initiated', resp.sid)
      // simulate answered shortly; Twilio will make webhook callbacks in a real setup
      setTimeout(()=> this._onCallAnswered(resp.sid), 2000)
    }catch(e){
      logger.log('Error dialing', e.message)
      this.endCall()
    }
  }

  _onCallAnswered(sid){
    this.setState(CALL_STATES.ESTABLISHED)
    this.emit('answered', {callSid: sid})
    // move to INTRO
    setTimeout(()=> this._doIntro(), 500)
  }

  _doIntro(){
    if(this.state !== CALL_STATES.ESTABLISHED) throw new Error('Intro only allowed after ESTABLISHED')
    this.setState(CALL_STATES.INTRO)
    // deterministic AI intro speech must be sent via TwiML/Media stream side; we emit event
    this.emit('speak', 'Got it. Let me explain why I called.')
    // After intro, move to analyzing
    setTimeout(()=> this.setState(CALL_STATES.ANALYZING), 800)
  }

  // receive partial speech chunk from media stream
  onSpeechPartial(text){
    if(this.state !== CALL_STATES.ANALYZING) return
    logger.log(`Partial speech: ${text}`)
    this.transcript.push({type:'partial', text, ts: Date.now()})
    this.emit('transcript', text)
  }

  // receive final speech chunk
  async onSpeechFinal(text){
    if(this.state !== CALL_STATES.ANALYZING) return
    logger.log(`Final speech: ${text}`)
    this.transcript.push({type:'final', text, ts: Date.now()})
    this.emit('transcript', text)
    // process with Navi and comp analysis
    await this._processAnalysis(text)
  }

  async _processAnalysis(text){
    // ensure we're in ANALYZING
    if(this.state !== CALL_STATES.ANALYZING) return
    // call Navi to extract signals
    const navi = require('../llm/navi')
    const signals = await navi.extractSignals(text)
    logger.log('Navi signals', signals)
    // run comp analysis based on lead.equity and signals
    const scoreStr = compAnalysis.score({equity: this.lead.equity, motivation: signals.motivation, timeline: signals.timeline})
    this.compScore = scoreStr
    logger.log('Comp score', scoreStr)
    this.emit('compUpdate', scoreStr)
    // Once compScore updated, proceed to DECISION step
    this.setState(CALL_STATES.DECISION)
    const decision = decisionEngine.decide(scoreStr)
    logger.log('Decision', decision)
    this.emit('decision', decision)
    // follow deterministic actions
    if(decision === 'CONTINUE'){
      // AI continues pitch
      this.emit('speak', 'Got it. Let me explain why I called.')
      // after continue, for MVP end the call
      setTimeout(()=> this.setState(CALL_STATES.FOLLOW_UP), 1000)
    }else if(decision === 'FOLLOW_UP'){
      this.setState(CALL_STATES.FOLLOW_UP)
      this.emit('speak', "I'll send you a quick text.")
    }else{
      this.setState(CALL_STATES.END)
      this.emit('speak', 'Thanks for your time.')
    }
    // final logging and end when in END
    if(this.state === CALL_STATES.END){
      this.endCall()
    }
  }

  endCall(){
    logger.log('Call ending', this.callId, this.compScore)
    this.emit('ended', {callId:this.callId, compScore:this.compScore, transcript:this.transcript})
  }
}

module.exports = { CallOrchestrator, CALL_STATES }
