const prismaImport = require('../../../../lib/prisma')
const prisma = prismaImport.default || prismaImport
const requireAuth = require('../../../../lib/requireAuth')

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })
  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method === 'PATCH') {
    const { status } = req.body || {}
    if (!status) return res.status(400).json({ error: 'status required' })
    try {
      // Update Contact by id (leads mapped to Contact model)
      const updated = await prisma.contact.update({ where: { id }, data: { status } })
      return res.status(200).json({ contact: updated })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'db error', detail: String(e) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
