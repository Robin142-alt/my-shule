// @ts-nocheck
import { test as base } from '@playwright/test';
import { Pool } from 'pg';

type DatabaseFixtures = {
  dbPool: Pool;
  dbQuery: (query: string, params?: any[]) => Promise<any>;
};

export const test = base.extend<DatabaseFixtures>({
  dbPool: [async ({}, use) => {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/myshule';
    const pool = new Pool({ connectionString });
    await use(pool);
    await pool.end();
  }, { scope: 'worker' }],

  dbQuery: [async ({ dbPool }, use) => {
    const query = async (text: string, params?: any[]) => {
      const client = await dbPool.connect();
      try {
        const result = await client.query(text, params);
        return result.rows;
      } finally {
        client.release();
      }
    };
    await use(query);
  }, { scope: 'test' }],
});

export { expect } from '@playwright/test';
