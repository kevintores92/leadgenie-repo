import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.resolve(process.cwd(), 'apps/frontend/data/contacts.json')

async function readDataFallback() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) } catch (e) { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { rows } = req.body || {}
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' })

  if (!prisma) {
    const items = await readDataFallback()
    let created = 0
    for (const r of rows) {
      const phoneRaw = (r.phone || '').toString().trim()
      const phone = phoneRaw.replace(/\D/g, '')
      if (!phone) continue
      const id = `c_${Date.now()}_${Math.floor(Math.random()*1000)}`
      const item = { id, firstName: r.firstName || '', lastName: r.lastName || '', phone, email: r.email || '', createdAt: new Date().toISOString() }
      items.unshift(item)
      created++
    }
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2))
    return res.status(201).json({ success: true, importedCount: created })
  }

  // normalize header which may be string|string[]
  const rawOrg = req.headers && (req.headers['x-organization-id'] || req.headers['x-organization-id'.toLowerCase()])
  const orgId = Array.isArray(rawOrg) ? rawOrg[0] : (rawOrg as string | undefined) || null
  let brand = null as any
  if (orgId) brand = await prisma.brand.findFirst({ where: { orgId } })
  if (!brand) brand = await prisma.brand.findFirst()
  if (!brand) return res.status(400).json({ error: 'no brand available to attach contacts' })

  const createdIds: string[] = []
  const errors: string[] = []
  
  for (const r of rows) {
    try {
      const phoneRaw = (r.phone || '').toString().trim()
      const phone = phoneRaw.replace(/\D/g, '')
      if (!phone) {
        errors.push(`Row skipped: missing or invalid phone number`)
        continue
      }

      const exists = await prisma.contact.findFirst({ where: { brandId: brand.id, phone } })
      if (exists) {
        errors.push(`Contact with phone ${phone} already exists`)
        continue
      }

      const data: any = {
        brandId: brand.id,
        organizationId: orgId || undefined,
        firstName: r.firstName || (r.name || 'Unknown'),
        lastName: r.lastName || null,
        phone,
        phoneNumber: r.phoneNumber || null,
        phone2: r.phone2 || r['Phone 2'] || null,
        phone3: r.phone3 || r['Phone 3'] || null,
        phone4: r.phone4 || r['Phone 4'] || null,
        phone5: r.phone5 || r['Phone 5'] || null,
        propertyAddress: r.propertyAddress || null,
        propertyCity: r.propertyCity || null,
        propertyState: r.propertyState || null,
        propertyZip: r.propertyZip || null,
        mailingAddress: r.mailingAddress || null,
        mailingUnit: r.mailingUnit || null,
        mailingCity: r.mailingCity || null,
        mailingState: r.mailingState || null,
        mailingZip: r.mailingZip || null,
      }

      const created = await prisma.contact.create({ data })
      createdIds.push(created.id)

      if (r.email && String(r.email).trim()) {
        let def = await prisma.customFieldDefinition.findFirst({ where: { brandId: brand.id, name: 'email' } })
        if (!def) {
          def = await prisma.customFieldDefinition.create({ data: ({ brandId: brand.id, name: 'email', type: 'email' } as any) })
        }
        await prisma.contactCustomField.create({ data: ({ contactId: created.id, fieldDefinitionId: def.id, value: String(r.email) } as any) })
      }

      for (let i = 1; i <= 10; i++) {
        const key = `custom${i}`
        if (r[key] === undefined || r[key] === null || String(r[key]).trim() === '') continue
        let def = await prisma.customFieldDefinition.findFirst({ where: { brandId: brand.id, name: key } })
        if (!def) def = await prisma.customFieldDefinition.create({ data: ({ brandId: brand.id, name: key, type: 'text' } as any) })
        await prisma.contactCustomField.create({ data: ({ contactId: created.id, fieldDefinitionId: def.id, value: r[key] } as any) })
      }
    } catch (e) {
      console.error('import contact error', e)
      errors.push(`Error importing row: ${(e as Error)?.message || String(e)}`)
    }
  }

  if (createdIds.length === 0 && rows.length > 0) {
    return res.status(400).json({ error: `No contacts imported. Errors: ${errors.join(', ')}` })
  }

  res.status(201).json({ success: true, importedCount: createdIds.length, importedIds: createdIds, warnings: errors })
}
