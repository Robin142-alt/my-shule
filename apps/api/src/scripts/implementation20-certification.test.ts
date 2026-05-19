import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation20CertificationMarkdown,
  runImplementation20Certification,
} from './implementation20-certification';

const passingSources: Record<string, string> = {
  'apps/api/src/modules/module-access/module-access.constants.ts': "teacher_biometric_attendance admin_command_centers code: 'library' name: 'Library'",
  'apps/api/src/modules/module-access/module-access-schema.service.ts': 'school_module_access ENABLE ROW LEVEL SECURITY',
  'apps/api/src/modules/module-access/module-access.guard.ts': 'Module not enabled for your school',
  'apps/api/src/modules/module-access/module-access.repository.ts': 'disabled_at enabled = false',
  'apps/web/src/components/platform/superadmin-pages.tsx': 'ModuleAllocationEditor Save module access',
  'apps/api/src/modules/academics/academics-schema.service.ts': 'academic_levels class_streams student_class_assignments',
  'apps/api/src/modules/academics/dto/academic.dto.ts': 'CBE CBC 8-4-4 International Custom',
  'apps/api/src/modules/academics/academics.controller.ts': 'class-structure',
  'apps/api/src/modules/academics/academics.service.ts': 'assignStudentToClass academic_year',
  'apps/api/src/modules/labs/labs-schema.service.ts': 'lab_departments lab_sessions lab_attendance lab_equipment chemical_items chemical_disposal_requests',
  'apps/api/src/modules/labs/labs.service.ts': 'Expired chemicals cannot be issued quarantined markMissingMandatoryAttendanceAbsent completeLabSession recordMandatoryLabAttendanceEffects',
  'apps/api/src/modules/labs/repositories/labs.repository.ts': "source_type 'lab_attendance' labs.participation_metric_recorded",
  'apps/api/src/modules/labs/labs.processor.ts': 'runChemicalExpiryCheck runEquipmentReconciliationCheck runMandatoryAttendanceDisciplineCheck',
  'apps/web/src/app/api/labs/[...path]/route.ts': 'proxySchoolApiRequest "/labs"',
  'apps/web/src/components/school/school-pages.tsx': 'LabsOperationsPage Mandatory lab attendance Chemical batch safety LeadershipCommandCenterPage TeacherBiometricAttendancePage filterNavItemsByEnabledModules ModuleDisabledPanel',
  'apps/api/src/modules/admin-command/admin-command-schema.service.ts': 'admin_incidents announcements meeting_minutes duty_rosters',
  'apps/api/src/modules/admin-command/admin-command.controller.ts': 'principal/dashboard deputy/dashboard secretary/dashboard',
  'apps/api/src/modules/biometric-attendance/biometric-attendance-schema.service.ts': 'biometric_devices biometric_events teacher_attendance_logs attendance_rules',
  'apps/api/src/modules/biometric-attendance/biometric-attendance.service.ts': 'offline_mode_flag event_hash duplicate override reason 12',
  'apps/api/src/modules/biometric-attendance/biometric-attendance.processor.ts': 'runDailyAttendanceRuleCheck applyDailyAttendanceRules',
  'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts': 'live-feed reports/monthly',
  'apps/web/src/app/api/admin-command/[...path]/route.ts': 'proxySchoolApiRequest "/admin-command"',
  'apps/web/src/app/api/biometric-attendance/[...path]/route.ts': 'proxySchoolApiRequest "/biometric-attendance"',
  'apps/web/src/lib/module-access/module-access-map.ts': 'getModuleCodeForSchoolSection teacher_biometric_attendance admin_command_centers',
  'apps/web/src/lib/routing/public-experience-session.ts': 'readLibrarianLibrarySession checkSchoolModuleAccess library',
  'apps/web/src/app/api/library/borrowings/route.ts': 'checkSchoolModuleAccess library Module not enabled for your school',
  'apps/web/src/app/api/academics/[...path]/route.ts': 'proxySchoolApiRequest "/academics"',
  'apps/web/src/app/api/reports/[...path]/route.ts': 'proxySchoolApiRequest "/reports"',
  'apps/web/src/app/api/staff/[...path]/route.ts': 'proxySchoolApiRequest "/hr"',
  'apps/web/src/app/api/timetable/[...path]/route.ts': 'proxySchoolApiRequest "/timetable"',
  'apps/web/src/lib/features/module-readiness.ts': 'labs leadership teacher-attendance inactiveModules attendance',
};

test('Implementation 20 certification passes when source evidence is present', () => {
  const result = runImplementation20Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  assert.equal(result.ok, true);
  assert.equal(result.areas.every((area) => area.status === 'pass'), true);
  assert.match(result.areas[0].evidence_id, /^IMPLEMENTATION20-001-/);
});

test('Implementation 20 certification fails when module allocation evidence is missing', () => {
  const result = runImplementation20Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/module-access/module-access.guard.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'runtime-guard' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 20 certification markdown is artifact-safe', () => {
  const result = runImplementation20Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  const markdown = renderImplementation20CertificationMarkdown(result);

  assert.match(markdown, /Implementation 20 Certification/);
  assert.match(markdown, /IMPLEMENTATION20-001-/);
  assert.equal(/password=/i.test(markdown), false);
});
