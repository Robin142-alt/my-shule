import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type CertificationStatus = 'pass' | 'fail';

interface EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

interface CertificationArea {
  id: string;
  title: string;
  checks: EvidenceCheck[];
}

export interface ModuleAccessCertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface ModuleAccessCertificationResult {
  generated_at: string;
  ok: boolean;
  areas: Array<{
    id: string;
    evidence_id: string;
    title: string;
    status: CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: CertificationStatus;
    }>;
  }>;
}

const BACKEND_ROUTE_MODULE_GUARDS: Array<{
  id: string;
  label: string;
  file: string;
  moduleCode: string;
}> = [
  backendRoute('students', 'Student routes require the students module', 'apps/api/src/modules/students/students.controller.ts', 'students'),
  backendRoute('admissions', 'Admissions routes require the admissions module', 'apps/api/src/modules/admissions/admissions.controller.ts', 'admissions'),
  backendRoute('academics', 'Academic structure routes require the academics module', 'apps/api/src/modules/academics/academics.controller.ts', 'academics'),
  backendRoute('billing', 'Billing routes require the finance module', 'apps/api/src/modules/billing/billing.controller.ts', 'finance'),
  backendRoute('tenant-finance', 'Tenant finance M-Pesa routes require the finance module', 'apps/api/src/modules/tenant-finance/tenant-finance.controller.ts', 'finance'),
  backendRoute('payments-mpesa', 'M-Pesa operator routes require the finance module', 'apps/api/src/modules/payments/controllers/payments.controller.ts', 'finance'),
  backendRoute('exams', 'Exams routes require the exams module', 'apps/api/src/modules/exams/exams.controller.ts', 'exams'),
  backendRoute('discipline', 'Discipline routes require the discipline module', 'apps/api/src/modules/discipline/discipline.controller.ts', 'discipline'),
  backendRoute('counselling', 'Counselling routes require the discipline module', 'apps/api/src/modules/discipline/counselling.controller.ts', 'discipline'),
  backendRoute('timetable', 'Timetable routes require the timetable module', 'apps/api/src/modules/timetable/timetable.controller.ts', 'timetable'),
  backendRoute('labs', 'Laboratory routes require the lab management module', 'apps/api/src/modules/labs/labs.controller.ts', 'lab_management'),
  backendRoute('biometric-attendance', 'Teacher attendance routes require the biometric attendance module', 'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts', 'teacher_biometric_attendance'),
  backendRoute('inventory', 'Inventory routes require the inventory module', 'apps/api/src/modules/inventory/inventory.controller.ts', 'inventory'),
  backendRoute('library', 'Library routes require the library module', 'apps/api/src/modules/library/library.controller.ts', 'library'),
  backendRoute('communication-sms', 'School SMS routes require the communication module', 'apps/api/src/modules/integrations/school-sms.controller.ts', 'communication_sms'),
  backendRoute('hr', 'HR routes require the staff module', 'apps/api/src/modules/hr/hr.controller.ts', 'staff'),
  backendRoute('admin-command', 'Leadership command-center routes require the admin command module', 'apps/api/src/modules/admin-command/admin-command.controller.ts', 'admin_command_centers'),
  backendRoute('principal-dashboard', 'Principal dashboard routes require the principal dashboard module', 'apps/api/src/modules/admin-command/admin-command.controller.ts', 'principal_dashboard'),
  backendRoute('clinic', 'Clinic routes require the clinic health module', 'apps/api/src/modules/clinic/clinic.controller.ts', 'clinic_health'),
  backendRoute('reports', 'Report export job routes require the reports module', 'apps/api/src/common/reports/report-export-jobs.controller.ts', 'reports'),
  backendRoute('transport', 'Transport routes require the transport module', 'apps/api/src/modules/transport/transport.controller.ts', 'transport'),
  backendRoute('procurement', 'Procurement routes require the procurement module', 'apps/api/src/modules/procurement/procurement.controller.ts', 'procurement'),
  backendRoute('hostel', 'Hostel routes require the hostel module', 'apps/api/src/modules/hostel/hostel.controller.ts', 'hostel'),
  backendRoute('boarding', 'Boarding routes require the boarding module', 'apps/api/src/modules/boarding/boarding.controller.ts', 'boarding'),
  backendRoute('cbt', 'CBT routes require the CBT exams module', 'apps/api/src/modules/cbt/cbt.controller.ts', 'cbt_exams'),
  backendRoute('lms', 'LMS routes require the LMS module', 'apps/api/src/modules/lms/lms.controller.ts', 'lms'),
  backendRoute('ai-insights', 'AI Insights routes require the AI insights module', 'apps/api/src/modules/ai-insights/ai-insights.controller.ts', 'ai_insights'),
  backendRoute('visitors', 'Visitor routes require the visitor management module', 'apps/api/src/modules/visitors/visitors.controller.ts', 'visitor_management'),
  backendRoute('assets', 'Asset routes require the asset tracking module', 'apps/api/src/modules/assets/assets.controller.ts', 'asset_tracking'),
  backendRoute('iot', 'IoT routes require the IoT and Smart Campus module', 'apps/api/src/modules/iot/iot.controller.ts', 'iot'),
];

