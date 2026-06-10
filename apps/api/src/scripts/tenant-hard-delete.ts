import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  console.log('--- Tenant Hard Delete Script ---');
  
  const args = process.argv.slice(2);
  const schoolIdArg = args.find((a) => a.startsWith('--schoolId='));
  const isExecute = args.includes('--execute');
  
  if (!schoolIdArg) {
    console.error('ERROR: You must provide a --schoolId flag (e.g. --schoolId=kb-high)');
    process.exit(1);
  }
  
  const schoolId = schoolIdArg.split('=')[1];
  
  if (schoolId === 'global') {
    console.error('ERROR: Cannot delete the global tenant.');
    process.exit(1);
  }
  
  console.log(`Target Tenant: ${schoolId}`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (Data will be DELETED)' : 'DRY RUN (No data will be deleted)'}\n`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const db = app.get(DatabaseService);

  // Verify the tenant exists (or was at least created at some point)
  const tenantCheck = await db.query('SELECT * FROM tenants WHERE id = $1', [schoolId]);
  
  const allTablesQuery = await db.query(`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
  `);
  
  const tablesWithTenantId = allTablesQuery.rows.map((row) => row.table_name);
  
  console.log(`Found ${tablesWithTenantId.length} tables with a tenant_id column.`);
  
  let totalRows = 0;
  
  for (const table of tablesWithTenantId) {
    // Check if the table has any rows for this tenant
    const countRes = await db.query(`SELECT count(*) as count FROM "${table}" WHERE tenant_id = $1`, [schoolId]);
    const count = parseInt(countRes.rows[0].count, 10);
    
    if (count > 0) {
      console.log(`[${table}]: ${count} rows`);
      totalRows += count;
      
      if (isExecute && table !== 'tenants') {
        // Delete child tables first. We skip tenants table to delete it last.
        await db.query(`DELETE FROM "${table}" WHERE tenant_id = $1`, [schoolId]);
      }
    }
  }
  
  // Clean up user accounts that belong ONLY to this tenant.
  // First, find users who are part of this tenant
  const tenantUsersRes = await db.query('SELECT id FROM users WHERE tenant_id = $1', [schoolId]);
  let usersDeleted = 0;
  
  for (const row of tenantUsersRes.rows) {
    // Check if the user is a member of any OTHER tenant
    const otherMemberships = await db.query('SELECT count(*) as count FROM tenant_memberships WHERE user_id = $1 AND tenant_id != $2', [row.id, schoolId]);
    const otherMembershipsCount = parseInt(otherMemberships.rows[0].count, 10);
    
    if (otherMembershipsCount === 0) {
      // User only belongs to this tenant, delete them.
      if (isExecute) {
        await db.query('DELETE FROM users WHERE id = $1', [row.id]);
      }
      usersDeleted++;
    } else {
      // User belongs to other tenants, just delete the membership.
      if (isExecute) {
        await db.query('DELETE FROM tenant_memberships WHERE user_id = $1 AND tenant_id = $2', [row.id, schoolId]);
      }
    }
  }
  
  console.log(`[users] (orphaned): ${usersDeleted} rows`);
  totalRows += usersDeleted;

  if (isExecute) {
    // Delete the tenant record itself last
    const deleteTenantRes = await db.query('DELETE FROM tenants WHERE id = $1', [schoolId]);
    if ((deleteTenantRes.rowCount ?? 0) > 0) {
      console.log(`[tenants] record deleted.`);
      totalRows += (deleteTenantRes.rowCount ?? 0);
    }
    console.log(`\nSUCCESS: Hard deletion complete. Deleted ${totalRows} records.`);
  } else {
    console.log(`\nDRY RUN COMPLETE: Would delete ${totalRows} records. Use --execute to confirm.`);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
