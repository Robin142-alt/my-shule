import test from 'node:test';
import assert from 'node:assert/strict';

import { runMaintainabilityScan } from './maintainability-scan';

test('runMaintainabilityScan fails internal UUID copy in production forms', () => {
  const result = runMaintainabilityScan({
    workspaceRoot: process.cwd(),
    sourceOverrides: {
      'apps/web/src/components/school/school-pages.tsx': 'placeholder="Student UUID"',
      'apps/web/src/components/discipline/discipline-workspace.tsx': 'Student record ID',
      'apps/web/src/components/library/library-workspace.tsx': 'Scan student ID',
      'apps/web/src/app/support/status/page.tsx': 'Live status unavailable',
      '.gitignore': 'apps/web/test-results/',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.id === 'no-internal-id-copy')?.status, 'fail');
});

test('runMaintainabilityScan passes practical production copy and artifact hygiene', () => {
  const result = runMaintainabilityScan({
    workspaceRoot: process.cwd(),
    sourceOverrides: {
      'apps/web/src/components/school/school-pages.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/discipline/discipline-workspace.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/library/library-workspace.tsx': 'Learner name or admission number',
      'apps/web/src/app/support/status/page.tsx': 'Live status temporarily unavailable',
      '.gitignore': 'apps/web/test-results/',
      'docs/architecture/implementation90-scale-security-reliability.md': '5000+ users per second breach-resistant reliability maintainability',
      'docs/runbooks/extreme-scale-incident.md': 'database saturation Redis degradation queue backlog lockdown mode',
      'docs/runbooks/security-lockdown-mode.md': 'Rotate suspected secrets Disable provider callbacks Preserve audit logs',
      'apps/api/src/scripts/implementation90-load-profile.ts': 'IMPLEMENTATION90_TRAFFIC_PROFILE validateImplementation90Budgets runImplementation90LoadProfile',
      'package.json': 'implementation90:load-profile implementation90:full-release-gate npm run implementation90:load-profile npm run perf:query-plan-review npm run test:chaos npm run test:gameday npm run release:readiness',
      '.env.production.example': 'IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000 SECURITY_LOCKDOWN_BYPASS_SECRET',
    },
  });

  assert.equal(result.ok, true);
});

test('runMaintainabilityScan fails when the Implementation 90 full release gate is missing', () => {
  const result = runMaintainabilityScan({
    workspaceRoot: process.cwd(),
    sourceOverrides: {
      'apps/web/src/components/school/school-pages.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/discipline/discipline-workspace.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/library/library-workspace.tsx': 'Learner name or admission number',
      'apps/web/src/app/support/status/page.tsx': 'Live status temporarily unavailable',
      '.gitignore': 'apps/web/test-results/',
      'docs/architecture/implementation90-scale-security-reliability.md': '5000+ users per second breach-resistant reliability maintainability',
      'docs/runbooks/extreme-scale-incident.md': 'database saturation Redis degradation queue backlog lockdown mode',
      'docs/runbooks/security-lockdown-mode.md': 'Rotate suspected secrets Disable provider callbacks Preserve audit logs',
      'apps/api/src/scripts/implementation90-load-profile.ts': 'IMPLEMENTATION90_TRAFFIC_PROFILE validateImplementation90Budgets runImplementation90LoadProfile',
      'package.json': 'implementation90:load-profile npm run implementation90:load-profile',
      '.env.production.example': 'IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000 SECURITY_LOCKDOWN_BYPASS_SECRET',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((check) => check.id === 'implementation90-release-gates' && check.status === 'fail'),
    true,
  );
});

test('runMaintainabilityScan fails when Implementation 90 runbooks and gates are missing', () => {
  const result = runMaintainabilityScan({
    workspaceRoot: process.cwd(),
    sourceOverrides: {
      'apps/web/src/components/school/school-pages.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/discipline/discipline-workspace.tsx': 'Search learner by name or admission number',
      'apps/web/src/components/library/library-workspace.tsx': 'Learner name or admission number',
      'apps/web/src/app/support/status/page.tsx': 'Live status temporarily unavailable',
      '.gitignore': 'apps/web/test-results/',
      'docs/architecture/implementation90-scale-security-reliability.md': '',
      'docs/runbooks/extreme-scale-incident.md': '',
      'docs/runbooks/security-lockdown-mode.md': '',
      'apps/api/src/scripts/implementation90-load-profile.ts': '',
      'package.json': '',
      '.env.production.example': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((check) => check.id === 'implementation90-architecture-runbooks' && check.status === 'fail'),
    true,
  );
  assert.equal(
    result.checks.some((check) => check.id === 'implementation90-release-gates' && check.status === 'fail'),
    true,
  );
});