const FRONTEND_ROUTE_MODULE_GUARDS = [
  frontendRoute('students', 'students'),
  frontendRoute('admissions', 'admissions'),
  frontendRoute('finance', 'finance'),
  frontendRoute('mpesa', 'finance'),
  frontendRoute('academics', 'academics'),
  frontendRoute('exams', 'exams'),
  frontendRoute('discipline', 'discipline'),
  frontendRoute('reports', 'reports'),
  frontendRoute('communication', 'communication_sms'),
  frontendRoute('timetable', 'timetable'),
  frontendRoute('staff', 'staff'),
  frontendRoute('inventory', 'inventory'),
  frontendRoute('library', 'library'),
  frontendRoute('clinic', 'clinic_health'),
  frontendRoute('labs', 'lab_management'),
  frontendRoute('teacher-attendance', 'teacher_biometric_attendance'),
  frontendRoute('leadership', 'admin_command_centers'),
  frontendRoute('transport', 'transport'),
  frontendRoute('procurement', 'procurement'),
  frontendRoute('hostel', 'hostel'),
  frontendRoute('boarding', 'boarding'),
  frontendRoute('cbt', 'cbt_exams'),
  frontendRoute('lms', 'lms'),
  frontendRoute('ai-insights', 'ai_insights'),
  frontendRoute('visitors', 'visitor_management'),
  frontendRoute('assets', 'asset_tracking'),
  frontendRoute('iot', 'iot'),
];

