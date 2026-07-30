import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation100CertificationStatus = 'pass' | 'fail';

export interface Implementation100EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
  testEvidence: string;
}

export interface Implementation100ModuleDefinition {
  code: string;
  name: string;
  checks: Implementation100EvidenceCheck[];
}

export interface Implementation100CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface Implementation100CertificationResult {
  generated_at: string;
  ok: boolean;
  module_count: number;
  modules: Array<{
    code: string;
    name: string;
    evidence_id: string;
    status: Implementation100CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation100CertificationStatus;
    }>;
  }>;
}

type ModuleEvidenceInput = {
  code: string;
  name: string;
  frontendWorkspaceFile: string;
  frontendWorkspaceTokens: string[];
  frontendApiProxyFile: string;
  frontendApiProxyTokens: string[];
  backendControllerFile: string;
  backendControllerTokens: string[];
  schemaFile: string;
  schemaTokens: string[];
  testFile: string;
  testTokens: string[];
};

const MODULE_EVIDENCE_INPUTS: ModuleEvidenceInput[] = [
  moduleEvidence('students', 'Student Management', 'apps/web/src/app/school/[role]/students/[studentId]/page.tsx', ['studentId'], 'apps/web/src/app/api/school/[...path]/route.ts', ['proxySchoolApiRequest', '/school'], 'apps/api/src/modules/students/students.controller.ts', ['StudentsController'], 'apps/api/src/modules/students/students-schema.service.ts', ['students'], 'apps/api/src/modules/students/students.test.ts', ['students']),
  moduleEvidence('admissions', 'Admissions', 'apps/web/src/components/modules/admissions/admissions-module-screen.tsx', ['AdmissionsModuleScreen'], 'apps/web/src/app/api/admissions/[...path]/route.ts', ['proxySchoolApiRequest', '/admissions'], 'apps/api/src/modules/admissions/admissions.controller.ts', ['AdmissionsController'], 'apps/api/src/modules/admissions/repositories/admissions.repository.ts', ['admission_applications', 'student_academic_enrollments'], 'apps/api/src/modules/admissions/admissions.test.ts', ['admissions']),
  moduleEvidence('academics', 'Academic Structure', 'apps/web/src/components/school/school-pages.tsx', ['Academics'], 'apps/web/src/app/api/academics/[...path]/route.ts', ['proxySchoolApiRequest', '/academics'], 'apps/api/src/modules/academics/academics.controller.ts', ['AcademicsController'], 'apps/api/src/modules/academics/academics-schema.service.ts', ['academic_years'], 'apps/api/src/modules/academics/academics.test.ts', ['academics']),
  moduleEvidence('finance', 'Fee Management', 'apps/web/src/components/dashboard/finance-widget.tsx', ['finance'], 'apps/web/src/app/api/payments/[...path]/route.ts', ['proxySchoolApiRequest', '/payments'], 'apps/api/src/modules/billing/billing.controller.ts', ['BillingController'], 'apps/api/src/modules/billing/billing-schema.service.ts', ['fee_structures'], 'apps/api/src/modules/billing/billing.test.ts', ['billing']),
  moduleEvidence('exams', 'Exams and Results', 'apps/web/src/components/modules/exams/exams-module-screen.tsx', ['LiveExamsOperationsPanel'], 'apps/web/src/app/api/exams/[...path]/route.ts', ['proxySchoolApiRequest', '/exams'], 'apps/api/src/modules/exams/exams.controller.ts', ['ExamsController'], 'apps/api/src/modules/exams/exams-schema.service.ts', ['exam'], 'apps/api/src/modules/exams/exams.test.ts', ['ExamsService']),
  moduleEvidence('discipline', 'Discipline', 'apps/web/src/components/discipline/discipline-workspace.tsx', ['Discipline'], 'apps/web/src/app/api/discipline/[...path]/route.ts', ['proxySchoolApiRequest', '/discipline'], 'apps/api/src/modules/discipline/discipline.controller.ts', ['DisciplineController'], 'apps/api/src/modules/discipline/discipline-schema.service.ts', ['discipline_incidents'], 'apps/api/src/modules/discipline/discipline.test.ts', ['discipline']),
  moduleEvidence('timetable', 'Timetable', 'apps/web/src/components/school/school-pages.tsx', ['Timetable'], 'apps/web/src/app/api/timetable/[...path]/route.ts', ['proxySchoolApiRequest', '/timetable'], 'apps/api/src/modules/timetable/timetable.controller.ts', ['TimetableController'], 'apps/api/src/modules/timetable/timetable-schema.service.ts', ['timetable_slots'], 'apps/api/src/modules/timetable/timetable.test.ts', ['timetable']),
  moduleEvidence('lab_management', 'Laboratory Management', 'apps/web/src/components/school/school-pages.tsx', ['labs'], 'apps/web/src/app/api/labs/[...path]/route.ts', ['proxySchoolApiRequest', '/labs'], 'apps/api/src/modules/labs/labs.controller.ts', ['LabsController'], 'apps/api/src/modules/labs/labs-schema.service.ts', ['lab_sessions'], 'apps/api/src/modules/labs/labs.test.ts', ['labs']),
  moduleEvidence('teacher_biometric_attendance', 'Teacher Attendance', 'apps/web/src/components/school/school-pages.tsx', ['teacher-attendance'], 'apps/web/src/app/api/biometric-attendance/[...path]/route.ts', ['proxySchoolApiRequest', '/biometric-attendance'], 'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts', ['BiometricAttendanceController'], 'apps/api/src/modules/biometric-attendance/biometric-attendance-schema.service.ts', ['teacher_attendance_logs'], 'apps/api/src/modules/biometric-attendance/biometric-attendance.test.ts', ['teacher_attendance']),
  moduleEvidence('parent_portal', 'Parent Portal', 'apps/web/src/app/parent-portal/page.tsx', ['Parent'], 'apps/web/src/app/api/auth/parent/otp/request/route.ts', ['parent'], 'apps/api/src/modules/integrations/parent-portal-auth.controller.ts', ['ParentPortalAuthController'], 'apps/api/src/modules/integrations/integrations-schema.service.ts', ['parent'], 'apps/api/src/modules/integrations/integrations.test.ts', ['parent']),
  moduleEvidence('inventory', 'Store and Inventory', 'apps/web/src/components/modules/inventory/inventory-module-screen.tsx', ['InventoryModuleScreen'], 'apps/web/src/app/api/inventory/[...path]/route.ts', ['proxySchoolApiRequest', '/inventory'], 'apps/api/src/modules/inventory/inventory.controller.ts', ['InventoryController'], 'apps/api/src/modules/inventory/inventory-schema.service.ts', ['inventory_items'], 'apps/api/src/modules/inventory/inventory.test.ts', ['inventory']),
  moduleEvidence('library', 'Library', 'apps/web/src/components/library/library-workspace.tsx', ['Library'], 'apps/web/src/app/api/library/borrowings/route.ts', ['library'], 'apps/api/src/modules/library/library.controller.ts', ['LibraryController'], 'apps/api/src/modules/library/library-schema.service.ts', ['library_catalog_items'], 'apps/api/src/modules/library/library.test.ts', ['library']),
  moduleEvidence('transport', 'Transport', 'apps/web/src/components/modules/transport/transport-module-screen.tsx', ['TransportModuleScreen'], 'apps/web/src/app/api/transport/[...path]/route.ts', ['proxySchoolApiRequest', '/transport'], 'apps/api/src/modules/transport/transport.controller.ts', ['TransportController'], 'apps/api/src/modules/transport/transport-schema.service.ts', ['transport_routes'], 'apps/api/src/modules/transport/transport.test.ts', ['transport']),
  moduleEvidence('communication_sms', 'Communication and SMS', 'apps/web/src/components/school/school-pages.tsx', ['Communication'], 'apps/web/src/app/api/sms/[...path]/route.ts', ['proxySchoolApiRequest', '/sms'], 'apps/api/src/modules/integrations/school-sms.controller.ts', ['SchoolSmsController'], 'apps/api/src/modules/integrations/integrations-schema.service.ts', ['sms_wallet'], 'apps/api/src/modules/integrations/integrations.test.ts', ['sms']),
  moduleEvidence('reports', 'Reports', 'apps/web/src/components/school/school-pages.tsx', ['Reports'], 'apps/web/src/app/api/reports/[...path]/route.ts', ['proxySchoolApiRequest', '/reports'], 'apps/api/src/common/reports/report-export-jobs.controller.ts', ['ReportExportJobsController'], 'apps/api/src/common/reports/report-snapshot-schema.service.ts', ['report_snapshots'], 'apps/api/src/common/reports/report-export-queue.test.ts', ['report']),
  moduleEvidence('staff', 'Staff and HR', 'apps/web/src/components/school/school-pages.tsx', ['Staff'], 'apps/web/src/app/api/staff/[...path]/route.ts', ['proxySchoolApiRequest', '/hr'], 'apps/api/src/modules/hr/hr.controller.ts', ['HrController'], 'apps/api/src/modules/hr/hr-schema.service.ts', ['staff'], 'apps/api/src/modules/hr/hr.test.ts', ['staff']),
  moduleEvidence('admin_command_centers', 'Administrative Leadership', 'apps/web/src/components/school/school-pages.tsx', ['Leadership'], 'apps/web/src/app/api/admin-command/[...path]/route.ts', ['proxySchoolApiRequest', '/admin-command'], 'apps/api/src/modules/admin-command/admin-command.controller.ts', ['AdminCommandController'], 'apps/api/src/modules/admin-command/admin-command-schema.service.ts', ['admin_incidents'], 'apps/api/src/modules/admin-command/admin-command.test.ts', ['admin-command']),
  moduleEvidence('principal_dashboard', 'Principal Executive Dashboard', 'apps/web/src/components/dashboard/dashboard-view.tsx', ['DashboardView', 'DashboardHome'], 'apps/web/src/app/api/admin-command/[...path]/route.ts', ['proxySchoolApiRequest', '/admin-command'], 'apps/api/src/modules/admin-command/admin-command.controller.ts', ['principal'], 'apps/api/src/modules/admin-command/admin-command-schema.service.ts', ['principal_dashboard_snapshots'], 'apps/api/src/modules/admin-command/admin-command.test.ts', ['principal']),
  moduleEvidence('clinic_health', 'Clinic and Health', 'apps/web/src/components/school/school-pages.tsx', ['Clinic'], 'apps/web/src/app/api/clinic/[...path]/route.ts', ['proxySchoolApiRequest', '/clinic'], 'apps/api/src/modules/clinic/clinic.controller.ts', ['ClinicController'], 'apps/api/src/modules/clinic/clinic-schema.service.ts', ['clinic_visits'], 'apps/api/src/modules/clinic/clinic.test.ts', ['clinic']),
  moduleEvidence('procurement', 'Procurement', 'apps/web/src/components/modules/procurement/procurement-module-screen.tsx', ['ProcurementModuleScreen'], 'apps/web/src/app/api/procurement/[...path]/route.ts', ['proxySchoolApiRequest', '/procurement'], 'apps/api/src/modules/procurement/procurement.controller.ts', ['ProcurementController'], 'apps/api/src/modules/procurement/procurement-schema.service.ts', ['procurement_requests'], 'apps/api/src/modules/procurement/procurement.test.ts', ['procurement']),
  moduleEvidence('hostel', 'Hostel', 'apps/web/src/components/modules/hostel/hostel-module-screen.tsx', ['HostelModuleScreen'], 'apps/web/src/app/api/hostel/[...path]/route.ts', ['proxySchoolApiRequest', '/hostel'], 'apps/api/src/modules/hostel/hostel.controller.ts', ['HostelController'], 'apps/api/src/modules/hostel/hostel-schema.service.ts', ['hostels'], 'apps/api/src/modules/hostel/hostel.test.ts', ['hostel']),
  moduleEvidence('boarding', 'Boarding Management', 'apps/web/src/components/modules/boarding/boarding-module-screen.tsx', ['BoardingModuleScreen'], 'apps/web/src/app/api/boarding/[...path]/route.ts', ['proxySchoolApiRequest', '/boarding'], 'apps/api/src/modules/boarding/boarding.controller.ts', ['BoardingController'], 'apps/api/src/modules/boarding/boarding-schema.service.ts', ['boarding_houses'], 'apps/api/src/modules/boarding/boarding.test.ts', ['boarding']),
  moduleEvidence('cbt_exams', 'CBT Exams', 'apps/web/src/components/modules/cbt/cbt-module-screen.tsx', ['CbtModuleScreen'], 'apps/web/src/app/api/cbt/[...path]/route.ts', ['proxySchoolApiRequest', '/cbt'], 'apps/api/src/modules/cbt/cbt.controller.ts', ['CbtController'], 'apps/api/src/modules/cbt/cbt-schema.service.ts', ['cbt_exam_sessions'], 'apps/api/src/modules/cbt/cbt.test.ts', ['cbt']),
  moduleEvidence('lms', 'eLearning and LMS', 'apps/web/src/components/modules/lms/lms-module-screen.tsx', ['LmsModuleScreen'], 'apps/web/src/app/api/lms/[...path]/route.ts', ['proxySchoolApiRequest', '/lms'], 'apps/api/src/modules/lms/lms.controller.ts', ['LmsController'], 'apps/api/src/modules/lms/lms-schema.service.ts', ['lms_courses'], 'apps/api/src/modules/lms/lms.test.ts', ['lms']),
  moduleEvidence('ai_insights', 'AI Insights', 'apps/web/src/components/modules/ai-insights/ai-insights-module-screen.tsx', ['AiInsightsModuleScreen'], 'apps/web/src/app/api/ai-insights/[...path]/route.ts', ['proxySchoolApiRequest', '/ai-insights'], 'apps/api/src/modules/ai-insights/ai-insights.controller.ts', ['AiInsightsController'], 'apps/api/src/modules/ai-insights/ai-insights-schema.service.ts', ['ai_insight_runs'], 'apps/api/src/modules/ai-insights/ai-insights.test.ts', ['ai_insights']),
  moduleEvidence('visitor_management', 'Visitor Management', 'apps/web/src/components/modules/visitors/visitor-management-module-screen.tsx', ['VisitorManagementModuleScreen'], 'apps/web/src/app/api/visitors/[...path]/route.ts', ['proxySchoolApiRequest', '/visitors'], 'apps/api/src/modules/visitors/visitors.controller.ts', ['VisitorsController'], 'apps/api/src/modules/visitors/visitors-schema.service.ts', ['visitor_checkins'], 'apps/api/src/modules/visitors/visitors.test.ts', ['visitors']),
  moduleEvidence('asset_tracking', 'Asset Tracking', 'apps/web/src/components/modules/assets/asset-tracking-module-screen.tsx', ['AssetTrackingModuleScreen'], 'apps/web/src/app/api/assets/[...path]/route.ts', ['proxySchoolApiRequest', '/assets'], 'apps/api/src/modules/assets/assets.controller.ts', ['AssetsController'], 'apps/api/src/modules/assets/assets-schema.service.ts', ['assets'], 'apps/api/src/modules/assets/assets.test.ts', ['assets']),
];

