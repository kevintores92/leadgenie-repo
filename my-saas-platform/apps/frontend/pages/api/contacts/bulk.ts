import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

type BulkRequest = {
  brandId: string
  organizationId?: string
  contacts: Record<string, any>[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as BulkRequest
  const { brandId, organizationId, contacts } = body || {}
  if (!brandId || !Array.isArray(contacts)) return res.status(400).json({ error: 'Missing brandId or contacts' })

  const results: { created: number; skipped: number } = { created: 0, skipped: 0 }

  for (const c of contacts) {
    const data: any = { brandId, updatedAt: new Date() }
    if (organizationId) data.organizationId = organizationId

    // copy allowed fields conservatively
    const allowed = [
      'firstName',
      'lastName',
      'phone',
      'phoneNumber',
      'phone2',
      'phone3',
      'phone4',
      'phone5',
      'phoneNumber',
      'lineType',
      'propertyAddress',
      'propertyCity',
      'propertyState',
      'propertyZip',
      'mailingAddress',
      'mailingCity',
      'mailingState',
      'mailingZip',
      'status',
      'tags',
      'aiScore',
      'nextEligibleAt'
    ]

    for (const k of allowed) {
      if (c[k] == null) continue
      if (k === 'tags' && typeof c[k] === 'string') data[k] = c[k].split(',').map((s: string) => s.trim()).filter(Boolean)
      else if (k === 'aiScore') {
        const n = Number(c[k])
        if (!Number.isNaN(n)) data[k] = new Prisma.Decimal(String(n))
      } else if (k === 'nextEligibleAt') data[k] = new Date(c[k])
      else data[k] = c[k]
    }

    if (!data.phone && data.phoneNumber) data.phone = data.phoneNumber
    if (!data.phone) { results.skipped++; continue }

    try {
      await prisma.contact.create({ data })
      results.created++
    } catch (err: any) {
      if (err?.code === 'P2002') { results.skipped++; continue }
      console.error('bulk create error', err)
    }
  }

  return res.status(200).json(results)
}
