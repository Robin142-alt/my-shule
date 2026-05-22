import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KENYAN_DATA_PROTECTION_CONTROLS,
  buildDataProtectionPolicy,
  evaluateDataProcessingActivity,
} from './data-protection-policy';

test('buildDataProtectionPolicy creates a Kenyan tenant data protection baseline', () => {
  const policy = buildDataProtectionPolicy({
    tenantId: 'green-valley',
    schoolName: 'Green Valley School',
    enabledModules: ['students', 'finance', 'clinic_health', 'teacher_biometric_attendance'],
  });

  assert.equal(policy.tenant_id, 'green-valley');
  assert.equal(policy.jurisdiction, 'KE');
  assert.equal(policy.legal_framework, 'Kenyan Data Protection Act');
  assert.equal(policy.data_subject_request_sla_days, 30);
  assert.equal(policy.encryption.at_rest, true);
  assert.equal(policy.encryption.in_transit, true);
  assert.ok(policy.controls.includes('child_data_dpia'));
  assert.ok(policy.retention_schedules.some((schedule) => schedule.subject === 'student_records'));
  assert.ok(policy.consent_purposes.includes('biometric_attendance'));
  assert.deepEqual(KENYAN_DATA_PROTECTION_CONTROLS, [
    'tenant_isolation',
    'encryption_at_rest',
    'encryption_in_transit',
    'audit_logs',
    'consent_management',
    'data_retention',
    'data_subject_rights',
    'child_data_dpia',
    'breach_response',
    'backup_encryption',
  ]);
});

test('evaluateDataProcessingActivity requires active modules, consent, encryption, and DPIA for sensitive school data', () => {
  const policy = buildDataProtectionPolicy({
    tenantId: 'green-valley',
    schoolName: 'Green Valley School',
    enabledModules: ['students', 'clinic_health'],
  });

  const result = evaluateDataProcessingActivity(policy, {
    moduleCode: 'teacher_biometric_attendance',
    purpose: 'biometric_attendance',
    categories: ['sensitive_child_data', 'sensitive_biometric_data'],
    hasConsent: false,
    encryptedAtRest: false,
    encryptedInTransit: true,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Activate module teacher_biometric_attendance before processing.',
    'Capture consent for biometric_attendance.',
    'Enable encryption at rest before processing.',
    'Complete child-data DPIA review.',
  ]);
});

test('evaluateDataProcessingActivity passes compliant processing for enabled modules', () => {
  const policy = buildDataProtectionPolicy({
    tenantId: 'green-valley',
    schoolName: 'Green Valley School',
    enabledModules: ['students', 'finance'],
  });

  const result = evaluateDataProcessingActivity(policy, {
    moduleCode: 'finance',
    purpose: 'fee_billing',
    categories: ['payment_data'],
    hasConsent: true,
    encryptedAtRest: true,
    encryptedInTransit: true,
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
  assert.equal(result.audit_required, true);
});
