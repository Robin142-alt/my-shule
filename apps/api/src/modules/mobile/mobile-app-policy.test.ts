import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_MOBILE_APPS,
  buildMobileAccessPolicy,
  evaluateMobileSession,
} from './mobile-app-policy';

test('BLUEPRINT_MOBILE_APPS covers parent, teacher, student, and admin apps', () => {
  assert.deepEqual(BLUEPRINT_MOBILE_APPS.map((app) => app.code), [
    'parent_app',
    'teacher_app',
    'student_app',
    'admin_app',
  ]);
  assert.ok(BLUEPRINT_MOBILE_APPS.find((app) => app.code === 'parent_app')?.capabilities.includes('fees'));
  assert.ok(BLUEPRINT_MOBILE_APPS.find((app) => app.code === 'teacher_app')?.offline_capabilities.includes('mark_entry'));
  assert.ok(BLUEPRINT_MOBILE_APPS.find((app) => app.code === 'admin_app')?.requires_mfa);
});

test('buildMobileAccessPolicy enables app profiles by role and active modules', () => {
  const policy = buildMobileAccessPolicy({
    tenantId: 'tenant-mobile',
    role: 'teacher',
    enabledModules: ['academics', 'exams', 'timetable', 'communication_sms'],
  });

  assert.equal(policy.tenant_id, 'tenant-mobile');
  assert.deepEqual(policy.enabled_apps.map((app) => app.code), ['teacher_app']);
  assert.deepEqual(policy.enabled_apps[0]?.enabled_capabilities, [
    'attendance',
    'marks_entry',
    'timetable',
    'communication',
  ]);
  assert.deepEqual(policy.enabled_apps[0]?.offline_capabilities, ['attendance', 'mark_entry']);
});

test('evaluateMobileSession requires trusted MFA sessions for admin app access', () => {
  const policy = buildMobileAccessPolicy({
    tenantId: 'tenant-mobile',
    role: 'principal',
    enabledModules: ['principal_dashboard', 'finance', 'reports'],
  });

  const result = evaluateMobileSession(policy, {
    appCode: 'admin_app',
    deviceTrusted: false,
    mfaVerified: false,
    offlineRequested: true,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Verify MFA before opening admin_app.',
    'Trust this device before opening admin_app.',
  ]);
});

test('evaluateMobileSession returns tenant-scoped offline bundles for allowed apps', () => {
  const policy = buildMobileAccessPolicy({
    tenantId: 'tenant-mobile',
    role: 'parent',
    enabledModules: ['parent_portal', 'finance', 'exams', 'communication_sms'],
  });

  const result = evaluateMobileSession(policy, {
    appCode: 'parent_app',
    deviceTrusted: true,
    mfaVerified: false,
    offlineRequested: true,
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
  assert.deepEqual(result.offline_bundle, {
    namespace: 'tenant:tenant-mobile:mobile:parent_app',
    capabilities: ['fees', 'communication', 'reports', 'results'],
  });
});
