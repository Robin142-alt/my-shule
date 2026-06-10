import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';

async function bootstrap() {
  console.log('--- Orphan Tenant Cleanup Script ---');
  
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  
  console.log(`Mode: ${isExecute ? 'EXECUTE (Orphan data will be DELETED)' : 'DRY RUN (No data will be deleted)'}\n`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const db = app.get(DatabaseService);

  const allTablesQuery = await db.query(`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
  `);
  
  const tablesWithTenantId = allTablesQuery.rows.map((row) => row.table_name);
  console.log(`Found ${tablesWithTenantId.length} tables with a tenant_id column.`);
  
  let totalOrphans = 0;
  
  const tablesToProcess = allTablesQuery.rows
    .map((r) => r.table_name)
    .filter((t) => t !== 'tenants');

  let maxRetries = tablesToProcess.length * 3;
  while (tablesToProcess.length > 0 && maxRetries > 0) {
    maxRetries--;
    const table = tablesToProcess.shift()!;
    try {
      if (isExecute) {
        const delRes = await db.query(`
          DELETE FROM "${table}" 
          WHERE tenant_id != 'global' 
          AND tenant_id NOT IN (SELECT id FROM tenants)
        `);
        const count = delRes.rowCount ?? 0;
        if (count > 0) {
          console.log(`[${table}]: deleted ${count} orphaned rows`);
          totalOrphans += count;
        }
      } else {
        const countRes = await db.query(`
          SELECT count(*) as count 
          FROM "${table}" 
          WHERE tenant_id != 'global' 
          AND tenant_id NOT IN (SELECT id FROM tenants)
        `);
        const count = parseInt(countRes.rows[0].count, 10);
        if (count > 0) {
          console.log(`[${table}]: ${count} orphaned rows`);
          totalOrphans += count;
        }
      }
    } catch (error: any) {
      if (error.code === '23503') {
        // Foreign key violation, retry later
        tablesToProcess.push(table);
      } else {
        throw error;
      }
    }
  }

  if (tablesToProcess.length > 0) {
    console.warn(`WARNING: Could not process some tables due to cyclic dependencies: ${tablesToProcess.join(', ')}`);
  }

  // Clean up user accounts that belong ONLY to deleted tenants
  const orphanedUsersRes = await db.query(`
    SELECT u.id 
    FROM users u
    WHERE u.tenant_id != 'global'
    AND u.tenant_id NOT IN (SELECT id FROM tenants)
  `);

  let usersDeleted = 0;
  for (const row of orphanedUsersRes.rows) {
    const otherMemberships = await db.query(`
      SELECT count(*) as count FROM tenant_memberships 
      WHERE user_id = $1 AND tenant_id IN (SELECT id FROM tenants)
    `, [row.id]);
    
    if (parseInt(otherMemberships.rows[0].count, 10) === 0) {
      if (isExecute) {
        await db.query('DELETE FROM users WHERE id = $1', [row.id]);
      }
      usersDeleted++;
    }
  }

  if (usersDeleted > 0) {
    console.log(`[users] (orphaned): ${usersDeleted} rows`);
    totalOrphans += usersDeleted;
  }

  if (isExecute) {
    console.log(`\nSUCCESS: Orphan cleanup complete. Deleted ${totalOrphans} orphaned records.`);
  } else {
    console.log(`\nDRY RUN COMPLETE: Would delete ${totalOrphans} orphaned records. Use --execute to confirm.`);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
