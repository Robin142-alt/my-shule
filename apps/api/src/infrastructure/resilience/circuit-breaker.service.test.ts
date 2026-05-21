import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CircuitBreakerService,
  IMPLEMENTATION90_REQUIRED_CIRCUITS,
} from './circuit-breaker.service';

test('CircuitBreakerService pre-registers Implementation 90 failure-domain circuits', () => {
  const service = new CircuitBreakerService();
  const states = service.getAllStates();

  for (const circuit of IMPLEMENTATION90_REQUIRED_CIRCUITS) {
    assert.equal(states[circuit].state, 'closed');
  }
});

test('CircuitBreakerService opens a default Implementation 90 circuit after repeated failures', async () => {
  const service = new CircuitBreakerService();

  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(
      () => service.execute('sms-provider', async () => {
        throw new Error('provider unavailable');
      }),
      /provider unavailable/,
    );
  }

  assert.equal(service.getState('sms-provider')?.state, 'open');
});
