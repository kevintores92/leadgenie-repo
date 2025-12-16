const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try{
    const rows = await prisma.contact.findMany({ take: 5 });
    console.log('OK', rows.length);
    console.log(rows.map(r => r.phone));
  }catch(e){
    console.error('ERR', e);
    process.exit(1);
  }finally{
    await prisma.$disconnect();
  }
})();