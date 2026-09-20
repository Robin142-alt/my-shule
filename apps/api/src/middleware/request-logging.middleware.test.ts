import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';

import { RequestLoggingMiddleware, shouldRecordApiSloMetric } from './request-logging.middleware';
import { SloMetricsService } from '../modules/observability/slo-metrics.service';

test('RequestLoggingMiddleware excludes health and observability probes from API SLO latency', () => {
  assert.equal(shouldRecordApiSloMetric('/health'), false);
  assert.equal(shouldRecordApiSloMetric('/health/ready'), false);
  assert.equal(shouldRecordApiSloMetric('/observability/health'), false);
  assert.equal(shouldRecordApiSloMetric('/observability/dashboard'), false);
  assert.equal(shouldRecordApiSloMetric('/students'), true);
  assert.equal(shouldRecordApiSloMetric('/payments/mpesa/stk'), true);
});

test('stream lifetimes remain observable without counting normal closure as API failure or latency', () => {
  const metrics = new SloMetricsService({ get: () => undefined } as never);
  const logs: unknown[] = [];
  const middleware = new RequestLoggingMiddleware({ logRequest: (...args: unknown[]) => logs.push(args) } as never, metrics);
  const close = (contentType: string, statusCode: number) => {
    const response = Object.assign(new EventEmitter(), {
      statusCode, writableEnded: false,
      getHeader: (name: string) => name === 'content-type' ? contentType : undefined,
    });
    middleware.use({ method: 'GET', url: '/events/dashboard/stream' } as never, response as never, () => {});
    response.emit('close');
    response.emit('finish'); // Completion must still be recorded only once.
  };
  close('text/event-stream; charset=utf-8', 200);
  assert.equal(metrics.getEvents({ subsystem: 'api', operation: 'request' }).length, 0);
  assert.equal(metrics.getEvents({ subsystem: 'api', operation: 'stream' }).length, 1);
  close('application/json', 200);
  close('application/json', 500);
  close('text/event-stream', 500);
  const failures = metrics.getEvents({ subsystem: 'api', operation: 'request' });
  assert.equal(failures.length, 3);
  assert.ok(failures.every(event => event.outcome === 'failure'));
  assert.equal(logs.length, 8, 'All received and closed requests remain logged');
});
