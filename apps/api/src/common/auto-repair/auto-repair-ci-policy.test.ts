import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('root test command includes dashboard auto-repair deployment coverage', () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const testScript = packageJson.scripts?.test ?? '';

  assert.match(testScript, /dist\/apps\/api\/src\/common\/auto-repair\/auto-repair-agent\.test\.js/);
  assert.match(testScript, /dist\/apps\/api\/src\/common\/auto-repair\/auto-repair-deployment\.test\.js/);
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/common\/platform-governance\/architecture-runtime-contract\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/common\/platform-governance\/architecture-validation-suite\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/common\/platform-governance\/operational-execution-contract\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/common\/platform-governance\/workflow-runtime-contract\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/modules\/events\/operational-workflow-dispatcher\.service\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/modules\/events\/consumers\/operational-workflow-dispatched\.consumer\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/modules\/events\/consumers\/operational-workflow-execution\.consumer\.test\.js/,
  );
  assert.match(
    testScript,
    /dist\/apps\/api\/src\/modules\/events\/consumers\/operational-workflow-completed\.consumer\.test\.js/,
  );
});
