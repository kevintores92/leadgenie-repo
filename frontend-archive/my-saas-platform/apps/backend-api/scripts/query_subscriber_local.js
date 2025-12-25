const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const user = await p.user.findFirst({ where: { email: 'kevintores92@gmail.com' } });
    console.log('USER', user);
    if (user) {
      const org = await p.organization.findUnique({ where: { id: user.orgId } });
      console.log('ORG', org);
      const brand = await p.brand.findFirst({ where: { orgId: user.orgId } });
      console.log('BRAND', brand);
    }
  } catch (e) {
    console.error('ERR', e && (e.message || e));
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
