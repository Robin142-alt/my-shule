import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderModuleAccessCertificationMarkdown,
  runModuleAccessCertification,
} from './module-access-certification';

const passingSources: Record<string, string> = {
  'apps/api/src/modules/students/students.controller.ts': '@Controller(\'students\') @RequiresModule(\'students\')',
  'apps/api/src/modules/admissions/admissions.controller.ts': '@Controller(\'admissions\') @RequiresModule(\'admissions\')',
  'apps/api/src/modules/academics/academics.controller.ts': '@Controller(\'academics\') @RequiresModule(\'academics\')',
  'apps/api/src/modules/billing/billing.controller.ts': '@Controller(\'billing\') @RequiresModule(\'finance\')',
  'apps/api/src/modules/tenant-finance/tenant-finance.controller.ts': '@Controller(\'tenant-finance\') @RequiresModule(\'finance\')',
  'apps/api/src/modules/payments/controllers/payments.controller.ts': '@Controller(\'payments/mpesa\') @RequiresModule(\'finance\')',
  'apps/api/src/modules/exams/exams.controller.ts': '@Controller(\'exams\') @RequiresModule(\'exams\')',
  'apps/api/src/modules/discipline/discipline.controller.ts': '@Controller(\'discipline\') @RequiresModule(\'discipline\')',
  'apps/api/src/modules/discipline/counselling.controller.ts': '@Controller(\'counselling\') @RequiresModule(\'discipline\')',
  'apps/api/src/modules/timetable/timetable.controller.ts': '@Controller(\'timetable\') @RequiresModule(\'timetable\')',
  'apps/api/src/modules/labs/labs.controller.ts': '@Controller(\'labs\') @RequiresModule(\'lab_management\')',
  'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts': '@Controller(\'biometric-attendance\') @RequiresModule(\'teacher_biometric_attendance\')',
  'apps/api/src/modules/inventory/inventory.controller.ts': '@Controller(\'inventory\') @RequiresModule(\'inventory\')',
  'apps/api/src/modules/library/library.controller.ts': '@Controller(\'library\') @RequiresModule(\'library\')',
  'apps/api/src/modules/integrations/school-sms.controller.ts': '@Controller() @RequiresModule(\'communication_sms\')',
  'apps/api/src/modules/hr/hr.controller.ts': '@Controller(\'hr\') @RequiresModule(\'staff\')',
  'apps/api/src/modules/admin-command/admin-command.controller.ts': '@Controller(\'admin-command\') @RequiresModule(\'admin_command_centers\') @RequiresModule(\'admin_command_centers\', \'principal_dashboard\')',
  'apps/api/src/modules/clinic/clinic.controller.ts': '@Controller(\'clinic\') @RequiresModule(\'clinic_health\')',
  'apps/api/src/common/reports/report-export-jobs.controller.ts': '@Controller(\'reports\') @RequiresModule(\'reports\')',
  'apps/api/src/modules/transport/transport.controller.ts': '@Controller(\'transport\') @RequiresModule(\'transport\')',
  'apps/api/src/modules/procurement/procurement.controller.ts': '@Controller(\'procurement\') @RequiresModule(\'procurement\')',
  'apps/api/src/modules/hostel/hostel.controller.ts': '@Controller(\'hostel\') @RequiresModule(\'hostel\')',
  'apps/api/src/modules/boarding/boarding.controller.ts': '@Controller(\'boarding\') @RequiresModule(\'boarding\')',
  'apps/api/src/modules/cbt/cbt.controller.ts': '@Controller(\'cbt\') @RequiresModule(\'cbt_exams\')',
  'apps/api/src/modules/lms/lms.controller.ts': '@Controller(\'lms\') @RequiresModule(\'lms\')',
  'apps/api/src/modules/ai-insights/ai-insights.controller.ts': '@Controller(\'ai-insights\') @RequiresModule(\'ai_insights\')',
  'apps/api/src/modules/visitors/visitors.controller.ts': '@Controller(\'visitors\') @RequiresModule(\'visitor_management\')',
  'apps/api/src/modules/assets/assets.controller.ts': '@Controller(\'assets\') @RequiresModule(\'asset_tracking\')',
  'apps/api/src/modules/iot/iot.controller.ts': '@Controller(\'iot\') @RequiresModule(\'iot\')',
  'apps/api/src/modules/module-access/module-access.constants.ts': 'MODULE_REGISTRY_SEED students admissions academics finance exams discipline timetable lab_management teacher_biometric_attendance parent_portal inventory library transport communication_sms reports staff admin_command_centers principal_dashboard clinic_health procurement hostel boarding cbt_exams lms ai_insights visitor_management asset_tracking iot permission_scopes',
  'apps/api/src/app-route-permissions.test.ts': 'all HTTP route handlers declare explicit access metadata IS_PUBLIC_KEY PERMISSIONS_KEY POLICY_KEY ROLES_KEY',
  'apps/web/src/lib/module-access/module-access-map.ts': 'schoolSectionModuleMap students: "students" admissions: "admissions" finance: "finance" mpesa: "finance" academics: "academics" exams: "exams" discipline: "discipline" reports: "reports" communication: "communication_sms" timetable: "timetable" staff: "staff" inventory: "inventory" library: "library" clinic: "clinic_health" labs: "lab_management" "teacher-attendance": "teacher_biometric_attendance" leadership: "admin_command_centers" transport: "transport" procurement: "procurement" hostel: "hostel" boarding: "boarding" cbt: "cbt_exams" lms: "lms" "ai-insights": "ai_insights" visitors: "visitor_management" assets: "asset_tracking" iot: "iot" isSchoolSectionEnabled filterNavItemsByEnabledModules',
  'apps/web/src/components/school/school-pages.tsx': 'loadModuleAccess /api/school/modules/me filterNavItemsByEnabledModules isSchoolSectionEnabled principal_dashboard ModuleDisabledPanel',
  'apps/api/src/common/reports/report-export-queue.ts': 'ModuleAccessService assertReportExportModuleEnabled findFirstMissingModule enqueueReportExport module_report_access_denied',
  'apps/api/src/common/reports/report-export.worker.ts': 'ModuleAccessService assertReportExportModuleEnabled findFirstMissingModule execute module_report_worker_disabled',
  'apps/api/src/modules/clinic/clinic.processor.ts': 'ModuleAccessService listEnabledModulesForTenant enabledModules.includes(\'procurement\') return [] disabled module job skipped',
  'apps/api/src/modules/admin-command/principal-insights.service.ts': 'listCurrentTenantModules listEnabledModulesForTenant enabledModules.includes(provider.module_code) sections.flatMap buildRealtimeChannels(enabledModules) enabledModules.includes',
  'apps/api/src/modules/admin-command/principal-insights.providers.ts': 'PRINCIPAL_INSIGHT_PROVIDERS module_code widgets reports',
  'apps/api/src/modules/admin-command/admin-command.test.ts': 'module-aware principal executive dashboard enabled_modules',
  'apps/api/src/modules/module-access/module-access.test.ts': 'module registry seed contains required tenant allocation modules ModuleAccessGuard rejects disabled tenant modules gracefully production school controllers declare module access metadata trial_ends_at expires_at billing_plan_code module_packages',
  'apps/api/src/modules/module-access/module-access.repository.ts': 'expires_at IS NULL OR sma.expires_at > NOW() trial_ends_at IS NULL OR sma.trial_ends_at > NOW() OR sma.access_level <> \'trial\'',
  'apps/api/src/modules/module-access/module-access-schema.service.ts': 'trial_ends_at expires_at billing_plan_code module_packages module_package_items module_usage_events FORCE ROW LEVEL SECURITY',
  'apps/api/src/common/reports/report-export-queue.test.ts': 'rejects export requests for disabled tenant modules before enqueue',
  'apps/api/src/common/reports/report-export.worker.test.ts': 'rejects disabled tenant modules before artifact generation',
};

