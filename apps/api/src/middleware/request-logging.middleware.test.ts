import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRecordApiSloMetric } from './request-logging.middleware';

test('RequestLoggingMiddleware excludes health and observability probes from API SLO latency', () => {
  assert.equal(shouldRecordApiSloMetric('/health'), false);
  assert.equal(shouldRecordApiSloMetric('/health/ready'), false);
  assert.equal(shouldRecordApiSloMetric('/observability/health'), false);
  assert.equal(shouldRecordApiSloMetric('/observability/dashboard'), false);
  assert.equal(shouldRecordApiSloMetric('/students'), true);
  assert.equal(shouldRecordApiSloMetric('/payments/mpesa/stk'), true);
});
