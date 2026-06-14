require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'module_registry';
  `);
  console.log('Triggers:', res.rows);
  await client.end();
}

check();
