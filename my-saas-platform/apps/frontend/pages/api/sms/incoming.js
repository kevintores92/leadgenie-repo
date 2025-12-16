const crypto = require('crypto')
const prismaImport = require('../../../lib/prisma')
const prisma = prismaImport.default || prismaImport

function validateTwilioSignature(req, authToken) {
  try {
    const signature = req.headers['x-twilio-signature'] || req.headers['X-Twilio-Signature']
    if (!signature) return false

    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers.host
    // Use originalUrl if present otherwise url
    const url = `${protocol}://${host}${req.url}`

    const params = req.body || {}
    const keys = Object.keys(params).sort()
    let data = url
    for (const k of keys) {
      const v = params[k]
      // If array, append each value
      if (Array.isArray(v)) {
        for (const item of v) data += item
      } else if (v !== undefined && v !== null) {
        data += String(v)
      }
    }

    const expected = crypto.createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
    // constant-time compare
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch (e) {
    console.warn('Twilio signature validation failed', e && e.message)
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  // Optionally validate Twilio signature if auth token is configured
  const authToken = process.env.TWILIO_AUTH_TOKEN || null
  if (authToken) {
    const ok = validateTwilioSignature(req, authToken)
    if (!ok) return res.status(403).send('invalid signature')
  }

  const { From, To, Body, MessageSid } = req.body || {}
  if (!From || !To) return res.status(400).send('missing fields')

  try {
    // find sending number (sends belong to a sendingNumber table)
    const sending = await prisma.sendingNumber.findUnique({ where: { phoneNumber: To } })
    if (!sending) {
      // fallback: try to find sending number by phone (case-insensitive)
      // skip if model missing
    }

    const orgId = sending ? sending.organizationId : null

    // Ensure a brand exists for organization
    let brand = null
    if (orgId) {
      brand = await prisma.brand.findFirst({ where: { orgId } })
      if (!brand) brand = await prisma.brand.create({ data: { orgId, name: `${To} Brand` } })
    }

    // Upsert contact by orgId+phoneNumber if orgId exists, otherwise try by phone alone
    let contact = null
    if (orgId) {
      contact = await prisma.contact.upsert({
        where: { organizationId_phoneNumber: { organizationId: orgId, phoneNumber: From } },
        update: { phone: From },
        create: { firstName: '', phone: From, phoneNumber: From, organizationId: orgId, brandId: brand ? brand.id : null },
      })
    } else {
      // try findFirst or create a generic contact without org
      contact = await prisma.contact.findFirst({ where: { phone: From } })
      if (!contact) {
        contact = await prisma.contact.create({ data: { firstName: '', phone: From, phoneNumber: From } })
      }
    }

    // Create inbound message record
    const msg = await prisma.message.create({
      data: {
        brandId: contact.brandId || (brand && brand.id) || null,
        contactId: contact.id,
        direction: 'INBOUND',
        status: 'DELIVERED',
        channel: 'SMS',
        fromNumber: From,
        toNumber: To,
        body: Body || '',
        twilioSid: MessageSid || null,
      },
    })

    // Broadcast to any SSE clients connected
    try {
      const clients = global.__sse_clients || []
      const payload = { id: msg.id, contactId: contact.id, from: From, to: To, body: Body, time: new Date().toISOString() }
      for (const c of clients) {
        try { c.write(`data: ${JSON.stringify(payload)}\n\n`) } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('SSE broadcast failed', e && e.message)
    }

    // Respond with empty TwiML
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  } catch (e) {
    console.error(e)
    return res.status(500).send('error')
  }
}
