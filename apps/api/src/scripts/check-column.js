require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'module_registry' AND column_name = 'tenant_id';
  `);
  console.log('Column:', res.rows);
  await client.end();
}

check();
