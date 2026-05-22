import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation21CertificationMarkdown,
  runImplementation21Certification,
} from './implementation21-certification';

const passingSources: Record<string, string> = {
  'apps/api/src/modules/admin-command/principal-insights.providers.ts': 'finance summary_only lab_management communication_sms clinic_health permission_required: \'clinic:reports\' summary_only medicine_consumption_cost_minor wastage_due_to_expiry_minor emergency_supply_ready_rate most_used_medicine ai_insights fee_default_risk_alerts medicine_shortage_predictions attendance_irregularities budget_overrun_alerts performance_decline_warnings',
  'apps/api/src/modules/admin-command/principal-insights.service.ts': 'listCurrentTenantModules enabledModules.includes streamDashboard principal.dashboard buildDashboardForTenant appendAuditLog principal_dashboard.viewed',
  'apps/api/src/modules/admin-command/principal-insights-cache.service.ts': 'getOrSet ttlSeconds',
  'apps/api/src/modules/admin-command/admin-command-schema.service.ts': 'principal_dashboard_snapshots principal_alerts FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts': 'findPrincipalDashboardSnapshot upsertPrincipalDashboardSnapshot enabled_module_hash filter_hash case \'clinic_health\' medicine_consumption_cost_minor wastage_due_to_expiry_minor emergency_supply_ready_rate most_used_medicine case \'ai_insights\' fee_default_risk_alerts medicine_shortage_predictions attendance_irregularities budget_overrun_alerts performance_decline_warnings',
  'apps/api/src/modules/admin-command/admin-command.controller.ts': 'principal/dashboard principal_dashboard @Sse(\'principal/dashboard/stream\') principal_dashboard',
  'apps/web/src/components/school/principal-command-center.tsx': 'PrincipalCommandCenter Alerts and risk center enabled_modules new EventSource principal.dashboard',
  'apps/web/src/components/school/school-pages.tsx': 'ClinicOperationsPage Medicine batches Readiness medicine_consumption_cost_minor wastage_due_to_expiry_minor emergency_supply_ready_rate most_used_medicine',
  'apps/web/src/lib/dashboard/server-api-proxy.ts': 'text/event-stream upstreamResponse.body',
  'apps/web/src/app/api/admin-command/[...path]/route.ts': 'proxySchoolApiRequest "/admin-command"',
  'apps/api/src/modules/module-access/module-access.constants.ts': 'principal_dashboard clinic_health procurement ai_insights',
  'apps/api/src/modules/module-access/module-access-schema.service.ts': 'module_packages trial_ends_at module_usage_events',
  'apps/api/src/modules/module-access/module-access.repository.ts': 'createModulePackage cloneModulePackage recordModuleUsage',
  'apps/api/src/modules/module-access/module-access.controller.ts': 'module-packages clone',
  'apps/web/src/lib/module-access/module-access-map.ts': 'principal_dashboard clinic_health clinic: "clinic_health"',
  'apps/api/src/modules/clinic/clinic-schema.service.ts': 'clinic_medicines clinic_medicine_batches clinic_stock_movements clinic_visits clinic_medicine_dispenses clinic_alerts clinic_procurement_recommendations clinic_audit_logs prevent_clinic_stock_movement_mutation BEFORE DELETE ON clinic_stock_movements ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/clinic/clinic.service.ts': 'Expired medicine cannot be dispensed quarantined disposed recalled createLowStockProcurementRecommendations listEnabledModulesForTenant procurement isGuardianLinkedToStudent Parent is not linked to this student redactMedicalHistoryForParent confidential_notes clinic.medicine_created clinic.medicine_dispensed clinic.low_stock_check_completed',
  'apps/api/src/modules/clinic/repositories/clinic.repository.ts': 'withRequestTransaction quantity_available = quantity_available - clinic_medicine_dispenses dispensed medicines_dispensed medicine_name dosage medicine_consumption_cost_minor wastage_due_to_expiry_minor emergency_supply_ready_rate most_used_medicine',
  'apps/api/src/modules/clinic/clinic.processor.ts': 'runTenantMedicineExpiryCheck runTenantLowStockCheck',
  'apps/api/src/modules/clinic/clinic.controller.ts': 'clinic:inventory clinic:dispense clinic:reports portal:read_own_children',
  'apps/web/src/app/api/clinic/[...path]/route.ts': 'isParentRoute audience: isParentRoute ? "portal" : "school"',
  'apps/web/src/lib/experiences/portal-data.ts': 'id: "health" label: "Health"',
  'apps/web/src/components/portal/portal-pages.tsx': 'PortalHealthPage /api/clinic/parent/students/${encodeURIComponent',
  'apps/api/src/auth/auth.constants.ts': 'clinic_staff clinic:inventory clinic:confidential',
};

test('Implementation 21 certification passes when source evidence is present', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  assert.equal(result.ok, true);
  assert.equal(result.areas.every((area) => area.status === 'pass'), true);
  assert.match(result.areas[0].evidence_id, /^IMPLEMENTATION21-001-/);
});

test('Implementation 21 certification fails when clinic safety evidence is missing', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/clinic/clinic.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'expired-block' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 21 certification fails when principal snapshot evidence is missing', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/admin-command/admin-command-schema.service.ts': '',
      'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'principal-snapshot-schema' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 21 certification fails when deterministic AI alert evidence is missing', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/admin-command/principal-insights.providers.ts': 'finance summary_only lab_management communication_sms clinic_health permission_required: \'clinic:reports\' summary_only ai_insights',
      'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts': 'findPrincipalDashboardSnapshot upsertPrincipalDashboardSnapshot enabled_module_hash filter_hash',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'deterministic-ai-alerts' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 21 certification fails when clinic medicine finance analytics evidence is missing', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/clinic/repositories/clinic.repository.ts': 'withRequestTransaction quantity_available = quantity_available - clinic_medicine_dispenses dispensed medicines_dispensed medicine_name dosage',
      'apps/web/src/components/school/school-pages.tsx': 'ClinicOperationsPage Medicine batches Readiness',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'clinic-finance-safe-analytics' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 21 certification markdown is artifact-safe', () => {
  const result = runImplementation21Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  const markdown = renderImplementation21CertificationMarkdown(result);

  assert.match(markdown, /Implementation 21 Certification/);
  assert.match(markdown, /IMPLEMENTATION21-001-/);
  assert.equal(/password=/i.test(markdown), false);
});
