const prismaImport = require('../../../lib/prisma')
const prisma = prismaImport.default || prismaImport
const { comparePassword, signToken, setSessionCookie } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!user.passwordHash) return res.status(400).json({ error: 'user has no password set' })
    const ok = comparePassword(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'invalid credentials' })
    const org = await prisma.organization.findUnique({ where: { id: user.orgId } })
    const token = signToken({ userId: user.id, orgId: user.orgId })
    setSessionCookie(res, token)
    return res.status(200).json({ user, org })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'db error', detail: String(e) })
  }
}
