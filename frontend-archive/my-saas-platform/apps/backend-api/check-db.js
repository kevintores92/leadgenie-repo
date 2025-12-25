#!/usr/bin/env node

const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Check if tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tableCheckQuery);
    console.log('📋 Tables in database:');
    if (result.rows.length === 0) {
      console.log('   ❌ NO TABLES FOUND - Database is empty!');
    } else {
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }

    // Check migration history if _prisma_migrations exists
    console.log('\n📜 Checking Prisma migration history...');
    try {
      const migrationQuery = `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;`;
      const migResult = await client.query(migrationQuery);
      if (migResult.rows.length > 0) {
        migResult.rows.forEach(row => {
          console.log(`   • ${row.migration_name} - ${row.finished_at ? '✓ Complete' : '⏳ Pending'}`);
        });
      } else {
        console.log('   No migration history found');
      }
    } catch (e) {
      console.log('   _prisma_migrations table not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase().catch(console.error);
