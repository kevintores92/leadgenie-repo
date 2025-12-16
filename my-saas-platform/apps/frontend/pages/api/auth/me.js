const { verifyToken, COOKIE_NAME } = require('../../../lib/auth')
const prismaImport = require('../../../lib/prisma')
const prisma = prismaImport.default || prismaImport

function parseCookies(req) {
  const raw = req.headers.cookie || ''
  return raw.split(';').map(c=>c.trim()).reduce((acc, cur)=>{
    const [k,v] = cur.split('=')
    if (k) acc[k]=v
    return acc
  }, {})
}

export default async function handler(req, res) {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'unauthenticated' })
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'invalid token' })
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    const org = user ? await prisma.organization.findUnique({ where: { id: user.orgId } }) : null
    return res.status(200).json({ user, org })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'db error' })
  }
}
