import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { buildFeeStatementContent, FinanceController } from './finance.controller';

test('FinanceController is gated by finance module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, FinanceController), ['finance']);
  const createPaymentHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'createPayment')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createPaymentHandler), ['finance:write']);
  
  const getTasksHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'getTasks')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, getTasksHandler), ['finance:read']);

  const createTaskHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'createTask')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createTaskHandler), ['finance:write']);
});

test('buildFeeStatementContent renders real linked-learner finance data without placeholder copy', () => {
  const content = buildFeeStatementContent({
    generatedAt: new Date('2026-06-22T12:00:00.000Z'),
    linkedChildCount: 1,
    invoices: [
      {
        invoiceNumber: 'INV-001',
        studentName: 'Amina Otieno',
        academicYear: '2026',
        term: 'Term 2',
        amountDue: 12000,
        amountPaid: 7000,
        balance: 5000,
        status: 'PARTIALLY_PAID',
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
      },
    ],
    payments: [
      {
        paymentReference: 'MPESA-001',
        studentName: 'Amina Otieno',
        paymentMethod: 'MPESA',
        amount: 7000,
        paymentDate: new Date('2026-06-20T00:00:00.000Z'),
        status: 'COMPLETED',
      },
    ],
  });

  assert.match(content, /Amina Otieno/);
  assert.match(content, /INV-001/);
  assert.match(content, /MPESA-001/);
  assert.match(content, /Current balance: KES 5,000\.00/);
  assert.doesNotMatch(content, /coming soon|placeholder|demo/i);
});

test('buildFeeStatementContent returns truthful empty statement for users with no linked learners', () => {
  const content = buildFeeStatementContent({
    generatedAt: new Date('2026-06-22T12:00:00.000Z'),
    linkedChildCount: 0,
    invoices: [],
    payments: [],
  });

  assert.match(content, /Linked learners: 0/);
  assert.match(content, /No invoices found for the linked learner records/);
  assert.match(content, /No payments found for the linked learner records/);
  assert.doesNotMatch(content, /coming soon|fake success/i);
});
