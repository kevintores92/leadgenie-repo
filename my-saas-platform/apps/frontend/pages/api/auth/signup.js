const prismaImport = require('../../../lib/prisma')
const prisma = prismaImport.default || prismaImport
const { randomUUID } = require('crypto')
const { hashPassword, signToken, setSessionCookie } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { orgName, username, password } = req.body || {}
  if (!orgName || !username || !password) return res.status(400).json({ error: 'orgName, username and password required' })
  try {
    // basic validation
    if (typeof username !== 'string' || username.length < 3) return res.status(400).json({ error: 'username too short' })
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'password too short' })

    const orgId = randomUUID()
    const userId = randomUUID()
    const org = await prisma.organization.create({ data: { id: orgId, name: orgName } })
    const user = await prisma.user.create({ data: { id: userId, orgId: org.id, username, passwordHash: hashPassword(password) } })

    // create a default Brand record for this organization
    const brand = await prisma.brand.create({ data: { id: randomUUID(), orgId: org.id, name: `${org.name} Brand`, callingMode: 'SMS' } })

    // Optionally create a Twilio subaccount and store its SID/token on the brand
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const body = new URLSearchParams({ FriendlyName: `${org.name} subaccount` })
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts.json`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        })
        if (resp.ok) {
          const json = await resp.json()
          const sid = json.sid || json.account_sid || null
          const authToken = json.auth_token || null
          if (sid) {
            await prisma.brand.update({ where: { id: brand.id }, data: { twilioSubaccountSid: sid, subaccountAuthToken: authToken } })
          }
        } else {
          console.warn('Twilio subaccount creation failed', await resp.text())
        }
      } catch (e) {
        console.error('Twilio subaccount creation error', e)
      }
    }

    // create session token and set cookie
    const token = signToken({ userId: user.id, orgId: org.id })
    setSessionCookie(res, token)

    return res.status(200).json({ org, user, brand })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'db error', detail: String(e) })
  }
}
