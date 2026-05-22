import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateTenantBillingContractInvoice } from './billing-contract';

test('calculateTenantBillingContractInvoice prices active modules and quota overages for term billing', () => {
  const invoice = calculateTenantBillingContractInvoice({
    tenantId: 'school-a',
    schoolName: 'School A',
    currencyCode: 'KES',
    billingCycle: 'term',
    contractType: 'module_based',
    studentCount: 600,
    modules: [
      { code: 'students', name: 'Student Management', baseAmountMinor: 50_000, perStudentAmountMinor: 100 },
      { code: 'finance', name: 'Fee Management', baseAmountMinor: 80_000 },
      { code: 'exams', name: 'Exams and Results', baseAmountMinor: 70_000 },
      { code: 'parent_portal', name: 'Parent Portal', baseAmountMinor: 30_000 },
    ],
    quotas: {
      storage_gb: 200,
      sms: 1_000,
      devices: 10,
    },
    usage: {
      storage_gb: 220,
      sms: 1_200,
      devices: 12,
    },
    overageRates: {
      storage_gb: 500,
      sms: 2,
      devices: 5_000,
    },
  });

  assert.equal(invoice.tenant_id, 'school-a');
  assert.equal(invoice.billing_cycle, 'term');
  assert.equal(invoice.contract_type, 'module_based');
  assert.equal(invoice.currency_code, 'KES');
  assert.equal(invoice.line_items.find((line) => line.code === 'module:students')?.amount_minor, 110_000);
  assert.equal(invoice.line_items.find((line) => line.code === 'usage:sms')?.amount_minor, 400);
  assert.equal(invoice.line_items.find((line) => line.code === 'usage:devices')?.quantity, 2);
  assert.equal(invoice.total_amount_minor, 310_400);
  assert.deepEqual(invoice.active_module_codes, ['students', 'finance', 'exams', 'parent_portal']);
});

test('calculateTenantBillingContractInvoice supports negotiated enterprise annual contracts', () => {
  const invoice = calculateTenantBillingContractInvoice({
    tenantId: 'school-b',
    schoolName: 'School B',
    currencyCode: 'KES',
    billingCycle: 'annual',
    contractType: 'enterprise',
    studentCount: 2_000,
    negotiatedAmountMinor: 12_000_000,
    modules: [
      { code: 'students', name: 'Student Management', baseAmountMinor: 50_000, perStudentAmountMinor: 100 },
      { code: 'iot', name: 'IoT and Smart Campus', baseAmountMinor: 400_000 },
      { code: 'ai_insights', name: 'AI Insights', baseAmountMinor: 250_000 },
      { code: 'cbt_exams', name: 'CBT Exams', baseAmountMinor: 180_000 },
    ],
    quotas: {
      storage_gb: 2_000,
      sms: 250_000,
      devices: 250,
    },
    usage: {
      storage_gb: 1_800,
      sms: 200_000,
      devices: 220,
    },
  });

  assert.equal(invoice.contract_type, 'enterprise');
  assert.equal(invoice.billing_cycle, 'annual');
  assert.equal(invoice.total_amount_minor, 12_000_000);
  assert.deepEqual(
    invoice.line_items.map((line) => line.code),
    ['contract:enterprise'],
  );
  assert.deepEqual(invoice.quota_snapshot, {
    storage_gb: { quota: 2000, used: 1800, overage: 0 },
    sms: { quota: 250000, used: 200000, overage: 0 },
    devices: { quota: 250, used: 220, overage: 0 },
  });
});
