import { Client } from 'pg';

async function enableAdminModules() {
  const connectionString = process.env.DATABASE_URL || 'postgres://myshule:secret@localhost:5432/myshule';
  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Enable for ALL existing tenants to ensure the dashboards work everywhere
    const result = await client.query(`
      WITH active_tenants AS (
        SELECT id AS tenant_id FROM tenants WHERE status = 'active'
      )
      INSERT INTO school_module_access (
        tenant_id, 
        module_code, 
        enabled, 
        access_level, 
        activated_at, 
        updated_at
      )
      SELECT 
        t.tenant_id, 
        m.module_code, 
        true, 
        'standard', 
        NOW(), 
        NOW()
      FROM active_tenants t
      CROSS JOIN (
        VALUES 
          ('admin_command_centers'), 
          ('principal_dashboard')
      ) AS m(module_code)
      ON CONFLICT (tenant_id, module_code) 
      DO UPDATE SET enabled = true, updated_at = NOW()
      RETURNING tenant_id, module_code;
    `);
    
    console.log(`Successfully enabled admin modules for ${result.rowCount / 2} tenants.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

enableAdminModules();
