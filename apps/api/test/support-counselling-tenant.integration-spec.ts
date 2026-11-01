import 'reflect-metadata';
import { Pool } from 'pg';
import { SupportController } from '../src/modules/support/support.controller';

describe('Support counselling school identity', () => {
  let pool: Pool;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1'].includes(url.hostname)
      || !url.pathname.includes('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=support_identity,public' });
    await pool.query(`CREATE SCHEMA support_identity;
      CREATE TABLE counselling_sessions(id uuid,tenant_id text,school_id uuid,student_id uuid,
        counsellor_user_id uuid,scheduled_for timestamptz,location text,agenda text,status text);
      INSERT INTO counselling_sessions(id,tenant_id,school_id,student_id)
        VALUES(gen_random_uuid(),'another-school','00000000-0000-0000-0000-000000000001',gen_random_uuid());`);
  });
  afterAll(async () => { await pool?.end(); });

  it.each(['kibabi-high', '00000000-0000-0000-0000-000000000001'])(
    'accepts text tenant %s and excludes another school even when its legacy school UUID matches', async tenant => {
      const controller = new SupportController({} as never, {} as never,
        { $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await pool.query(sql, values)).rows } as never,
        { requireStore: () => ({ tenant_id: tenant }) } as never, {} as never, {} as never);
      expect(await controller.getCounselling()).toEqual([]);
    });
});
