import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { take = '50', skip = '0', brandId } = req.query as Record<string, string>
    const where: any = {}
    if (brandId) where.brandId = brandId
    try {
      const contacts = await prisma.contact.findMany({ where, take: Number(take), skip: Number(skip), orderBy: { createdAt: 'desc' } })
      return res.status(200).json({ data: contacts })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to fetch contacts' })
    }
  }

  if (req.method === 'POST') {
    const body = req.body as any
    if (!body?.brandId) return res.status(400).json({ error: 'brandId required' })
    const data: any = { ...body, updatedAt: new Date() }
    if (data.aiScore != null) {
      const n = Number(data.aiScore)
      if (!Number.isNaN(n)) data.aiScore = new Prisma.Decimal(String(n))
    }
    if (!data.phone && data.phoneNumber) data.phone = data.phoneNumber
    try {
      const created = await prisma.contact.create({ data })
      return res.status(201).json(created)
    } catch (err: any) {
      console.error('create contact error', err)
      if (err?.code === 'P2002') return res.status(409).json({ error: 'Duplicate' })
      return res.status(500).json({ error: 'Failed to create' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
