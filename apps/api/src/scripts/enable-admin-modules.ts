import * as dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

async function enableAdminModules() {
  const connectionString = process.env.DATABASE_URL || 'postgres://myshule:secret@localhost:5432/myshule';
  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    // Ensure the modules exist in the registry
    await client.query(`
      INSERT INTO module_registry (
        code, name, description, feature_flags, status,
        base_price_cents, per_student_price_cents, billing_metadata,
        category, permission_scopes, tenant_id, route_segment
      ) 
      SELECT 
        'admin_command_centers', 
        'Administrative Leadership', 
        'Principal, deputy principal, and secretary command centers.', 
        '{}'::jsonb, 
        'active', 
        0, 0, 
        '{"pricing_unit": "school"}'::jsonb, 
        'leadership', 
        '["principal:read", "deputy:read", "secretary:read"]'::jsonb,
        t.id,
        'leadership'
      FROM tenants t
      WHERE t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM module_registry WHERE code = 'admin_command_centers' AND tenant_id = t.id
      );
    `);

    await client.query(`
      INSERT INTO module_registry (
        code, name, description, feature_flags, status,
        base_price_cents, per_student_price_cents, billing_metadata,
        category, permission_scopes, tenant_id, route_segment
      ) 
      SELECT 
        'principal_dashboard', 
        'Principal Executive Dashboard', 
        'Module-aware executive KPIs, alerts, analytics, trends, and reports for the Principal.', 
        '{}'::jsonb, 
        'active', 
        0, 0, 
        '{"pricing_unit": "school", "included_with": "admin_command_centers"}'::jsonb, 
        'leadership', 
        '["principal:read"]'::jsonb,
        t.id,
        'dashboard'
      FROM tenants t
      WHERE t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM module_registry WHERE code = 'principal_dashboard' AND tenant_id = t.id
      );
    `);

    // Enable for ALL existing tenants to ensure the dashboards work everywhere
    await client.query(`
      UPDATE school_module_access sma
      SET enabled = 'true', updated_at = NOW()
      FROM module_registry mr
      WHERE sma.module_id = mr.id
      AND mr.code IN ('admin_command_centers', 'principal_dashboard')
      AND sma.enabled = 'false';
    `);
    
    const result = await client.query(`
      WITH active_tenants AS (
        SELECT id AS tenant_id FROM tenants WHERE status = 'active'
      )
      INSERT INTO school_module_access (
        tenant_id, 
        module_id, 
        enabled, 
        access_level, 
        enabled_at,
        feature_flags,
        updated_at
      )
      SELECT 
        t.tenant_id, 
        mr.id AS module_id, 
        'true', 
        'standard', 
        NOW(), 
        '{}'::jsonb,
        NOW()
      FROM active_tenants t
      CROSS JOIN module_registry mr
      WHERE mr.code IN ('admin_command_centers', 'principal_dashboard')
      AND NOT EXISTS (
        SELECT 1 FROM school_module_access sma 
        WHERE sma.tenant_id = t.tenant_id 
        AND sma.module_id = mr.id
      )
      RETURNING tenant_id, module_id;
    `);
    
    console.log(`Successfully enabled admin modules for ${(result.rowCount || 0) / 2} tenants.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

enableAdminModules();
