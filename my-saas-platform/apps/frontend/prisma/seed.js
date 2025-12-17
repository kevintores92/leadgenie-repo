const { PrismaClient } = require('@prisma/client')
const { hashPassword } = require('../lib/auth')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

async function main() {
  try {
    const orgId = 'test-org-id-123'
    const userId = 'test-user-id-123'
    const brandId = 'test-brand-id-123'

    // Create org
    const org = await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: { id: orgId, name: 'Test Org' }
    })

    // Create user
    const user = await prisma.user.upsert({
      where: { username: 'test' },
      update: {},
      create: {
        id: userId,
        orgId: org.id,
        username: 'test',
        passwordHash: hashPassword('test123')
      }
    })

    // Create brand
    const brand = await prisma.brand.upsert({
      where: { id: brandId },
      update: {},
      create: {
        id: brandId,
        orgId: org.id,
        name: 'Test Brand',
        callingMode: 'SMS'
      }
    })

    console.log('Seeded:', { org, user, brand })
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
