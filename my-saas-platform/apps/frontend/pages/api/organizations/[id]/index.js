const prismaImport = require('../../../lib/prisma')
const prisma = prismaImport.default || prismaImport

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })
  if (req.method === 'GET') {
    try {
      const org = await prisma.organization.findUnique({ where: { id } })
      if (!org) return res.status(404).json({ error: 'Organization not found' })
      return res.status(200).json({ org })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'db error', detail: String(e) })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}
