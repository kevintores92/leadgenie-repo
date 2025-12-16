export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end('Method not allowed')

    const to = req.body?.To || req.body?.to || ''
    const fromOverride = req.body?.From || req.body?.from
    const callerId = (fromOverride && String(fromOverride)) || process.env.TWILIO_FROM || '+15551234567'

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Dial callerId="${callerId}">\n    <Number>${to}</Number>\n  </Dial>\n</Response>`

    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send(twiml)
  } catch (e) {
    console.error(e)
    res.status(500).send('error')
  }
}
