import assert from 'node:assert/strict';
import { Pool, PoolClient } from 'pg';
import { FinanceController } from '../../src/modules/finance/finance.controller';
import { AdminCommandRepository } from '../../src/modules/admin-command/repositories/admin-command.repository';
import { EventPublisherService } from '../../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../../src/modules/events/repositories/outbox-events.repository';
import { SchoolOperationalEventsService } from '../../src/modules/events/school-operational-events.service';

// Run on the historical production schema after the real startup upgrades.
export async function verifyPrincipalOperations(pool: Pool, fixture: { tenantId: string; userId: string }) {
  const failures: string[] = [];
  const context = { tenant_id: fixture.tenantId, user_id: fixture.userId, role: 'principal', is_authenticated: true };
  let transaction: PoolClient | undefined;
  const query = async (sql: string, params: unknown[] = []) => {
    if (transaction) return transaction.query(sql, params);
    return withRequestTransaction(() => transaction!.query(sql, params));
  };
  const withRequestTransaction = async <T>(callback: (tx: any) => Promise<T>) => {
    if (transaction) return callback(tx);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE sidebar_read_test');
      await client.query('SET LOCAL row_security = on');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenant_id]);
      transaction = client;
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { transaction = undefined; client.release(); }
  };
  const tx = { $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await query(sql, params)).rows };
  const db = { query, withRequestTransaction };
  const requestContext = { requireStore: () => context, getStore: () => context };
  const publisher = new EventPublisherService(requestContext as never, new OutboxEventsRepository(db as never));
  const events = new SchoolOperationalEventsService(requestContext as never, publisher, {} as never);
  const finance = new FinanceController(db as never, db as never, requestContext as never, {} as never, publisher, events, {} as never);
  for (const [name, verify] of [
    ['fee category list', async () => { await finance.listFeeCategories(); }],
    ['fee category creation', async () => {
      const row = await finance.createFeeCategory({ name: 'Principal regression fee', amount_minor: 56600, description: 'School fee', currency_code: 'KES' });
      assert.equal(Number(row.amount_minor), 56600);
      assert.ok(row.updated_at);
      assert.equal(row.tenant_id, fixture.tenantId);
      assert.ok((await finance.listFeeCategories()).some((item: any) => item.id === row.id));
      await assert.rejects(finance.createFeeCategory({ name: ' ', amount_minor: 56600 }), (error: any) => error.status === 400);
      await assert.rejects(finance.createFeeCategory({ name: 'Invalid amount', amount_minor: -1 }), (error: any) => error.status === 400);
      await assert.rejects(finance.createFeeCategory({ name: row.name, amount_minor: 56600 }), (error: any) => error.status === 409);
      context.tenant_id = 'sidebar-record-school-b';
      assert.equal((await finance.listFeeCategories()).length, 0);
      await assert.rejects(finance.deleteFeeCategory(row.id), (error: any) => error.status === 404);
      context.tenant_id = fixture.tenantId;
      const updated = await finance.updateFeeCategory({ amount_minor: 60000 }, row.id);
      assert.equal(Number(updated.amount_minor), 60000);
      await finance.deleteFeeCategory(row.id);
      assert.equal((await finance.listFeeCategories()).length, 0);
      const audit = await query("SELECT action FROM audit_logs WHERE tenant_id=$1 AND resource_id=$2 ORDER BY created_at", [context.tenant_id, row.id]);
      assert.equal(audit.rowCount, 3);
      const emitted = await query("SELECT payload FROM outbox_events WHERE tenant_id=$1 AND payload->>'entity_id'=$2", [context.tenant_id, row.id]);
      assert.equal(emitted.rowCount, 3);
      assert.ok(emitted.rows.every(item => item.payload.actor_role === 'principal'));
      const withoutDescription = await finance.createFeeCategory({ name: 'Optional description', amount_minor: 500 });
      assert.equal(withoutDescription.description, null);
      assert.doesNotThrow(() => JSON.stringify(withoutDescription));
      const recordOperation = events.recordSchoolOperation.bind(events);
      events.recordSchoolOperation = async () => { throw new Error('Outbox unavailable'); };
      try {
        await assert.rejects(finance.createFeeCategory({ name: 'Must roll back', amount_minor: 500 }), /Outbox unavailable/);
        assert.equal((await query("SELECT id FROM finance_fee_categories WHERE tenant_id=$1 AND name='Must roll back'", [context.tenant_id])).rowCount, 0);
      } finally { events.recordSchoolOperation = recordOperation; }
    }],
    ['dashboard snapshot refresh', async () => {
      const repository = new AdminCommandRepository(db as never);
      const input = { tenant_id: fixture.tenantId, enabled_module_hash: 'principal-regression', filter_hash: 'all', payload: { tenant_id: fixture.tenantId, total: 1 } as any, ttl_seconds: 60 };
      await repository.upsertPrincipalDashboardSnapshot(input);
      await repository.upsertPrincipalDashboardSnapshot({ ...input, payload: { ...input.payload, total: 2 } });
      assert.equal((await repository.findPrincipalDashboardSnapshot(input) as any).total, 2);
      context.tenant_id = 'sidebar-record-school-b';
      assert.equal(await repository.findPrincipalDashboardSnapshot({ ...input, tenant_id: context.tenant_id }), null);
      context.tenant_id = fixture.tenantId;
    }],
  ] as const) {
    try { await verify(); } catch (error: any) { failures.push(`${name}: ${error.message}`); }
    finally { context.tenant_id = fixture.tenantId; }
  }
  assert.deepEqual(failures, [], 'Principal operations must work after upgrading an existing school database');
}
