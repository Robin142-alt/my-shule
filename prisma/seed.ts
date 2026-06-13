import { Client } from 'pg';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Ensure env variables are loaded (for standalone script usage)
dotenv.config();

const permissions = [
  // Students
  { code: 'STUDENTS_VIEW', module: 'students', resource: 'profile', action: 'view', scope: 'school' },
  { code: 'STUDENTS_CREATE', module: 'students', resource: 'profile', action: 'create', scope: 'school' },
  { code: 'STUDENTS_UPDATE_CLASS', module: 'students', resource: 'profile', action: 'update', scope: 'assigned_class' },
  // Finance
  { code: 'FINANCE_VIEW', module: 'finance', resource: 'overview', action: 'view', scope: 'school' },
  { code: 'FINANCE_RECEIPTS_CREATE', module: 'finance', resource: 'receipts', action: 'create', scope: 'school' },
  { code: 'FINANCE_RECEIPTS_VIEW', module: 'finance', resource: 'receipts', action: 'view', scope: 'school' },
  { code: 'FINANCE_RECEIPTS_VOID', module: 'finance', resource: 'receipts', action: 'void', scope: 'approval_required' },
  // Exams
  { code: 'EXAMS_VIEW', module: 'exams', resource: 'results', action: 'view', scope: 'school' },
  // Comm
  { code: 'COMM_VIEW', module: 'communication', resource: 'messages', action: 'view', scope: 'school' },
  // Admissions
  { code: 'ADMISSIONS_VIEW', module: 'admissions', resource: 'applications', action: 'view', scope: 'school' },
  // Reports
  { code: 'REPORTS_VIEW', module: 'reports', resource: 'overview', action: 'view', scope: 'school' },
  // Platform
  { code: 'PLATFORM_SETTINGS_VIEW', module: 'platform', resource: 'settings', action: 'view', scope: 'school' },
  // Academics
  { code: 'ACADEMICS_VIEW', module: 'academics', resource: 'overview', action: 'view', scope: 'school' },
];

const roleMappings = {
  'Principal': [
    'students.profile.view.school',
    'students.profile.create.school',
    'finance.overview.view.school',
    'finance.receipts.view.school',
    'exams.results.view.school',
    'communication.messages.view.school',
    'admissions.applications.view.school',
    'reports.overview.view.school',
    'platform.settings.view.school',
    'academics.overview.view.school'
  ],
  'Class Teacher': [
    'students.profile.view.school',
    'students.profile.update.assigned_class',
    'exams.results.view.school',
    'academics.overview.view.school'
  ],
  'Accountant': [
    'finance.overview.view.school',
    'finance.receipts.create.school',
    'finance.receipts.view.school',
    'reports.overview.view.school'
  ]
};

async function main() {
  console.log('Seeding Permission Matrix...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed Permissions
    for (const perm of permissions) {
      const key = `${perm.module}.${perm.resource}.${perm.action}.${perm.scope}`;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await client.query(`
        INSERT INTO "permissions" ("id", "code", "module", "resource", "action", "scope", "key", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        ON CONFLICT ("key") DO UPDATE SET
          "code" = EXCLUDED."code",
          "module" = EXCLUDED."module",
          "resource" = EXCLUDED."resource",
          "action" = EXCLUDED."action",
          "scope" = EXCLUDED."scope",
          "updated_at" = EXCLUDED."updated_at"
      `, [id, perm.code, perm.module, perm.resource, perm.action, perm.scope, key, now]);
    }
    console.log('✅ Permissions seeded.');

    // 2. Fetch all schools to seed roles
    const res = await client.query('SELECT id, name FROM schools');
    const schools = res.rows;

    if (schools.length === 0) {
      console.log('No schools found. Skipping role bindings.');
    } else {
      for (const school of schools) {
        console.log(`Seeding roles for school: ${school.name}`);

        for (const [roleName, grantedPermKeys] of Object.entries(roleMappings)) {
          // Find or create the standard role
          let roleRes = await client.query(`SELECT id FROM "roles" WHERE name = $1 AND school_id = $2`, [roleName, school.id]);
          let roleId = roleRes.rows[0]?.id;

          if (!roleId) {
            roleId = crypto.randomUUID();
            const now = new Date().toISOString();
            await client.query(`
              INSERT INTO "roles" ("id", "school_id", "name", "type", "is_system_role", "created_at", "updated_at")
              VALUES ($1, $2, $3, 'SCHOOL', true, $4, $4)
            `, [roleId, school.id, roleName, now]);
            console.log(`  Created role: ${roleName}`);
          }

          // Fetch the permissions for these keys
          const permKeysStr = grantedPermKeys.map(k => `'${k}'`).join(',');
          const permRes = await client.query(`SELECT id, key FROM "permissions" WHERE key IN (${permKeysStr})`);
          
          for (const perm of permRes.rows) {
            // Only insert missing binding (does not override)
            const bindingRes = await client.query(`
              SELECT id FROM "role_permissions" WHERE role_id = $1 AND permission_id = $2
            `, [roleId, perm.id]);

            if (bindingRes.rows.length === 0) {
              const bindingId = crypto.randomUUID();
              const now = new Date().toISOString();
              await client.query(`
                INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "allowed", "created_at", "updated_at")
                VALUES ($1, $2, $3, true, $4, $4)
              `, [bindingId, roleId, perm.id, now]);
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seeding completed.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
