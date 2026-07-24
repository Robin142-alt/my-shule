import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation20CertificationStatus = 'pass' | 'fail';

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

export interface Implementation20CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface Implementation20CertificationResult {
  generated_at: string;
  ok: boolean;
  areas: Array<{
    id: string;
    evidence_id: string;
    title: string;
    status: Implementation20CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation20CertificationStatus;
    }>;
  }>;
}

const CERTIFICATION_AREAS: CertificationArea[] = [
  area('module-allocation', 'Superadmin module allocation and runtime enforcement', [
    check('registry-seed', 'Global module registry includes requested module stack', 'apps/api/src/modules/module-access/module-access.constants.ts', /teacher_biometric_attendance[\s\S]+admin_command_centers/),
    check('assignment-schema', 'School module access schema is tenant scoped with RLS', 'apps/api/src/modules/module-access/module-access-schema.service.ts', /school_module_access[\s\S]+ENABLE ROW LEVEL SECURITY/),
    check('runtime-guard', 'Runtime guard blocks disabled modules gracefully', 'apps/api/src/modules/module-access/module-access.guard.ts', /Module not enabled for your school/),
    check('no-delete-disable', 'Module removal is represented as soft disable', 'apps/api/src/modules/module-access/module-access.repository.ts', /disabled_at[\s\S]+enabled\s*=\s*false/),
    check('platform-ui', 'Superadmin UI exposes module allocation editing', 'apps/web/src/components/platform/superadmin-pages.tsx', /ModuleAllocationEditor[\s\S]+Save module access/),
    check('library-module-registered', 'Library is registered as an allocatable tenant module', 'apps/api/src/modules/module-access/module-access.constants.ts', /code:\s*'library'[\s\S]+name:\s*'Library'/),
  ]),
  area('academic-structure', 'Flexible academic structure and class assignment', [
    check('academic-levels', 'Academic levels, class streams, and assignments are in schema', 'apps/api/src/modules/academics/academics-schema.service.ts', /academic_levels[\s\S]+class_streams[\s\S]+student_class_assignments/),
    check('cbe-support', 'CBE, CBC, 8-4-4, International, and custom systems are supported', 'apps/api/src/modules/academics/dto/academic.dto.ts', /(?=.*CBE)(?=.*CBC)(?=.*8-4-4)(?=.*International)(?=.*Custom)/s),
    check('class-builder-api', 'Class structure API exists', 'apps/api/src/modules/academics/academics.controller.ts', /class-structure/),
    check('student-class-assignment', 'Student assignment service enforces structured class linkage', 'apps/api/src/modules/academics/academics.service.ts', /assignStudentToClass[\s\S]+academic_year/),
  ]),
  area('laboratories', 'Laboratory operations, safety, and traceability', [
    check('lab-schema', 'Lab schema includes departments, labs, sessions, attendance, equipment, chemicals, usage, and disposal', 'apps/api/src/modules/labs/labs-schema.service.ts', /lab_departments[\s\S]+lab_sessions[\s\S]+lab_attendance[\s\S]+lab_equipment[\s\S]+chemical_items[\s\S]+chemical_disposal_requests/),
    check('expired-chemical-block', 'Expired and quarantined chemicals are blocked from use', 'apps/api/src/modules/labs/labs.service.ts', /Expired chemicals cannot be issued[\s\S]+quarantined/),
    check('mandatory-attendance', 'Mandatory lab completion auto-records missing attendance and emits effects', 'apps/api/src/modules/labs/labs.service.ts', /markMissingMandatoryAttendanceAbsent[\s\S]+completeLabSession[\s\S]+recordMandatoryLabAttendanceEffects/),
    check('lab-discipline-effects', 'Mandatory lab absences feed discipline and academic reporting sources', 'apps/api/src/modules/labs/repositories/labs.repository.ts', /source_type[\s\S]+'lab_attendance'[\s\S]+labs\.participation_metric_recorded/),
    check('lab-maintenance-jobs', 'Lab maintenance jobs cover chemical expiry, equipment reconciliation, and mandatory attendance discipline checks', 'apps/api/src/modules/labs/labs.processor.ts', /runChemicalExpiryCheck[\s\S]+runEquipmentReconciliationCheck[\s\S]+runMandatoryAttendanceDisciplineCheck/),
    check('lab-web-proxy', 'Web app proxies live lab operations to the API', 'apps/web/src/app/api/labs/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/labs"/),
    check('lab-ui', 'Lab dashboard exposes attendance, equipment, and chemical flows', 'apps/web/src/components/school/school-pages.tsx', /LabsOperationsPage[\s\S]+Mandatory lab attendance[\s\S]+Chemical batch safety/),
  ]),
  area('leadership-biometric', 'Leadership command centers and biometric teacher attendance', [
    check('admin-command-schema', 'Leadership schema includes incidents, announcements, minutes, and duty rosters', 'apps/api/src/modules/admin-command/admin-command-schema.service.ts', /admin_incidents[\s\S]+announcements[\s\S]+meeting_minutes[\s\S]+duty_rosters/),
    check('role-dashboards', 'Principal, deputy, and secretary dashboards are exposed', 'apps/api/src/modules/admin-command/admin-command.controller.ts', /principal\/dashboard[\s\S]+deputy\/dashboard[\s\S]+secretary\/dashboard/),
    check('biometric-schema', 'Biometric schema includes devices, identities, events, logs, and rules', 'apps/api/src/modules/biometric-attendance/biometric-attendance-schema.service.ts', /biometric_devices[\s\S]+biometric_events[\s\S]+teacher_attendance_logs[\s\S]+attendance_rules/),
    check('offline-dedupe', 'Biometric sync handles offline events and deduplicates event hashes', 'apps/api/src/modules/biometric-attendance/biometric-attendance.service.ts', /offline_mode_flag[\s\S]+event_hash[\s\S]+duplicate|event_hash[\s\S]+duplicate/),
    check('biometric-rule-jobs', 'Biometric attendance processor applies daily absence and half-day rules', 'apps/api/src/modules/biometric-attendance/biometric-attendance.processor.ts', /runDailyAttendanceRuleCheck[\s\S]+applyDailyAttendanceRules/),
    check('biometric-live-reports', 'Biometric API exposes live feed and monthly reports', 'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts', /live-feed[\s\S]+reports\/monthly/),
    check('override-reason', 'Manual teacher attendance override requires an audit reason', 'apps/api/src/modules/biometric-attendance/biometric-attendance.service.ts', /override[\s\S]+reason[\s\S]+12/),
    check('admin-command-web-proxy', 'Web app proxies leadership command-center requests to the API', 'apps/web/src/app/api/admin-command/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/admin-command"/),
    check('biometric-web-proxy', 'Web app proxies teacher biometric attendance requests to the API', 'apps/web/src/app/api/biometric-attendance/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/biometric-attendance"/),
    check('leadership-ui', 'School UI includes leadership and teacher attendance dashboards', 'apps/web/src/components/school/school-pages.tsx', /LeadershipCommandCenterPage[\s\S]+TeacherBiometricAttendancePage/),
  ]),
  area('frontend-route-guards', 'Frontend module-aware navigation and disabled states', [
    check('module-map', 'Frontend maps school sections to backend module codes', 'apps/web/src/lib/module-access/module-access-map.ts', /(?=.*getModuleCodeForSchoolSection)(?=.*teacher_biometric_attendance)(?=.*admin_command_centers)/s),
    check('school-nav-filter', 'School workspace filters navigation using enabled modules', 'apps/web/src/components/school/school-pages.tsx', /filterNavItemsByEnabledModules[\s\S]+ModuleDisabledPanel/),
    check('library-route-guard', 'Standalone library workspace verifies the tenant library module before rendering', 'apps/web/src/lib/routing/public-experience-session.ts', /readLibrarianLibrarySession[\s\S]+checkSchoolModuleAccess[\s\S]+library/),
    check('library-api-guard', 'Library sync API refuses circulation when the tenant lacks the library module', 'apps/web/src/app/api/library/borrowings/route.ts', /checkSchoolModuleAccess[\s\S]+library[\s\S]+Module not enabled for your school/),
    check('academics-web-proxy', 'Web app proxies academic structure requests to the API', 'apps/web/src/app/api/academics/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/academics"/),
    check('reports-web-proxy', 'Web app proxies reports requests to the API', 'apps/web/src/app/api/reports/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/reports"/),
    check('staff-web-proxy', 'Web app proxies staff requests to the HR API', 'apps/web/src/app/api/staff/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/hr"/),
    check('timetable-web-proxy', 'Web app proxies timetable requests to the API', 'apps/web/src/app/api/timetable/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/timetable"/),
    check('readiness-active', 'Production readiness keeps new module-controlled surfaces active', 'apps/web/src/lib/features/module-readiness.ts', /labs[\s\S]+leadership[\s\S]+teacher-attendance/),
    check('attendance-retired', 'Legacy generic attendance remains retired', 'apps/web/src/lib/features/module-readiness.ts', /inactiveModules[\s\S]+attendance/),
  ]),
];

export function runImplementation20Certification(
  options: Implementation20CertificationOptions = {},
): Implementation20CertificationResult {
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
      evidence_id: `IMPLEMENTATION20-${String(index + 1).padStart(3, '0')}-${definition.id}`,
      title: definition.title,
      status: checks.every((item) => item.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: areas.every((result) => result.status === 'pass'),
    areas,
  };
}

export function renderImplementation20CertificationMarkdown(
  result: Implementation20CertificationResult,
): string {
  const lines = [
    '# Implementation 20 Certification',
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
    '- This certification checks source-level release evidence for module allocation, academics, labs, leadership, biometric attendance, and frontend route guards.',
    '- Disabled modules are visibility-controlled only; module data remains preserved for later reactivation.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation20CertificationArtifact(
  result: Implementation20CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation20CertificationMarkdown(result));
}

export function runAndWriteImplementation20Certification(
  workspaceRoot = process.cwd(),
): Implementation20CertificationResult {
  const result = runImplementation20Certification({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation20-certification.md');
  writeImplementation20CertificationArtifact(result, outputPath);
  return result;
}

function area(id: string, title: string, checks: EvidenceCheck[]): CertificationArea {
  return { id, title, checks };
}

function check(id: string, label: string, file: string, pattern: RegExp): EvidenceCheck {
  return { id, label, file, pattern };
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

function main(): void {
  const result = runAndWriteImplementation20Certification();

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
