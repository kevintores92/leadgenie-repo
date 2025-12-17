import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'id required' })

  if (req.method === 'GET') {
    try {
      const contact = await prisma.contact.findUnique({ where: { id } })
      return res.status(200).json(contact)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to fetch' })
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = req.body as any
    const data: any = { ...body }
    if (data.aiScore != null) {
      const n = Number(data.aiScore)
      if (!Number.isNaN(n)) data.aiScore = new Decimal(String(n))
    }
    // protect id fields
    delete data.id
    delete data.brandId
    try {
      const updated = await prisma.contact.update({ where: { id }, data })
      return res.status(200).json(updated)
    } catch (err: any) {
      console.error('update contact error', err)
      return res.status(500).json({ error: 'Failed to update' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