test('module access certification passes when every module surface has guard evidence', () => {
  const result = runModuleAccessCertification({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  assert.equal(
    result.ok,
    true,
    result.areas
      .flatMap((area) => area.checks.filter((check) => check.status === 'fail').map((check) => `${area.id}:${check.id}`))
      .join(', '),
  );
  assert.equal(result.areas.every((area) => area.status === 'pass'), true);
  assert.match(result.areas[0].evidence_id, /^MODULE-ACCESS-001-/);
});

test('module access certification fails when a backend module route lacks RequiresModule evidence', () => {
  const result = runModuleAccessCertification({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/exams.controller.ts': '@Controller(\'exams\')',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'backend-route-exams' && check.status === 'fail'),
    ),
    true,
  );
});

test('module access certification fails when frontend route guard mapping omits a module section', () => {
  const result = runModuleAccessCertification({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/web/src/lib/module-access/module-access-map.ts': 'schoolSectionModuleMap students: "students" isSchoolSectionEnabled filterNavItemsByEnabledModules',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'frontend-route-exams' && check.status === 'fail'),
    ),
    true,
  );
});

test('module access certification fails when module registry evidence is missing', () => {
  const result = runModuleAccessCertification({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/module-access/module-access.constants.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'module-registry-seed' && check.status === 'fail'),
    ),
    true,
  );
});

test('module access certification markdown is audit-safe', () => {
  const result = runModuleAccessCertification({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  const markdown = renderModuleAccessCertificationMarkdown(result);

  assert.match(markdown, /Module Access Certification/);
  assert.match(markdown, /MODULE-ACCESS-001-/);
  assert.equal(/password=/i.test(markdown), false);
});
