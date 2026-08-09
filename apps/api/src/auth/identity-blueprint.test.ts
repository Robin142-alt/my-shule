import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_AUTHENTICATION_METHODS,
  BLUEPRINT_IDENTITY_SECURITY_CONTROLS,
  BLUEPRINT_USER_ROLES,
  buildIdentityAssertion,
  normalizeBlueprintRole,
} from './identity-blueprint';

test('identity blueprint covers all authentication methods and security controls', () => {
  assert.deepEqual(BLUEPRINT_AUTHENTICATION_METHODS, [
    'email_password',
    'phone_otp',
    'google',
    'microsoft',
    'sso',
    'biometric',
    'rfid',
    'nfc',
  ]);
  assert.deepEqual(BLUEPRINT_IDENTITY_SECURITY_CONTROLS, [
    'mfa',
    'device_session_management',
    'audit_logs',
    'ip_restrictions',
    'rbac',
    'permission_inheritance',
    'password_policies',
    'tenant_bound_sessions',
  ]);
});

test('identity blueprint normalizes every requested ERP role', () => {
  assert.equal(BLUEPRINT_USER_ROLES.length, 31);
  assert.equal(normalizeBlueprintRole('Dean of Academics'), 'dean_academics');
  assert.equal(normalizeBlueprintRole('Exams Manager'), 'exams_manager');
  assert.equal(normalizeBlueprintRole('Head of Department'), 'hod');
  assert.equal(normalizeBlueprintRole('School Counsellor'), 'school_counsellor');
  assert.equal(normalizeBlueprintRole('Dean of Students'), 'discipline_master');
  assert.equal(normalizeBlueprintRole('Deputy Principal'), 'deputy_principal');
  assert.equal(normalizeBlueprintRole('Bursar'), 'bursar');
  assert.equal(normalizeBlueprintRole('Nurse'), 'nurse');
  assert.equal(normalizeBlueprintRole('Security Officer'), 'security_officer');
  assert.equal(normalizeBlueprintRole('Lab Technician'), 'lab_technician');
  assert.equal(normalizeBlueprintRole('Admissions Officer'), 'admissions_officer');
  assert.equal(normalizeBlueprintRole('Computer Lab Manager'), 'ict_manager');
  assert.throws(() => normalizeBlueprintRole('unknown role'), /Unsupported blueprint role/);
});

test('buildIdentityAssertion creates tenant-bound auditable assertions for device methods', () => {
  const assertion = buildIdentityAssertion({
    tenantId: 'green-valley',
    method: 'biometric',
    subject: 'fingerprint-template-42',
    role: 'teacher',
    userId: 'user-1',
    deviceId: 'bio-device-7',
    assertedAt: '2026-05-22T08:00:00.000Z',
  });

  assert.deepEqual(assertion, {
    tenant_id: 'green-valley',
    user_id: 'user-1',
    method: 'biometric',
    subject: 'fingerprint-template-42',
    role: 'teacher',
    device_id: 'bio-device-7',
    confidence: 'high',
    asserted_at: '2026-05-22T08:00:00.000Z',
    audit_required: true,
  });
});