const CERTIFICATION_AREAS: CertificationArea[] = [
  area('registry-permission-alignment', 'Module registry and route permission metadata are aligned', [
    check(
      'module-registry-seed',
      'Module registry seed includes every production school module and its permission scopes',
      'apps/api/src/modules/module-access/module-access.constants.ts',
      /(?=.*MODULE_REGISTRY_SEED)(?=.*students)(?=.*admissions)(?=.*academics)(?=.*finance)(?=.*exams)(?=.*discipline)(?=.*timetable)(?=.*lab_management)(?=.*teacher_biometric_attendance)(?=.*parent_portal)(?=.*inventory)(?=.*library)(?=.*transport)(?=.*communication_sms)(?=.*reports)(?=.*staff)(?=.*admin_command_centers)(?=.*principal_dashboard)(?=.*clinic_health)(?=.*procurement)(?=.*hostel)(?=.*boarding)(?=.*cbt_exams)(?=.*lms)(?=.*ai_insights)(?=.*visitor_management)(?=.*asset_tracking)(?=.*iot)(?=.*permission_scopes)/s,
    ),
    check(
      'route-permission-metadata-test',
      'Route permission test fails HTTP handlers without explicit public, permission, policy, or role metadata',
      'apps/api/src/app-route-permissions.test.ts',
      /(?=.*all HTTP route handlers declare explicit access metadata)(?=.*IS_PUBLIC_KEY)(?=.*PERMISSIONS_KEY)(?=.*POLICY_KEY)(?=.*ROLES_KEY)/s,
    ),
    check(
      'module-access-registry-tests',
      'Module access tests cover required registry seeds and production controller module metadata',
      'apps/api/src/modules/module-access/module-access.test.ts',
      /(?=.*module registry seed contains required tenant allocation modules)(?=.*production school controllers declare module access metadata)/s,
    ),
  ]),
  area(
    'backend-route-module-guards',
    'Backend routes require module access metadata',
    BACKEND_ROUTE_MODULE_GUARDS.map((route) =>
      check(
        `backend-route-${route.id}`,
        route.label,
        route.file,
        requiresModulePattern(route.moduleCode),
      ),
    ),
  ),
  area(
    'frontend-route-module-guards',
    'Frontend school routes map visible sections to enabled modules',
    [
      ...FRONTEND_ROUTE_MODULE_GUARDS.map((route) =>
        check(
          `frontend-route-${route.section}`,
          `Frontend section "${route.section}" maps to module "${route.moduleCode}"`,
          'apps/web/src/lib/module-access/module-access-map.ts',
          objectPropertyPattern(route.section, route.moduleCode),
        ),
      ),
      check(
        'frontend-route-guard-applied',
        'School pages fetch tenant module access, filter navigation, and render a disabled-module state',
        'apps/web/src/components/school/school-pages.tsx',
        /(?=.*loadModuleAccess)(?=.*\/api\/school\/modules\/me)(?=.*filterNavItemsByEnabledModules)(?=.*isSchoolSectionEnabled)(?=.*ModuleDisabledPanel)/s,
      ),
    ],
  ),
  area('background-job-module-guards', 'Background jobs skip disabled modules', [
    check(
      'report-export-worker-module-guard',
      'Report export worker refuses disabled module jobs before artifact generation',
      'apps/api/src/common/reports/report-export.worker.ts',
      /(?=.*ModuleAccessService)(?=.*assertReportExportModuleEnabled)(?=.*findFirstMissingModule|.*moduleAccessService)/s,
    ),
    check(
      'clinic-procurement-job-module-guard',
      'Clinic low-stock job creates procurement work only when procurement is enabled',
      'apps/api/src/modules/clinic/clinic.processor.ts',
      /(?=.*ModuleAccessService)(?=.*listEnabledModulesForTenant)(?=.*enabledModules\.includes\('procurement'\))(?=.*return \[\])/s,
    ),
  ]),
  area('report-export-module-guards', 'Report exports cannot be requested for disabled modules', [
    check(
      'report-export-enqueue-module-guard',
      'Report export queue validates the subject module before enqueueing work',
      'apps/api/src/common/reports/report-export-queue.ts',
      /(?=.*ModuleAccessService)(?=.*assertReportExportModuleEnabled)(?=.*findFirstMissingModule)(?=.*module_report_access_denied|.*Module not enabled for your school report exports)/s,
    ),
    check(
      'report-export-disabled-module-test',
      'Report export tests prove disabled modules are rejected before enqueue and worker artifact generation',
      'apps/api/src/common/reports/report-export-queue.test.ts',
      /rejects export requests for disabled tenant modules before enqueue/,
    ),
    check(
      'report-export-worker-disabled-module-test',
      'Report export worker tests prove disabled modules are rejected before artifact generation',
      'apps/api/src/common/reports/report-export.worker.test.ts',
      /rejects disabled tenant modules before artifact generation/,
    ),
  ]),
  area('dashboard-widget-module-guards', 'Dashboard widgets and report links honor enabled modules', [
    check(
      'principal-dashboard-module-filter',
      'Principal dashboard builds sections, alerts, report exports, and realtime channels only from enabled modules',
      'apps/api/src/modules/admin-command/principal-insights.service.ts',
      /(?=.*listCurrentTenantModules)(?=.*listEnabledModulesForTenant)(?=.*enabledModules\.includes\(provider\.module_code\))(?=.*sections\.flatMap)(?=.*buildRealtimeChannels\(enabledModules\))/s,
    ),
    check(
      'principal-widget-provider-module-codes',
      'Principal insight providers declare module codes for every widget group',
      'apps/api/src/modules/admin-command/principal-insights.providers.ts',
      /(?=.*PRINCIPAL_INSIGHT_PROVIDERS)(?=.*module_code)(?=.*widgets)(?=.*reports)/s,
    ),
    check(
      'principal-dashboard-module-filter-tests',
      'Admin-command tests cover module-aware principal dashboard behavior',
      'apps/api/src/modules/admin-command/admin-command.test.ts',
      /(?=.*module-aware principal executive dashboard)(?=.*enabled_modules)/s,
    ),
  ]),
  area('package-trial-expiry-behavior', 'Trial, expiry, and package metadata affect access decisions', [
    check(
      'module-access-expiry-query',
      'Enabled module query excludes expired modules and ended trials',
      'apps/api/src/modules/module-access/module-access.repository.ts',
      /(?=.*expires_at IS NULL OR sma\.expires_at > NOW\(\))(?=.*trial_ends_at IS NULL OR sma\.trial_ends_at > NOW\(\) OR sma\.access_level <> 'trial')/s,
    ),
    check(
      'module-access-package-schema',
      'Module access schema stores packages, trials, expiry dates, billing plans, usage, and forced RLS',
      'apps/api/src/modules/module-access/module-access-schema.service.ts',
      /(?=.*module_packages)(?=.*module_package_items)(?=.*module_usage_events)(?=.*trial_ends_at)(?=.*expires_at)(?=.*billing_plan_code)(?=.*FORCE ROW LEVEL SECURITY)/s,
    ),
    check(
      'module-access-trial-package-tests',
      'Module access tests cover guard rejection plus package, trial, expiry, and billing metadata',
      'apps/api/src/modules/module-access/module-access.test.ts',
      /(?=.*ModuleAccessGuard rejects disabled tenant modules gracefully)(?=.*trial_ends_at)(?=.*expires_at)(?=.*billing_plan_code)(?=.*module_packages)/s,
    ),
  ]),
];

