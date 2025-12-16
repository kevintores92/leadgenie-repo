const { PrismaClient } = require('@prisma/client');
(async ()=>{
  const p = new PrismaClient();
  try{
    const rows = await p.contact.findMany({
      where: { OR: [ { firstName: { contains: 'alice', mode: 'insensitive' } }, { lastName: { contains: 'alice', mode: 'insensitive' } }, { phone: { contains: 'alice', mode: 'insensitive' } } ] },
      include: { ContactCustomField: { include: { CustomFieldDefinition: true } } },
      take: 2
    });
    console.log('OK rows', rows.length);
  }catch(e){
    console.error(e);
    process.exit(1);
  }finally{ await p.$disconnect(); }
})();