import { createHash, randomBytes, randomInt } from 'node:crypto';
import process from 'node:process';

import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
const apiBaseUrl = process.env.MIGRATION_API_BASE_URL;
const expectedDatabase = process.env.MIGRATION_EXPECTED_DATABASE;
const safetyAcknowledgement = process.env.ALLOW_ISOLATED_MIGRATION_AUTH_SMOKE;

if (!connectionString || !apiBaseUrl || !expectedDatabase) {
  throw new Error('DATABASE_URL, MIGRATION_API_BASE_URL, and MIGRATION_EXPECTED_DATABASE are required.');
}

if (safetyAcknowledgement !== 'I_UNDERSTAND_THIS_MUTATES_ONLY_THE_RESTORE_TARGET') {
  throw new Error('Set ALLOW_ISOLATED_MIGRATION_AUTH_SMOKE to the documented safety acknowledgement.');
}

const parsedApiUrl = new URL(apiBaseUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedApiUrl.hostname)) {
  throw new Error('Authenticated restore smoke tests are restricted to a loopback API instance.');
}

const client = new Client({
  application_name: 'myshule_restored_application_verification',
  connectionString,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

const candidatesToRestore = new Map();

const requestJson = async (path, options = {}) => {
  const response = await fetch(new URL(path, apiBaseUrl), {
    ...options,
    headers: {
      accept: 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  let parsedBody = null;
  if (body) {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = { non_json_response: true };
    }
  }
  return { body: parsedBody, status: response.status };
};

try {
  await client.connect();
  const databaseResult = await client.query('select current_database() as database_name');
  const databaseName = databaseResult.rows[0]?.database_name;
  if (databaseName !== expectedDatabase) {
    throw new Error(`Refusing to mutate unexpected database ${databaseName ?? '<unknown>'}.`);
  }

  const candidateResult = await client.query(`
    select
      u.id,
      u.email,
      u.password_hash,
      u.updated_at,
      tm.tenant_id,
      r.code as role_code
    from users u
    join tenant_memberships tm
      on tm.user_id = u.id
     and tm.status = 'active'
    join roles r
      on r.id = tm.role_id
     and r.tenant_id = tm.tenant_id
    join tenants t
      on t.tenant_id = tm.tenant_id
    where u.status = 'active'
      and u.email_verified_at is not null
      and coalesce(u.mfa_enabled, false) = false
      and t.status = 'active'
      and r.code in ('admissions_officer', 'teacher')
      and lower(coalesce(t.subdomain, '')) not like '%demo%'
      and lower(coalesce(t.name, '')) not like '%demo%'
    order by r.code, u.created_at
  `);
  const admissionsCandidate = candidateResult.rows.find(({ role_code: roleCode }) => roleCode === 'admissions_officer');
  const academicCandidate = candidateResult.rows.find(({ role_code: roleCode, tenant_id: tenantId }) =>
    roleCode === 'teacher' && tenantId === admissionsCandidate?.tenant_id);
  const candidates = [admissionsCandidate, academicCandidate];
  if (candidates.some((candidate) => !candidate)) {
    throw new Error('Eligible admissions and teacher users were not found in the same restored school.');
  }

  const authenticate = async (candidate) => {
    candidatesToRestore.set(candidate.id, candidate);
    const temporaryPassword = `Migration-${randomBytes(18).toString('base64url')}`;
    const temporaryHash = await bcrypt.hash(temporaryPassword, 12);
    await client.query('update users set password_hash = $1 where id = $2', [temporaryHash, candidate.id]);
    const mfaCode = randomInt(100000, 1000000).toString();
    const mfaCodeHash = createHash('sha256').update(mfaCode).digest('hex');
    const challengeResult = await client.query(`
      insert into auth_mfa_challenges (user_id, code_hash, purpose, expires_at)
      values ($1::uuid, $2, 'login', now() + interval '5 minutes')
      returning id
    `, [candidate.id, mfaCodeHash]);
    const challengeId = challengeResult.rows[0].id;

    try {
      const login = await requestJson('/auth/login', {
        body: JSON.stringify({
          audience: 'school',
          email: candidate.email,
          mfa_code: mfaCode,
          password: temporaryPassword,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      if (login.status !== 201 || !login.body?.tokens?.access_token) {
        const reason = typeof login.body?.message === 'string' ? `: ${login.body.message}` : '';
        throw new Error(`Restored API login failed for ${candidate.role_code} with HTTP ${login.status}${reason}.`);
      }
      return {
        authorization: `Bearer ${login.body.tokens.access_token}`,
        'x-tenant-id': candidate.tenant_id,
      };
    } finally {
      await client.query('delete from auth_mfa_challenges where id = $1', [challengeId]);
      await client.query(
        'update users set password_hash = $1, updated_at = $2 where id = $3',
        [candidate.password_hash, candidate.updated_at, candidate.id],
      );
      candidatesToRestore.delete(candidate.id);
    }
  };

  const admissionsHeaders = await authenticate(admissionsCandidate);
  const academicHeaders = await authenticate(academicCandidate);
  const probes = [
    { headers: admissionsHeaders, path: '/auth/me', role: 'admissions_officer' },
    { headers: admissionsHeaders, path: '/dashboard/summary', role: 'admissions_officer' },
    { headers: admissionsHeaders, path: '/admissions/summary', role: 'admissions_officer' },
    { headers: admissionsHeaders, path: '/admissions/classes', role: 'admissions_officer' },
    { headers: admissionsHeaders, path: '/admissions/foundation', role: 'admissions_officer' },
    { headers: admissionsHeaders, path: '/admissions/applications?limit=5&offset=0', role: 'admissions_officer' },
    { headers: academicHeaders, path: '/auth/me', role: 'teacher' },
    { headers: academicHeaders, path: '/dashboard/summary', role: 'teacher' },
    { headers: academicHeaders, path: '/academics/foundation', role: 'teacher' },
    { headers: academicHeaders, path: '/academics/academic-years', role: 'teacher' },
    { headers: academicHeaders, path: '/academics/class-sections', role: 'teacher' },
    { headers: academicHeaders, path: '/academics/subjects', role: 'teacher' },
    { headers: academicHeaders, path: '/academics/summary', role: 'teacher' },
  ];

  const results = [];
  for (const probe of probes) {
    const result = await requestJson(probe.path, { headers: probe.headers });
    results.push({ path: probe.path, role: probe.role, status: result.status });
  }
  const failures = results.filter(({ status }) => status < 200 || status >= 300);

  console.log(JSON.stringify({
    authenticated_roles: ['admissions_officer', 'teacher'],
    database: databaseName,
    failed_probes: failures,
    passed_probes: results.length - failures.length,
    probes: results,
    total_probes: results.length,
  }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
} finally {
  for (const candidate of candidatesToRestore.values()) {
    await client.query(
      'update users set password_hash = $1, updated_at = $2 where id = $3',
      [candidate.password_hash, candidate.updated_at, candidate.id],
    ).catch(() => undefined);
  }
  await client.end().catch(() => undefined);
}
