import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Get, Sse, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { RequestContextService } from '../common/request-context/request-context.service';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

class TestController {
  @Sse('stream') stream() {}
  @Get('snapshot') snapshot() {}
}
const interceptor = new ResponseEnvelopeInterceptor(new RequestContextService(), new Reflector());
const context = (handler: () => void) => ({
  switchToHttp: () => ({ getRequest: () => ({ method: 'GET', query: {} }) }),
  getHandler: () => handler,
  getClass: () => TestController,
}) as unknown as ExecutionContext;

test('preserves SSE event names, data, cursor and retry fields without wrapping', async () => {
  const frame = { type: 'dashboard.events', id: 'event-1', retry: 5000, data: { tenant_id: 'tenant-a', events: [] } };
  const result = await firstValueFrom(interceptor.intercept(context(TestController.prototype.stream), { handle: () => of(frame) }));
  assert.equal(result, frame);
});

test('ordinary JSON GET responses keep their existing envelope', async () => {
  const snapshot = { tenant_id: 'tenant-a', events: [] };
  const result = await firstValueFrom(interceptor.intercept(context(TestController.prototype.snapshot), { handle: () => of(snapshot) }));
  assert.deepEqual(result, { data: snapshot, meta: { request_id: null } });
});
