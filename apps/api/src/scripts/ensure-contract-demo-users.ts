import { randomUUID } from 'node:crypto';

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const CONFIRM_FLAG = '--confirm-contract-demo-users';
const PASSWORD = 'password123';
const TENANT_ID = 'kb-high';

const schoolUsers = [
  { email: 'principal@kisumuboys.demo', displayName: 'Kisumu Boys Principal', roleCode: 'principal' },
  { email: 'teacher@kisumuboys.demo', displayName: 'Kisumu Boys Teacher', roleCode: 'teacher' },
  { email: 'librarian@kisumuboys.demo', displayName: 'Kisumu Boys Librarian', roleCode: 'librarian' },
  { email: 'accountant@kisumuboys.demo', displayName: 'Kisumu Boys Accountant', roleCode: 'accountant' },
  { email: 'secretary@kisumuboys.demo', displayName: 'Kisumu Boys Secretary', roleCode: 'secretary' },
] as const;

async function main() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(`Refusing to seed demo credentials without ${CONFIRM_FLAG}`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    statement_timeout: 30_000,
  });
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await client.connect();

  try {
    await client.query('BEGIN');

    const ownerUserId = await upsertUser(client, {
      email: 'admin@myshule.io',
      displayName: 'MyShule Platform Owner',
      passwordHash,
      userType: 'platform_owner',
    });

    await client.query(`
      INSERT INTO tenants (tenant_id, name, subdomain, status, settings, metadata, created_at, updated_at)
      VALUES ($1, 'Kisumu Boys', $1, 'active', '{}'::jsonb, '{"demo": true, "contract_seed": true}'::jsonb, NOW(), NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        name = 'Kisumu Boys',
        subdomain = EXCLUDED.subdomain,
        status = 'active',
        metadata = COALESCE(tenants.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
    `, [TENANT_ID]);

    await client.query(`
      INSERT INTO tenant_domains (tenant_id, domain, domain_type, status, verified_at, metadata, created_by_user_id, created_at, updated_at)
      VALUES ($1, 'kb-high.localhost', 'subdomain', 'active', NOW(), '{"contract_seed": true}'::jsonb, $2, NOW(), NOW())
      ON CONFLICT (tenant_id, domain)
      DO UPDATE SET
        status = 'active',
        verified_at = COALESCE(tenant_domains.verified_at, NOW()),
        created_by_user_id = COALESCE(tenant_domains.created_by_user_id, EXCLUDED.created_by_user_id),
        updated_at = NOW()
    `, [TENANT_ID, ownerUserId]);

    for (const roleCode of ['principal', 'teacher', 'librarian', 'accountant', 'secretary']) {
      await client.query(`
        INSERT INTO roles (tenant_id, code, name, description, is_system, created_at, updated_at)
        VALUES ($1, $2, initcap(replace($2, '_', ' ')), 'Contract demo role', TRUE, NOW(), NOW())
        ON CONFLICT (tenant_id, code)
        DO UPDATE SET name = EXCLUDED.name, is_system = TRUE, updated_at = NOW()
      `, [TENANT_ID, roleCode]);
    }

    for (const user of schoolUsers) {
      const userId = await upsertUser(client, {
        email: user.email,
        displayName: user.displayName,
        passwordHash,
        userType: 'member',
      });

      const roleResult = await client.query<{ id: string }>(
        'SELECT id FROM roles WHERE tenant_id = $1 AND code = $2 LIMIT 1',
        [TENANT_ID, user.roleCode],
      );
      const roleId = roleResult.rows[0]?.id;
      if (!roleId) {
        throw new Error(`Missing role ${user.roleCode}`);
      }

      await client.query(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', NOW(), NOW())
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', updated_at = NOW()
      `, [TENANT_ID, userId, roleId]);
    }

    await client.query('COMMIT');
    console.log(`Seeded contract demo credentials for ${TENANT_ID} and platform owner.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function upsertUser(
  client: Client,
  input: {
    email: string;
    displayName: string;
    passwordHash: string;
    userType: 'member' | 'platform_owner';
  },
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [input.email],
  );
  const existingId = existing.rows[0]?.id;

  if (existingId) {
    await client.query(`
      UPDATE users
      SET
        tenant_id = 'global',
        full_name = $2,
        display_name = $2,
        password_hash = $3,
        user_type = $4,
        status = 'active',
        email_verified_at = COALESCE(email_verified_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
    `, [existingId, input.displayName, input.passwordHash, input.userType]);

    return existingId;
  }

  const id = randomUUID();
  await client.query(`
    INSERT INTO users (
      id,
      tenant_id,
      email,
      password_hash,
      full_name,
      display_name,
      user_type,
      status,
      email_verified_at,
      mfa_enabled,
      created_at,
      updated_at
    )
    VALUES ($1, 'global', lower($2), $3, $4, $4, $5, 'active', NOW(), FALSE, NOW(), NOW())
  `, [id, input.email, input.passwordHash, input.displayName, input.userType]);

  return id;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
