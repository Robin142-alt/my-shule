import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_KPI_CATEGORIES,
  buildKpiPolicy,
  evaluateKpiSnapshot,
} from './kpi-policy';

test('BLUEPRINT_KPI_CATEGORIES covers financial, academic, operational, and executive KPIs', () => {
  assert.deepEqual(BLUEPRINT_KPI_CATEGORIES.map((category) => category.code), [
    'financial',
    'academic',
    'operational',
    'executive',
  ]);
  assert.ok(BLUEPRINT_KPI_CATEGORIES.find((category) => category.code === 'financial')?.metrics.includes('collection_rate'));
  assert.ok(BLUEPRINT_KPI_CATEGORIES.find((category) => category.code === 'academic')?.metrics.includes('cbc_competency_trends'));
  assert.ok(BLUEPRINT_KPI_CATEGORIES.find((category) => category.code === 'executive')?.metrics.includes('risk_indicators'));
});

test('buildKpiPolicy enables KPI categories by active modules', () => {
  const policy = buildKpiPolicy({
    tenantId: 'tenant-kpi',
    enabledModules: ['finance', 'exams', 'students', 'principal_dashboard'],
  });

  assert.equal(policy.tenant_id, 'tenant-kpi');
  assert.deepEqual(policy.enabled_categories.map((category) => category.code), [
    'financial',
    'academic',
    'executive',
  ]);
  assert.ok(policy.enabled_metrics.includes('collection_rate'));
  assert.ok(policy.enabled_metrics.includes('mean_score'));
  assert.ok(policy.enabled_metrics.includes('enrollment_growth'));
  assert.ok(!policy.enabled_metrics.includes('inventory_turnover'));
});

test('evaluateKpiSnapshot flags missing and out-of-range release KPIs', () => {
  const policy = buildKpiPolicy({
    tenantId: 'tenant-kpi',
    enabledModules: ['finance', 'students', 'principal_dashboard'],
  });

  const result = evaluateKpiSnapshot(policy, {
    collection_rate: 0.71,
    arrears_percentage: 0.31,
    enrollment_growth: 0.04,
    parent_engagement: 0.25,
    operational_efficiency: 0.88,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Improve collection_rate to at least 0.8.',
    'Reduce arrears_percentage to at most 0.25.',
    'Improve parent_engagement to at least 0.4.',
    'Submit KPI value for risk_indicators.',
  ]);
});

test('evaluateKpiSnapshot passes complete healthy KPI snapshot', () => {
  const policy = buildKpiPolicy({
    tenantId: 'tenant-kpi',
    enabledModules: ['finance', 'exams', 'students', 'inventory', 'staff', 'principal_dashboard'],
  });

  const result = evaluateKpiSnapshot(policy, {
    collection_rate: 0.91,
    arrears_percentage: 0.12,
    revenue_trends: 0.08,
    mean_score: 68,
    grade_distribution: 0.8,
    cbc_competency_trends: 0.76,
    attendance_rates: 0.94,
    staff_punctuality: 0.9,
    inventory_turnover: 4,
    enrollment_growth: 0.07,
    parent_engagement: 0.62,
    operational_efficiency: 0.84,
    risk_indicators: 0.1,
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
});