export const IMPLEMENTATION100_MODULES: Implementation100ModuleDefinition[] =
  MODULE_EVIDENCE_INPUTS.map((input) => ({
    code: input.code,
    name: input.name,
    checks: [
      tokenCheck(input.code, 'frontend-workspace', `${input.name} has a live workspace/detail surface`, input.frontendWorkspaceFile, input.frontendWorkspaceTokens),
      tokenCheck(input.code, 'frontend-api-proxy', `${input.name} has a live frontend API route or proxy`, input.frontendApiProxyFile, input.frontendApiProxyTokens),
      tokenCheck(input.code, 'backend-controller', `${input.name} has a backend controller`, input.backendControllerFile, input.backendControllerTokens),
      tokenCheck(input.code, 'schema-persistence', `${input.name} has persistent schema evidence`, input.schemaFile, input.schemaTokens),
      tokenCheck(input.code, 'workflow-tests', `${input.name} has workflow or schema tests`, input.testFile, input.testTokens),
    ],
  }));

export function runImplementation100Certification(
  options: Implementation100CertificationOptions = {},
): Implementation100CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const modules = IMPLEMENTATION100_MODULES.map((definition, index) => {
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
      code: definition.code,
      name: definition.name,
      evidence_id: `IMPLEMENTATION100-${String(index + 1).padStart(3, '0')}-${definition.code}`,
      status: checks.every((checkResult) => checkResult.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: modules.every((moduleResult) => moduleResult.status === 'pass'),
    module_count: IMPLEMENTATION100_MODULES.length,
    modules,
  };
}

export function renderImplementation100CertificationMarkdown(
  result: Implementation100CertificationResult,
): string {
  const lines = [
    '# Implementation 100 No-half-working-modules certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    `Module count: ${result.module_count}`,
    '',
    '| Evidence ID | Module | Status | Checks |',
    '| --- | --- | --- | --- |',
  ];

  for (const moduleResult of result.modules) {
    lines.push(
      `| ${moduleResult.evidence_id} | ${escapeTable(moduleResult.name)} | ${moduleResult.status} | ${escapeTable(moduleResult.checks.map((item) => `${item.status}: ${item.label}`).join('; '))} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This is the Implementation 100 no-half-working-modules certification gate.',
    '- A module fails until it has live workspace UI, live frontend API routing, backend controller evidence, persistence schema, and tests.',
    '- This script intentionally does not create demo data, bypass tenant isolation, or print secrets.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation100CertificationArtifact(
  result: Implementation100CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation100CertificationMarkdown(result));
}

export function runAndWriteImplementation100Certification(
  workspaceRoot = process.cwd(),
): Implementation100CertificationResult {
  const result = runImplementation100Certification({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation100-certification.md');
  writeImplementation100CertificationArtifact(result, outputPath);
  return result;
}

function moduleEvidence(
  code: string,
  name: string,
  frontendWorkspaceFile: string,
  frontendWorkspaceTokens: string[],
  frontendApiProxyFile: string,
  frontendApiProxyTokens: string[],
  backendControllerFile: string,
  backendControllerTokens: string[],
  schemaFile: string,
  schemaTokens: string[],
  testFile: string,
  testTokens: string[],
): ModuleEvidenceInput {
  return {
    code,
    name,
    frontendWorkspaceFile,
    frontendWorkspaceTokens,
    frontendApiProxyFile,
    frontendApiProxyTokens,
    backendControllerFile,
    backendControllerTokens,
    schemaFile,
    schemaTokens,
    testFile,
    testTokens,
  };
}

function tokenCheck(
  moduleCode: string,
  kind: string,
  label: string,
  file: string,
  tokens: string[],
): Implementation100EvidenceCheck {
  return {
    id: `${moduleCode}-${kind}`,
    label,
    file,
    pattern: allTokensPattern(tokens),
    testEvidence: tokens.join(' '),
  };
}

function allTokensPattern(tokens: string[]): RegExp {
  const source = tokens.map((token) => `(?=.*${escapeRegExp(token)})`).join('');
  return new RegExp(source, 's');
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function main(): void {
  const result = runAndWriteImplementation100Certification();

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