export function runModuleAccessCertification(
  options: ModuleAccessCertificationOptions = {},
): ModuleAccessCertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const areas = CERTIFICATION_AREAS.map((definition, index) => {
    const checks = definition.checks.map((item) => {
      const source = readSource(workspaceRoot, item.file, options.sourceOverrides);
      const passed = item.pattern.test(source);

      return {
        id: item.id,
        label: item.label,
        file: item.file,
        status: passed ? 'pass' as const : 'fail' as const,
      };
    });

    return {
      id: definition.id,
      evidence_id: `MODULE-ACCESS-${String(index + 1).padStart(3, '0')}-${definition.id}`,
      title: definition.title,
      status: checks.every((item) => item.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: areas.every((areaResult) => areaResult.status === 'pass'),
    areas,
  };
}

export function renderModuleAccessCertificationMarkdown(
  result: ModuleAccessCertificationResult,
): string {
  const lines = [
    '# Module Access Certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    '| Evidence ID | Area | Status | Checks |',
    '| --- | --- | --- | --- |',
  ];

  for (const areaResult of result.areas) {
    lines.push(
      `| ${areaResult.evidence_id} | ${escapeTable(areaResult.title)} | ${areaResult.status} | ${escapeTable(areaResult.checks.map((item) => `${item.status}: ${item.label}`).join('; '))} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This certification compares enabled module controls against API routes, frontend route mappings, background jobs, report exports, and principal dashboard widgets.',
    '- It is source-level evidence for CI and must be paired with the runtime module access guard and request tests.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeModuleAccessCertificationArtifact(
  result: ModuleAccessCertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderModuleAccessCertificationMarkdown(result), 'utf8');
}

export function runAndWriteModuleAccessCertification(
  workspaceRoot = process.cwd(),
): ModuleAccessCertificationResult {
  const result = runModuleAccessCertification({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'module-access-certification.md');
  writeModuleAccessCertificationArtifact(result, outputPath);
  return result;
}

function backendRoute(
  id: string,
  label: string,
  file: string,
  moduleCode: string,
) {
  return { id, label, file, moduleCode };
}

function frontendRoute(section: string, moduleCode: string) {
  return { section, moduleCode };
}

function area(id: string, title: string, checks: EvidenceCheck[]): CertificationArea {
  return { id, title, checks };
}

function check(id: string, label: string, file: string, pattern: RegExp): EvidenceCheck {
  return { id, label, file, pattern };
}

function requiresModulePattern(moduleCode: string): RegExp {
  return new RegExp(`@RequiresModule\\([^)]*['"]${escapeRegex(moduleCode)}['"]`, 's');
}

function objectPropertyPattern(key: string, value: string): RegExp {
  const propertyName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
    ? `(?:${escapeRegex(key)}|['"]${escapeRegex(key)}['"])`
    : `['"]${escapeRegex(key)}['"]`;

  return new RegExp(`${propertyName}\\s*:\\s*['"]${escapeRegex(value)}['"]`, 's');
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const filePath = join(workspaceRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main(): void {
  const result = runAndWriteModuleAccessCertification();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
