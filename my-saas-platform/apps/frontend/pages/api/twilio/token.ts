import twilio from 'twilio'

export default async function handler(req, res) {
  try {
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: 'agent-1' }
    )

    token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true,
      })
    )

    res.status(200).json({ token: token.toJwt() })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'token error' })
  }
}
