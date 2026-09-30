// Read-only release diagnostic. Never print database URLs, credentials or callback tokens.
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('payment_ingress','payment_ingress_verifications','tenant_payment_channel_revisions') ORDER BY tablename");
      console.log(JSON.stringify({tables:tables.rows.map(x=>x.tablename)}));
      if (tables.rows.some(x=>x.tablename==='tenant_payment_channel_revisions')) {
        const channels = await client.query(`SELECT provider_code,environment,status,connection_mode,count(*)::int AS count FROM tenant_payment_channel_revisions GROUP BY provider_code,environment,status,connection_mode`);
        console.log(JSON.stringify({channels:channels.rows}));
      }
      await client.query('ROLLBACK');
    } finally { client.release(); }
  } finally { await pool.end(); }
})().catch(() => { console.error('Payment ingress status check failed; no credentials printed'); process.exitCode=1; });
