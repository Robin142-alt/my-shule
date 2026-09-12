import { Pool, PoolClient } from 'pg';
import { ValidationPipe } from '@nestjs/common';
import { TenantInvitationsService } from '../src/auth/tenant-invitations.service';
import { DIRECTORY_STAFF_ROLE_CODES, ListTenantUsersQueryDto } from '../src/auth/dto/tenant-invitation.dto';

describe('School staff directory SQL', () => {
  let pool: Pool;
  let client: PoolClient;
  let service: TenantInvitationsService;
  let tenantId = 'school-a';

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !process.env.DATABASE_URL) {
      throw new Error('Run with run-integration-with-local-postgres.ts and a disposable database.');
    }
    const url = new URL(process.env.DATABASE_URL);
    if (!url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Disposable database required.');
    pool = new Pool({ connectionString: url.toString() });
    client = await pool.connect();
    // Temporary tables keep the fixture isolated from other integration suites.
    await client.query(`
      CREATE TEMP TABLE users (id text PRIMARY KEY, display_name text, email text);
      CREATE TEMP TABLE roles (id text PRIMARY KEY, tenant_id text, code text, name text);
      CREATE TEMP TABLE tenant_memberships (
        id text PRIMARY KEY, tenant_id text, user_id text, role_id text, status text,
        metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT '2026-09-01'
      );
      CREATE TEMP TABLE auth_action_tokens (
        id text PRIMARY KEY, tenant_id text, email text, metadata jsonb, purpose text,
        consumed_at timestamptz, expires_at timestamptz, created_at timestamptz DEFAULT '2026-09-01'
      );
    `);
    for (const school of ['school-a', 'school-b']) {
      for (const role of [...DIRECTORY_STAFF_ROLE_CODES, 'parent', 'student', 'super_admin', 'system_monitor']) {
        const id = `${school}-${role}`;
        await client.query('INSERT INTO roles VALUES ($1, $2, $3, $3)', [id, school, role]);
        await client.query('INSERT INTO users VALUES ($1, $2, $3)', [id, `Global ${role}`, `${id}@school.test`]);
        await client.query(`INSERT INTO tenant_memberships (id, tenant_id, user_id, role_id, status, metadata)
          VALUES ($1, $2, $1, $1, $3, $4)`, [id, school, role === 'nurse' ? 'suspended' : 'active', JSON.stringify({
          display_name: `School ${role}`, phone: '0712345678', department: 'Office',
          assignment: 'Administration', tsc_number: `TSC-${role}`,
        })]);
        await client.query(`INSERT INTO auth_action_tokens (id, tenant_id, email, metadata, purpose, expires_at)
          VALUES ($1, $2, $3, $4, 'invite_acceptance', NOW() + INTERVAL '1 day')`,
        [`invite-${id}`, school, `invite-${id}@school.test`, JSON.stringify({
          purpose: 'tenant_user_invitation', role_code: role, display_name: `Invited ${role}`, phone: '0799999999',
        })]);
      }
    }
    service = new TenantInvitationsService(
      { query: (sql: string, values: unknown[]) => client.query(sql, values) } as never,
      {} as never, {} as never, {} as never,
      { requireStore: () => ({ tenant_id: tenantId, user_id: 'principal', role: 'principal' }) } as never,
    );
  });
  afterAll(async () => { client?.release(); await pool?.end(); });

  it('returns all staff and staff invitations across stable pages without families or another school', async () => {
    const first = await service.listTenantUsers({ scope: 'staff', limit: 50 });
    const second = await service.listTenantUsers({ scope: 'staff', limit: 50, offset: 50 });
    expect(first.users).toHaveLength(50);
    const all = [...first.users, ...second.users];
    expect(all).toHaveLength(DIRECTORY_STAFF_ROLE_CODES.length * 2);
    expect(new Set(all.map((user) => user.id)).size).toBe(all.length);
    for (const user of all) {
      expect(DIRECTORY_STAFF_ROLE_CODES).toContain(user.role_code);
      expect(user.id).toContain('school-a');
    }
    expect(all.filter((user) => user.kind === 'member').map((user) => user.role_code).sort())
      .toEqual([...DIRECTORY_STAFF_ROLE_CODES].sort());
    expect((await service.listTenantUsers({ scope: 'staff', role_code: 'parent' })).users).toEqual([]);
    expect((await service.listTenantUsers({ scope: 'staff', role_code: 'student' })).users).toEqual([]);
    for (const role_code of ['school_admin', 'driver', 'hr_officer', 'procurement_officer', 'staff', 'clinic_staff']) {
      const staff = await service.listTenantUsers({ scope: 'staff', role_code });
      expect(staff.users).toHaveLength(2);
      expect(staff.users.every((user) => user.role_code === role_code)).toBe(true);
    }
    expect((await service.listTenantUsers({ scope: 'staff', status: 'suspended' })).users)
      .toEqual([expect.objectContaining({ id: 'school-a-nurse' })]);
    tenantId = 'school-b';
    try {
      const other = await service.listTenantUsers({ scope: 'staff', role_code: 'bursar' });
      expect(other.users).toHaveLength(2);
      expect(other.users.every((user) => user.id.includes('school-b'))).toBe(true);
    } finally { tenantId = 'school-a'; }
  });

  it('searches the displayed school name, email, phone, role, assignments and TSC number', async () => {
    for (const search of ['School accountant', 'school-a-accountant@school.test', '0712345678', 'accountant', 'Office', 'Administration', 'TSC-accountant']) {
      const result = await service.listTenantUsers({ scope: 'staff', role_code: 'accountant', search });
      expect(result.users).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'school-a-accountant' })]));
      expect(result.users.every((user) => user.id.includes('school-a'))).toBe(true);
    }
    const invitations = await service.listTenantUsers({ scope: 'staff', role_code: 'accountant', search: '0799999999' });
    expect(invitations.users).toEqual([expect.objectContaining({ id: 'invite-school-a-accountant' })]);
  });

  it('validates directory scope and preserves the existing unscoped family management API', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    const dto = await pipe.transform({ scope: 'staff', limit: '50', offset: '50' }, { type: 'query', metatype: ListTenantUsersQueryDto });
    expect(dto).toMatchObject({ scope: 'staff', limit: 50, offset: 50 });
    for (const role_code of DIRECTORY_STAFF_ROLE_CODES) {
      await expect(pipe.transform({ scope: 'staff', role_code }, { type: 'query', metatype: ListTenantUsersQueryDto }))
        .resolves.toMatchObject({ scope: 'staff', role_code });
    }
    await expect(pipe.transform({ scope: 'all-schools' }, { type: 'query', metatype: ListTenantUsersQueryDto })).rejects.toThrow();
    const family = await service.listTenantUsers({ role_code: 'parent' });
    expect(family.users).toHaveLength(2);
    expect(family.users.every((user) => user.role_code === 'parent')).toBe(true);
  });
});
