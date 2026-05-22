import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_INSIGHT_CAPABILITIES,
  buildAiGovernancePolicy,
  createAuditableAiInsight,
} from './ai-governance-policy';

test('buildAiGovernancePolicy exposes only active-module AI capabilities for a tenant', () => {
  const policy = buildAiGovernancePolicy({
    tenantId: 'tenant-ai',
    activeModules: ['finance', 'exams', 'principal_dashboard'],
  });

  assert.equal(policy.tenant_id, 'tenant-ai');
  assert.equal(policy.audit_required, true);
  assert.ok(policy.allowed_capabilities.includes('fee_default_prediction'));
  assert.ok(policy.allowed_capabilities.includes('performance_forecasting'));
  assert.ok(policy.allowed_capabilities.includes('executive_recommendations'));
  assert.ok(!policy.allowed_capabilities.includes('attendance_anomalies'));
  assert.deepEqual(policy.blocked_modules, ['teacher_biometric_attendance']);
});

test('createAuditableAiInsight writes tenant-scoped, explainable AI audit records', () => {
  const insight = createAuditableAiInsight({
    tenantId: 'tenant-ai',
    activeModules: ['finance', 'principal_dashboard'],
    capability: 'fee_default_prediction',
    targetModule: 'finance',
    provider: 'openai',
    model: 'risk-model-v1',
    datasetVersion: 'fees-2026-term-2',
    promptSummary: 'Predict fee default risk for Form 2 balances.',
    explanation: 'Balance age and prior payment behavior increased risk.',
    recommendation: 'Principal should approve a staged reminder workflow.',
    recommendationOwnerRole: 'principal',
    confidenceScore: 0.83,
    sourceRecordIds: ['invoice-1', 'payment-7'],
    generatedAt: '2026-05-22T09:00:00.000Z',
  });

  assert.equal(insight.tenant_id, 'tenant-ai');
  assert.equal(insight.capability, 'fee_default_prediction');
  assert.equal(insight.target_module, 'finance');
  assert.equal(insight.dataset_version, 'fees-2026-term-2');
  assert.equal(insight.audit_log.model_provider, 'openai');
  assert.equal(insight.audit_log.prompt_summary, 'Predict fee default risk for Form 2 balances.');
  assert.equal(insight.human_review_required, true);
  assert.equal(insight.decision_status, 'pending_human_review');
  assert.equal(insight.audit_log.source_record_count, 2);
});

test('createAuditableAiInsight rejects capability requests for disabled modules', () => {
  assert.throws(
    () =>
      createAuditableAiInsight({
        tenantId: 'tenant-ai',
        activeModules: ['finance'],
        capability: 'attendance_anomalies',
        targetModule: 'teacher_biometric_attendance',
        provider: 'openai',
        model: 'attendance-model-v1',
        datasetVersion: 'attendance-2026-term-2',
        promptSummary: 'Find teacher attendance anomalies.',
        explanation: 'Clock-in gaps were detected.',
        recommendation: 'Deputy principal should inspect the attendance register.',
        recommendationOwnerRole: 'deputy_principal',
        sourceRecordIds: [],
      }),
    /disabled module teacher_biometric_attendance/i,
  );
});

test('AI_INSIGHT_CAPABILITIES covers the blueprint AI analytics feature set', () => {
  assert.deepEqual(AI_INSIGHT_CAPABILITIES, [
    'predictive_analytics',
    'fee_default_prediction',
    'performance_forecasting',
    'risk_detection',
    'attendance_anomalies',
    'resource_optimization',
    'executive_recommendations',
    'natural_language_summaries',
    'operational_intelligence',
  ]);
});
