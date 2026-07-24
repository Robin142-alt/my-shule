import assert from 'node:assert/strict';
import test from 'node:test';

import { writeArtifactFileSync } from './artifact-writer';

test('artifact writer retries transient Windows file access failures', () => {
  let attempts = 0;
  const delays: number[] = [];

  writeArtifactFileSync('readiness.md', 'pass', {
    baseDelayMs: 10,
    write: () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('transient file lock') as NodeJS.ErrnoException;
        error.code = 'UNKNOWN';
        throw error;
      }
    },
    sleep: (durationMs) => delays.push(durationMs),
  });

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
});

test('artifact writer does not retry permanent filesystem failures', () => {
  let attempts = 0;

  assert.throws(
    () =>
      writeArtifactFileSync('missing/readiness.md', 'pass', {
        write: () => {
          attempts += 1;
          const error = new Error('directory missing') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        },
        sleep: () => {
          throw new Error('permanent failures must not sleep');
        },
      }),
    /directory missing/,
  );

  assert.equal(attempts, 1);
});
