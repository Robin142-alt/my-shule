import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DashboardRealtimeController } from '../src/modules/events/dashboard-realtime.controller';
import { DashboardRealtimeService } from '../src/modules/events/dashboard-realtime.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { ResponseEnvelopeInterceptor } from '../src/interceptors/response-envelope.interceptor';
import { RequestIdInterceptor } from '../src/interceptors/request-id.interceptor';
import { RequestContextMiddleware } from '../src/middleware/request-context.middleware';
import type { Request, Response, NextFunction } from 'express';
import { firstValueFrom, timeout } from 'rxjs';

test('slow SSE database polls do not overlap or discard their completed snapshot', { timeout: 9000 }, async () => {
  let polls = 0;
  const service = new DashboardRealtimeService({} as never, {} as never, {} as never, { get: () => 5000 } as never);
  service.getCurrentTenantSnapshot = async () => {
    polls += 1;
    await new Promise(resolve => setTimeout(resolve, 6000));
    return { tenant_id: 'tenant-a', generated_at: new Date().toISOString(), cursor: null, events: [] };
  };
  const frame = await firstValueFrom(service.streamCurrentTenantEvents().pipe(timeout(8000)));
  assert.equal(frame.type, 'dashboard.events');
  assert.equal(polls, 1);
});

test('real HTTP SSE retains named frames and separates concurrent tenant contexts', async () => {
  const context = new RequestContextService();
  const seenTenants: string[] = [];
  const service = new DashboardRealtimeService(context, {
    listDashboardStreamEvents: async (tenantId: string) => { seenTenants.push(tenantId); return []; },
  } as never, { listCurrentTenantModules: async () => [] } as never, { get: () => 5000 } as never);

  @Module({
    controllers: [DashboardRealtimeController],
    providers: [{ provide: DashboardRealtimeService, useValue: service }],
  })
  class WireTestModule {}

  const app = await NestFactory.create(WireTestModule, { logger: false });
  // Fixed local fixture identities. Production authentication remains in the
  // actual API guards; this test exercises the downstream transport contract.
  const requestContextMiddleware = new RequestContextMiddleware(context);
  app.use((request: Request, response: Response, next: NextFunction) => requestContextMiddleware.use(request, response, () => {
    context.setTenantId(String(request.headers['x-test-tenant']));
    context.setUserId('fixture-user');
    context.setRole('teacher');
    context.setPermissions(['auth:read']);
    context.setAuthenticated(true);
    next();
  }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(context, new Reflector()), new RequestIdInterceptor(context));
  await app.listen(0, '127.0.0.1');

  const readFrames = async (tenantId: string) => {
    const abort = new AbortController();
    const deadline = setTimeout(() => abort.abort(), 12_000);
    try {
      const response = await fetch(`${await app.getUrl()}/events/dashboard/stream`, {
        headers: { Accept: 'text/event-stream', 'x-test-tenant': tenantId, 'x-request-id': `wire-${tenantId}` }, signal: abort.signal,
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-request-id'), `wire-${tenantId}`);
      assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
      const reader = response.body!.getReader();
      let wire = '';
      while ((wire.match(/event: dashboard.events\n/g) ?? []).length < 2) {
        const chunk = await reader.read();
        assert.equal(chunk.done, false, `SSE closed before the second heartbeat (${Buffer.byteLength(wire)} bytes): ${wire}`);
        wire += new TextDecoder().decode(chunk.value);
      }
      for (const line of wire.split('\n').filter((line) => line.startsWith('data: '))) {
        const payload = JSON.parse(line.slice(6));
        assert.equal(payload.tenant_id, tenantId);
        assert.deepEqual(payload.events, []);
        assert.equal(payload.meta, undefined);
      }
      return wire;
    } finally { clearTimeout(deadline); abort.abort(); }
  };

  try {
    const snapshot = await fetch(`${await app.getUrl()}/events/dashboard/snapshot`, {
      headers: { 'x-test-tenant': 'tenant-a', 'x-request-id': 'snapshot-test' },
    });
    assert.equal(snapshot.headers.get('x-request-id'), 'snapshot-test');
    const snapshotBody = await snapshot.json() as { data: { tenant_id: string }; meta: { request_id: string } };
    assert.equal(snapshotBody.data.tenant_id, 'tenant-a');
    assert.equal(snapshotBody.meta.request_id, 'snapshot-test');
    await Promise.all([readFrames('tenant-a'), readFrames('tenant-b')]);
    assert.ok(seenTenants.filter((tenant) => tenant === 'tenant-a').length >= 2);
    assert.ok(seenTenants.filter((tenant) => tenant === 'tenant-b').length >= 2);
  } finally { await app.close(); }
});
