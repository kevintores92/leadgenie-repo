const prismaImport = require('../../../../lib/prisma')
const prisma = prismaImport.default || prismaImport
const { randomUUID } = require('crypto')
const requireAuth = require('../../../../lib/requireAuth')

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })
  const payload = await requireAuth(req, res)
  if (!payload) return
  if (payload.orgId !== id) return res.status(403).json({ error: 'forbidden' })
  if (req.method === 'POST') {
    const { username } = req.body || {}
    if (!username) return res.status(400).json({ error: 'username required' })
    try {
      // Ensure username unique
      const exists = await prisma.user.findUnique({ where: { username } })
      if (exists) return res.status(409).json({ error: 'username already taken' })
      const user = await prisma.user.create({ data: { id: randomUUID(), orgId: id, username } })
      return res.status(200).json({ user })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'db error', detail: String(e) })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}
