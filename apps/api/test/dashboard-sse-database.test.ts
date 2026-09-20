import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { Client } from 'pg';
import { DashboardRealtimeController } from '../src/modules/events/dashboard-realtime.controller';
import { DashboardRealtimeService } from '../src/modules/events/dashboard-realtime.service';
import { OutboxEventsRepository } from '../src/modules/events/repositories/outbox-events.repository';
import { ModuleAccessService } from '../src/modules/module-access/module-access.service';
import { ModuleAccessRepository } from '../src/modules/module-access/module-access.repository';
import { PrismaService } from '../src/database/prisma.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { ResponseEnvelopeInterceptor } from '../src/interceptors/response-envelope.interceptor';
import { RequestIdInterceptor } from '../src/interceptors/request-id.interceptor';
import { RequestContextMiddleware } from '../src/middleware/request-context.middleware';
import type { Request, Response, NextFunction } from 'express';

test('database-backed SSE releases connections between polls under concurrent tenant traffic', { timeout: 60_000 }, async () => {
  const url = new URL(process.env.DATABASE_URL ?? 'postgres://invalid');
  assert.equal(process.env.MYSHULE_DISPOSABLE_POSTGRES, '1', 'Use the disposable PostgreSQL runner');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname.slice(1), process.env.MYSHULE_DISPOSABLE_POSTGRES_DATABASE);
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const context = new RequestContextService();
  const prisma = new PrismaService(context, { getRuntimeRoleName: () => 'sse_fixture_runtime' } as never);
  const aborts: AbortController[] = [];
  let streamResults: Promise<PromiseSettledResult<void>[]> = Promise.resolve([]);
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  try {
    await admin.query(`
      CREATE ROLE sse_fixture_runtime NOLOGIN NOBYPASSRLS;
      CREATE TABLE module_registry (id uuid PRIMARY KEY, code text, status text);
      CREATE TABLE school_module_access (
        tenant_id text, module_id uuid, enabled boolean, expires_at timestamptz,
        trial_ends_at timestamptz, access_level text
      );
      CREATE TABLE outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text, school_id text,
        event_key text, event_name text, aggregate_type text, aggregate_id uuid DEFAULT gen_random_uuid(),
        payload jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', status text DEFAULT 'published',
        attempt_count integer DEFAULT 0, available_at timestamptz DEFAULT now(), published_at timestamptz DEFAULT now(),
        last_error text, actor_user_id uuid, actor_role text, source_dashboard text, correlation_id uuid,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      );
      ALTER TABLE school_module_access ENABLE ROW LEVEL SECURITY;
      ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
      CREATE POLICY module_tenant ON school_module_access USING (tenant_id = current_setting('app.tenant_id', true));
      CREATE POLICY event_tenant ON outbox_events USING (tenant_id = current_setting('app.tenant_id', true));
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO sse_fixture_runtime;
      INSERT INTO module_registry VALUES ('11111111-1111-4111-8111-111111111111', 'admissions', 'active');
      INSERT INTO school_module_access (tenant_id, module_id, enabled, access_level)
        SELECT t, '11111111-1111-4111-8111-111111111111', true, 'standard' FROM unnest(ARRAY['tenant-a','tenant-b']) t;
      INSERT INTO outbox_events (tenant_id, school_id, event_key, event_name, aggregate_type, created_at)
        SELECT t,t,'fixture-' || t,'student.created','student','2026-09-20T00:00:00.123456Z'::timestamptz
        FROM unnest(ARRAY['tenant-a','tenant-b']) t;
    `);
    await prisma.$connect();
    assert.equal(await prisma.ping(), 'up');
    assert.equal(prisma.getPoolMetrics().totalCount, 1, 'Health must report the real pool, not a fixed count');
    const repository = new OutboxEventsRepository(prisma);
    const firstPage = await repository.listDashboardStreamEvents('tenant-a');
    assert.equal(firstPage[0].created_at, '2026-09-20T00:00:00.123456Z');
    const nextPage = await repository.listDashboardStreamEvents('tenant-a', {
      since: `${firstPage[0].created_at}|${firstPage[0].id}`,
    });
    assert.equal(nextPage.length, 0, 'PostgreSQL microseconds must not cause the final event to replay');
    const service = new DashboardRealtimeService(context, new OutboxEventsRepository(prisma),
      new ModuleAccessService(context, new ModuleAccessRepository(prisma)), { get: () => 5000 } as never);
    @Module({ controllers: [DashboardRealtimeController], providers: [{ provide: DashboardRealtimeService, useValue: service }] })
    class DatabaseWireTestModule {}
    app = await NestFactory.create(DatabaseWireTestModule, { logger: false });
    const middleware = new RequestContextMiddleware(context);
    app.use((req: Request, res: Response, next: NextFunction) => middleware.use(req, res, () => {
      context.setTenantId(String(req.headers['x-test-tenant']));
      context.setUserId('22222222-2222-4222-8222-222222222222');
      context.setRole('teacher');
      context.setPermissions(['students:read', 'auth:read']);
      context.setAuthenticated(true);
      next();
    }));
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(context, new Reflector()), new RequestIdInterceptor(context));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const streams = Array.from({ length: 16 }, async (_, i) => {
      const tenant = i % 2 ? 'tenant-a' : 'tenant-b';
      const abort = new AbortController();
      aborts.push(abort);
      const response = await fetch(`${base}/events/dashboard/stream`, {
        headers: { 'x-test-tenant': tenant }, signal: abort.signal,
      });
      const reader = response.body!.getReader();
      let wire = '';
      while ((wire.match(/event: dashboard.events\n/g) ?? []).length < 8) {
        const chunk = await reader.read();
        assert.equal(chunk.done, false);
        wire += new TextDecoder().decode(chunk.value);
      }
      assert.doesNotMatch(wire, /dashboard.events.error/);
      const snapshots = wire.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
      for (const snapshot of snapshots) {
        assert.equal(snapshot.tenant_id, tenant);
        for (const event of snapshot.events) assert.equal(event.tenantId, tenant);
      }
      assert.equal(snapshots[0].events.length, 1);
      assert.equal(snapshots[1].events.length, 0, 'Cursor must prevent replay');
      abort.abort();
    });
    // Attach rejection handlers immediately, including when another assertion
    // fails before streams finish. Cleanup must not mask that original failure.
    streamResults = Promise.allSettled(streams);
    for (let i = 0; i < 35; i++) {
      const started = Date.now();
      const response = await fetch(`${base}/events/dashboard/snapshot`, { headers: { 'x-test-tenant': 'tenant-a' } });
      assert.equal(response.status, 200);
      const elapsedMs = Date.now() - started;
      assert.ok(elapsedMs < 2000, `Ordinary requests must not wait for streams to close: sample ${i}, ${elapsedMs}ms, pool ${JSON.stringify(prisma.getPoolMetrics())}`);
      const body = await response.json() as { data: { events: unknown[] } };
      assert.equal(body.data.events.length, 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    for (const result of await streamResults) {
      if (result.status === 'rejected') throw result.reason;
    }
    const held = await admin.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'");
    assert.equal(held.rows[0].count, 0);
    assert.equal(prisma.getPoolMetrics().waitingCount, 0);
    assert.equal(prisma.getPoolMetrics().idleCount, prisma.getPoolMetrics().totalCount);
  } finally {
    aborts.forEach(abort => abort.abort());
    await streamResults;
    await app?.close();
    await prisma.$disconnect();
    await assert.rejects(prisma.ping(), /pool after calling end/);
    await admin.end();
  }
});
