const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uWLaprh1eT6Z@ep-little-frost-amn16c2k-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'outbox_events'
  `);
  console.log('Columns:');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(console.error);
