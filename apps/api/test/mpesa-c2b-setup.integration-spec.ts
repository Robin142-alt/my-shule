import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { PiiEncryptionService } from '../src/modules/security/pii-encryption.service';
import { TenantFinanceSchemaService } from '../src/modules/tenant-finance/tenant-finance-schema.service';
import { TenantFinanceConfigRepository } from '../src/modules/tenant-finance/tenant-finance-config.repository';
import { TenantFinanceConfigService } from '../src/modules/tenant-finance/tenant-finance-config.service';
import { PAYMENT_CHANNEL_WORKFLOW_SCHEMA } from '../src/modules/tenant-finance/payment-channel-workflow-schema.service';
import { PaymentChannelWorkflowService } from '../src/modules/tenant-finance/payment-channel-workflow.service';
import { PaymentChannelConnectionService } from '../src/modules/tenant-finance/payment-channel-connection.service';
import { PaymentIngressConfigService } from '../src/modules/tenant-finance/payment-ingress-config.service';

describe('M-PESA C2B setup with an optional Express passkey', () => {
  const schema = `c2b_setup_${randomUUID().replaceAll('-', '')}`;
  const dbRole = `${schema}_role`;
  const context = new RequestContextService();
  const transactions = new AsyncLocalStorage<PoolClient>();
  let pool: Pool;
  let workflow: PaymentChannelWorkflowService;
  let repository: TenantFinanceConfigRepository;
  let finance: TenantFinanceConfigService;
  const encryption = new PiiEncryptionService({ get: () => 'a'.repeat(32) } as never);
  const credentials = { consumer_key: 'school-key', consumer_secret: 'school-secret',
    initiator_name: 'school-initiator', security_credential: 'school-security-credential' };

  async function transaction<T>(work: () => Promise<T>): Promise<T> {
    if (transactions.getStore()) return work();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${dbRole}`);
      const actor = context.requireStore();
      await client.query(`SELECT set_config('app.tenant_id',$1,true),set_config('app.role',$2,true),set_config('app.is_authenticated','true',true)`,
        [actor.tenant_id ?? '', actor.role]);
      const result = await transactions.run(client, work);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  const db = { withRequestTransaction: transaction, query: (sql: string, params: unknown[] = []): Promise<any> =>
    transactions.getStore() ? transactions.getStore()!.query(sql, params) : transaction(() => transactions.getStore()!.query(sql, params)) };
  function as<T>(school: string, role: string, work: () => Promise<T>) {
    return context.run({ tenant_id: school, role, user_id: randomUUID(), audience: role === 'platform_owner' ? 'superadmin' : 'school',
      is_authenticated: true } as never, work);
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Use the disposable local PostgreSQL test harness');
    pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema},public`, max: 4 });
    await pool.query(`CREATE SCHEMA ${schema}; CREATE SCHEMA IF NOT EXISTS app; CREATE ROLE ${dbRole} NOLOGIN;
      CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
      CREATE TABLE mpesa_transactions(tenant_id text,status text,amount_minor bigint,transaction_occurred_at timestamptz,processed_at timestamptz,created_at timestamptz,ledger_transaction_id uuid);
      CREATE TABLE payment_intents(tenant_id text,status text);
      CREATE TABLE callback_logs(tenant_id text,processing_status text);
      CREATE TABLE test_effects(tenant_id text,kind text,payload jsonb);`);
    await new TenantFinanceSchemaService({ runSchemaBootstrap: (sql: string) => pool.query(sql) } as never,
      { onModuleInit: async () => undefined } as never).onModuleInit();
    await pool.query(PAYMENT_CHANNEL_WORKFLOW_SCHEMA);
    await pool.query(`GRANT USAGE ON SCHEMA ${schema},app TO ${dbRole}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${dbRole}`);
    const effect = (kind: string, payload: unknown) => db.query('INSERT INTO test_effects VALUES($1,$2,$3::jsonb)',
      [context.requireStore().tenant_id, kind, JSON.stringify(payload)]);
    const audit = { record: (payload: unknown) => effect('audit', payload) };
    const config = { get: (key: string) => key === 'payments.callbackBaseUrl' ? 'https://payments.example.com/payments/ingress' : undefined };
    repository = new TenantFinanceConfigRepository(db as never, encryption);
    finance = new TenantFinanceConfigService(repository, config as never, audit as never);
    workflow = new PaymentChannelWorkflowService(context, db as never, encryption, finance, repository,
      new PaymentChannelConnectionService(config as never, new PaymentIngressConfigService(config as never)), audit as never,
      { publish: (payload: unknown) => effect('event', payload) } as never,
      { upsertFromSchoolOperation: (payload: unknown) => effect('notification', payload), resolveRequiredAction: async () => undefined } as never);
  });

  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; DROP OWNED BY ${dbRole}; DROP ROLE IF EXISTS ${dbRole}`);
      await pool.end();
    }
  });
  afterEach(() => jest.restoreAllMocks());

  test('failed registration persists safe diagnostics for dashboard follow-up and prevents activation', async () => {
    const school='school-failed-registration';
    const requested=await as(school,'accountant',()=>workflow.request({provider_code:'safaricom',channel_kind:'mpesa_paybill',
      display_name:'Fees Paybill',account_name:'School fees',account_number:'600991',reason:'Receive school fee collections'}));
    await as(school,'principal',()=>workflow.decide(requested.id,{decision:'approve',reason:'Verified school destination'}));
    await as(school,'platform_owner',()=>workflow.connect(school,requested.id,{environment:'sandbox',connection_mode:'daraja',credentials}));
    jest.spyOn(global,'fetch').mockImplementation(async url=>Response.json(String(url).includes('/oauth/')?{access_token:'provider-secret'}:
      {ResponseCode:'1',ResponseDescription:`Invalid Confirmation URL ${credentials.consumer_secret} provider-secret`}));
    const checked=await as(school,'platform_owner',()=>workflow.test(school,requested.id));
    expect(checked.status).toBe('connecting');expect(checked.last_test_status).toBe('failed');
    expect(checked.last_error).toContain('ResponseCode=1; ResponseDescription=Invalid Confirmation URL');
    await expect(as(school,'platform_owner',()=>workflow.activate(school,requested.id))).rejects.toThrow();
    const stored=(await pool.query('SELECT last_error FROM tenant_payment_channel_revisions WHERE tenant_id=$1',[school])).rows[0];
    expect(stored.last_error).toBe(checked.last_error);
    const effects=(await pool.query('SELECT kind,payload FROM test_effects WHERE tenant_id=$1',[school])).rows;
    for(const kind of ['audit','event','notification'])expect(effects.some(row=>row.kind===kind)).toBe(true);
    expect(JSON.stringify([checked,effects])).not.toContain(credentials.consumer_secret);
    expect(JSON.stringify([checked,effects])).not.toContain('provider-secret');
  });

  test.each([
    ['sandbox', false], ['sandbox', true], ['production', false], ['production', true],
  ] as const)('%s connection, C2B registration and activation (STK passkey supplied: %s)', async (environment, withStk) => {
    const school = `school-${environment}-${withStk ? 'stk' : 'c2b'}`;
    const shortcode = withStk ? '247248' : '247247';
    const passkey = withStk ? 'school-stk-passkey' : undefined;
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => new Response(JSON.stringify(
      String(url).includes('/oauth/') ? { access_token: 'test-provider-token' } : { ResponseCode: '0', ResponseDescription: 'Accepted' }), { status: 200 }));
    const requested = await as(school, 'accountant', () => workflow.request({ provider_code: 'safaricom', channel_kind: 'mpesa_paybill',
      display_name: 'Fees Paybill', account_name: 'School fees', account_number: shortcode, reason: 'Receive school fee collections' }));
    await as(school, 'principal', () => workflow.decide(requested.id, { decision: 'approve', reason: 'Verified school destination' }));
    const connected = await as(school, 'platform_owner', () => workflow.connect(school, requested.id, {
      environment, connection_mode: 'daraja', credentials: { ...credentials, ...(passkey ? { passkey } : {}) },
    }));
    expect(connected.status).toBe('connecting');
    expect(connected).not.toHaveProperty('credentials_ciphertext');
    const checked = await as(school, 'platform_owner', () => workflow.test(school, requested.id));
    expect(checked.status).toBe('ready');
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual([
      `https://${environment === 'production' ? 'api' : 'sandbox'}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
      `https://${environment === 'production' ? 'api' : 'sandbox'}.safaricom.co.ke/mpesa/c2b/v2/registerurl`,
    ]);
    const activated = await as(school, 'platform_owner', () => workflow.activate(school, requested.id));
    expect(activated.status).toBe('active');
    const summary = await as(school, 'accountant', () => finance.getSummary(school));
    if (environment === 'sandbox') {
      expect(activated.channel_id).toBeNull();
      expect(summary.mpesa_configs).toHaveLength(0);
    } else {
      expect(activated.channel_id).toBeTruthy();
      expect(summary.mpesa_configs).toHaveLength(1);
      const resolved = await as(school, 'accountant', () => finance.resolveMpesaConfigByShortcode(shortcode));
      expect(resolved.passkey).toBe(passkey ?? '');
      expect(resolved.payment_channel_id).toBe(activated.channel_id);
      expect(resolved.consumer_secret).toBe(credentials.consumer_secret);
      const stored = await pool.query('SELECT passkey,consumer_secret FROM tenant_mpesa_configs WHERE tenant_id=$1', [school]);
      expect(stored.rows[0].consumer_secret).toMatch(/^enc:v1:/);
      expect(stored.rows[0].passkey).toEqual(withStk ? expect.stringMatching(/^enc:v1:/) : '');
      expect(await as('other-school', 'accountant', () => repository.findMpesaConfigForTenantById('other-school', summary.mpesa_configs[0].id))).toBeNull();
      // Rotating C2B credentials must not introduce an unreadable empty ciphertext.
      await as(school, 'platform_owner', () => finance.rotateMpesaCredentials(school, summary.mpesa_configs[0].id, { consumer_secret: 'rotated-school-secret' }));
      const rotated = await as(school, 'accountant', () => finance.resolveMpesaConfigByShortcode(shortcode));
      expect(rotated.passkey).toBe(passkey ?? '');
      expect(rotated.consumer_secret).toBe('rotated-school-secret');
    }
    const effects = (await pool.query('SELECT kind,payload FROM test_effects WHERE tenant_id=$1', [school])).rows;
    for (const kind of ['audit', 'event', 'notification']) expect(effects.some(row => row.kind === kind)).toBe(true);
    expect(JSON.stringify(effects)).not.toContain(credentials.consumer_secret);
    expect(JSON.stringify(effects)).not.toContain('school-stk-passkey');
  });
});
