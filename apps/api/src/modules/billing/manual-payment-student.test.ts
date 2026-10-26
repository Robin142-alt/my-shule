import assert from 'node:assert/strict';
import test from 'node:test';
import { ManualFeePaymentService } from './manual-fee-payment.service';

function fixture(invoiceStudent: string | null = 'learner-1') {
  let saved: any;
  const allocations: any[] = [];
  const invoice = { id: 'invoice-1', tenant_id: 'school-1', total_amount_minor: '10000', amount_paid_minor: '0',
    metadata: invoiceStudent ? { student_id: invoiceStudent } : {} };
  const service = new ManualFeePaymentService(
    { requireStore: () => ({ tenant_id: 'school-1', user_id: 'actor-1' }) } as never,
    { withRequestTransaction: (callback: () => unknown) => callback(), query: async () => ({ rows: [{ id: invoiceStudent }] }) } as never,
    { create: async (input: any) => saved = { ...input, id: 'payment-1', received_at: new Date(), created_at: new Date(), updated_at: new Date() },
      createAllocation: async (input: any) => { allocations.push(input); return { id: `allocation-${allocations.length}` }; },
      markCleared: async () => ({ ...saved, status: 'cleared' }) } as never,
    { findById: async () => invoice, lockManualFeeInvoiceForAllocation: async () => invoice,
      applyManualFeeInvoicePayment: async () => undefined } as never,
    { findByCode: async () => ({ id: 'account-1' }) } as never,
    { postTransaction: async () => ({ transaction_id: 'ledger-1' }) } as never,
    { recordSchoolOperation: async () => undefined } as never,
  );
  return { service, allocations, saved: () => saved };
}
const payment = { invoice_id: 'invoice-1', idempotency_key: 'receipt-1', payment_method: 'cash' as const, amount_minor: '12500' };

test('an invoice-only receipt binds its student before posting and preserves overpayment ownership', async () => {
  const f = fixture();
  const result = await f.service.createManualFeePayment(payment);
  assert.equal(result.student_id, 'learner-1');
  assert.equal(f.saved().student_id, 'learner-1');
  assert.deepEqual(f.allocations.map(({ student_id, amount_minor, allocation_type }) => ({ student_id, amount_minor, allocation_type })), [
    { student_id: 'learner-1', amount_minor: '10000', allocation_type: 'invoice' },
    { student_id: 'learner-1', amount_minor: '2500', allocation_type: 'credit' },
  ]);
});

test('a fee receipt refuses an invoice without a student instead of creating unowned credit', async () => {
  const f = fixture(null);
  await assert.rejects(f.service.createManualFeePayment(payment), /learner/i);
  assert.equal(f.saved(), undefined);
});
