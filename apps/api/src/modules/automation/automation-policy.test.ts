import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_AUTOMATION_TRIGGERS,
  buildAutomationPolicy,
  evaluateAutomationEvents,
} from './automation-policy';

test('buildAutomationPolicy exposes tenant automation rules only for enabled modules', () => {
  const policy = buildAutomationPolicy({
    tenantId: 'tenant-auto',
    enabledModules: ['finance', 'inventory', 'discipline', 'timetable'],
  });

  assert.equal(policy.tenant_id, 'tenant-auto');
  assert.deepEqual(policy.enabled_triggers, [
    'fee_overdue',
    'low_stock',
    'discipline_escalation',
    'timetable_conflict',
  ]);
  assert.ok(!policy.enabled_triggers.includes('attendance_absence'));
  assert.deepEqual(BLUEPRINT_AUTOMATION_TRIGGERS, [
    'fee_overdue',
    'low_stock',
    'attendance_absence',
    'discipline_escalation',
    'timetable_conflict',
    'exam_result_publish',
    'clinic_emergency',
  ]);
});

test('evaluateAutomationEvents creates tenant-scoped actions and skips disabled module triggers', () => {
  const policy = buildAutomationPolicy({
    tenantId: 'tenant-auto',
    enabledModules: ['finance', 'inventory', 'discipline'],
  });

  const result = evaluateAutomationEvents(policy, [
    {
      id: 'event-1',
      trigger: 'fee_overdue',
      moduleCode: 'finance',
      subjectId: 'student-1',
      severity: 'warning',
      occurredAt: '2026-05-22T08:00:00.000Z',
    },
    {
      id: 'event-2',
      trigger: 'attendance_absence',
      moduleCode: 'teacher_biometric_attendance',
      subjectId: 'teacher-1',
      severity: 'critical',
      occurredAt: '2026-05-22T08:05:00.000Z',
    },
    {
      id: 'event-3',
      trigger: 'discipline_escalation',
      moduleCode: 'discipline',
      subjectId: 'student-2',
      severity: 'critical',
      occurredAt: '2026-05-22T08:10:00.000Z',
    },
  ]);

  assert.deepEqual(
    result.actions.map((action) => action.action_type),
    ['send_fee_reminder', 'escalate_discipline_case'],
  );
  assert.deepEqual(result.actions.map((action) => action.tenant_id), ['tenant-auto', 'tenant-auto']);
  assert.equal(result.actions[0]?.channel, 'sms');
  assert.equal(result.actions[1]?.escalation_role, 'deputy_principal');
  assert.deepEqual(result.skipped_event_ids, ['event-2']);
});

test('evaluateAutomationEvents deduplicates repeated events for the same trigger and subject', () => {
  const policy = buildAutomationPolicy({
    tenantId: 'tenant-auto',
    enabledModules: ['inventory'],
  });

  const result = evaluateAutomationEvents(policy, [
    {
      id: 'stock-1',
      trigger: 'low_stock',
      moduleCode: 'inventory',
      subjectId: 'chalk',
      severity: 'warning',
      occurredAt: '2026-05-22T08:00:00.000Z',
    },
    {
      id: 'stock-2',
      trigger: 'low_stock',
      moduleCode: 'inventory',
      subjectId: 'chalk',
      severity: 'warning',
      occurredAt: '2026-05-22T08:01:00.000Z',
    },
  ]);

  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.deduplicated_event_ids, ['stock-2']);
});
