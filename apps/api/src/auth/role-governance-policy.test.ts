import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ROLE_GOVERNANCE_BLUEPRINT,
  buildRoleGovernancePolicy,
  evaluateRoleAssignment,
} from './role-governance-policy';

test('ROLE_GOVERNANCE_BLUEPRINT covers global and school ERP roles', () => {
  assert.deepEqual(ROLE_GOVERNANCE_BLUEPRINT.globalRoles, [
    'super_admin',
    'platform_support',
    'finance_admin',
  ]);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('principal'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('deputy_principal'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('exams_manager'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('secretary'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('boarding_master'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.schoolRoles.includes('security_officer'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.controls.includes('permission_inheritance'), true);
  assert.equal(ROLE_GOVERNANCE_BLUEPRINT.controls.includes('tenant_bound_assignments'), true);
});

test('buildRoleGovernancePolicy enables module-bound roles only when their modules are active', () => {
  const policy = buildRoleGovernancePolicy({
    activeModules: ['finance', 'clinic_health', 'transport', 'parent_portal'],
  });

  assert.equal(policy.roles.find((role) => role.code === 'bursar')?.enabled, true);
  assert.equal(policy.roles.find((role) => role.code === 'nurse')?.enabled, true);
  assert.equal(policy.roles.find((role) => role.code === 'driver')?.enabled, true);
  assert.equal(policy.roles.find((role) => role.code === 'parent')?.enabled, true);
  assert.equal(policy.roles.find((role) => role.code === 'student')?.permissions.includes('student-portal:read'), true);
  assert.equal(policy.roles.find((role) => role.code === 'librarian')?.enabled, false);
  assert.equal(policy.roles.find((role) => role.code === 'exams_manager')?.enabled, false);
  assert.equal(policy.roles.find((role) => role.code === 'boarding_master')?.enabled, false);
});

test('buildRoleGovernancePolicy enables exams manager only with exams module and non-approval permissions', () => {
  const policy = buildRoleGovernancePolicy({
    activeModules: ['exams'],
  });

  const examsManager = policy.roles.find((role) => role.code === 'exams_manager');

  assert.equal(examsManager?.enabled, true);
  assert.equal(examsManager?.permissions.includes('exams:write'), true);
  assert.equal(examsManager?.permissions.includes('exams:enter-marks'), true);
  assert.equal(examsManager?.permissions.includes('exams:approve'), false);
});

test('evaluateRoleAssignment rejects cross-tenant global roles and unsafe school assignments', () => {
  const policy = buildRoleGovernancePolicy({
    activeModules: ['finance'],
  });

  const globalResult = evaluateRoleAssignment({
    role: 'super_admin',
    tenantId: 'green-valley',
    permissions: ['*:*'],
    mfaVerified: true,
  }, policy);
  assert.equal(globalResult.ok, false);
  assert.equal(globalResult.issues.some((issue) => issue.id === 'global-role-must-not-bind-school'), true);

  const principalResult = evaluateRoleAssignment({
    role: 'principal',
    tenantId: 'green-valley',
    permissions: ['students:read', 'finance:read'],
    mfaVerified: false,
  }, policy);
  assert.equal(principalResult.ok, false);
  assert.equal(principalResult.issues.some((issue) => issue.id === 'mfa-required'), true);

  const librarianResult = evaluateRoleAssignment({
    role: 'librarian',
    tenantId: 'green-valley',
    permissions: ['library:read'],
    mfaVerified: true,
  }, policy);
  assert.equal(librarianResult.ok, false);
  assert.equal(librarianResult.issues.some((issue) => issue.id === 'module-role-disabled'), true);

  const teacherResult = evaluateRoleAssignment({
    role: 'teacher',
    tenantId: '',
    permissions: ['*:*'],
    mfaVerified: true,
  }, policy);
  assert.equal(teacherResult.ok, false);
  assert.equal(teacherResult.issues.some((issue) => issue.id === 'school-role-requires-tenant'), true);
  assert.equal(teacherResult.issues.some((issue) => issue.id === 'wildcard-permission-denied'), true);
});

test('evaluateRoleAssignment passes tenant-scoped module roles with inherited permissions', () => {
  const policy = buildRoleGovernancePolicy({
    activeModules: ['finance', 'parent_portal', 'communication_sms'],
  });

  const result = evaluateRoleAssignment({
    role: 'parent',
    tenantId: 'green-valley',
    permissions: ['auth:read', 'portal:read_own_children', 'portal:message_school'],
    mfaVerified: false,
  }, policy);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);

  const bursar = policy.roles.find((role) => role.code === 'bursar');
  assert.deepEqual(bursar?.inherits, ['accountant']);
  assert.equal(bursar?.permissions.includes('finance:write'), true);
});
