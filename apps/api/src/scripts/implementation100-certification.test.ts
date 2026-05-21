import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMPLEMENTATION100_MODULES,
  renderImplementation100CertificationMarkdown,
  runImplementation100Certification,
} from './implementation100-certification';

function buildPassingSources(): Record<string, string> {
  return IMPLEMENTATION100_MODULES.reduce<Record<string, string>>((sources, moduleDefinition) => {
    for (const check of moduleDefinition.checks) {
      sources[check.file] = `${sources[check.file] ?? ''}\n${check.testEvidence}`;
    }

    return sources;
  }, {});
}

test('Implementation 100 certification passes when every module has operational evidence', () => {
  const result = runImplementation100Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: buildPassingSources(),
  });

  assert.equal(result.module_count, 27);
  assert.equal(result.ok, true);
  assert.equal(result.modules.every((moduleResult) => moduleResult.status === 'pass'), true);
});

test('Implementation 100 certification fails when a live module proxy is missing', () => {
  const result = runImplementation100Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      ...buildPassingSources(),
      'apps/web/src/app/api/transport/[...path]/route.ts': '',
    },
  });

  const transport = result.modules.find((moduleResult) => moduleResult.code === 'transport');

  assert.equal(result.ok, false);
  assert.equal(transport?.status, 'fail');
  assert.equal(
    transport?.checks.some((check) => check.id === 'transport-frontend-api-proxy' && check.status === 'fail'),
    true,
  );
});

test('Implementation 100 certification recognizes existing proxy and schema evidence styles', () => {
  const result = runImplementation100Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      ...buildPassingSources(),
      'apps/web/src/app/api/school/[...path]/route.ts': 'proxySchoolApiRequest(request, context, "/school")',
      'apps/web/src/app/api/payments/[...path]/route.ts': 'proxyPaymentsRequest paymentsPath = `/payments/${(params.path ?? []).join("/")}` getDashboardApiBaseUrl',
      'apps/web/src/app/api/discipline/[...path]/route.ts': 'proxyDisciplineRequest upstreamPath = `/discipline/${(params.path ?? []).join("/")}` getDashboardApiBaseUrl',
      'apps/api/src/modules/admissions/repositories/admissions.repository.ts': 'FROM admission_applications LEFT JOIN admission_documents FROM student_academic_enrollments',
      'apps/web/src/components/dashboard/dashboard-view.tsx': 'DashboardView DashboardHome role snapshot online',
    },
  });

  for (const moduleCode of ['students', 'finance', 'discipline', 'admissions', 'principal_dashboard']) {
    const moduleResult = result.modules.find((item) => item.code === moduleCode);

    assert.equal(moduleResult?.status, 'pass', `${moduleCode} should pass with current evidence style`);
  }
});

test('Implementation 100 certification markdown is safe and names the no-half-working gate', () => {
  const result = runImplementation100Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: buildPassingSources(),
  });

  const markdown = renderImplementation100CertificationMarkdown(result);

  assert.match(markdown, /No-half-working-modules certification/);
  assert.match(markdown, /IMPLEMENTATION100-001-students/);
  assert.equal(/password=|consumer_secret/i.test(markdown), false);
});
