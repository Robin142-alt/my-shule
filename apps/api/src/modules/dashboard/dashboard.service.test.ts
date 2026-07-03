import assert from 'node:assert/strict';
import test from 'node:test';

import { DashboardService } from './dashboard.service';

function createService() {
  return new DashboardService({
    resolveWidgets: async () => [],
  } as never);
}

test('DashboardService emits route-backed quick actions for active capabilities', async () => {
  const service = createService();

  const layout = await service.getDashboardLayout('school-a', 'accountant', ['finance:write']);
  const recordPayment = layout.buttons.find((button) => button.action === 'finance.record_payment');

  assert.ok(recordPayment);
  assert.equal(recordPayment.state, 'ACTIVE');
  assert.equal(recordPayment.executionType, 'ROUTE');
  assert.equal(recordPayment.href, '/school/accountant/payments');
});

test('DashboardService keeps locked quick actions route-backed for authorized users to unlock later', async () => {
  const service = createService();

  const layout = await service.getDashboardLayout('school-a', 'exams-manager', []);
  const publishExam = layout.buttons.find((button) => button.action === 'exams.publish');

  assert.ok(publishExam);
  assert.equal(publishExam.state, 'LOCKED');
  assert.equal(publishExam.executionType, 'ROUTE');
  assert.equal(publishExam.href, '/school/exams-manager/publishing');
});

test('DashboardService sends admissions officers to the operational admissions desk', async () => {
  const service = createService();

  const layout = await service.getDashboardLayout('school-a', 'admissions_officer', ['students:write']);
  const admitStudent = layout.buttons.find((button) => button.action === 'students.admit');

  assert.ok(admitStudent);
  assert.equal(admitStudent.state, 'ACTIVE');
  assert.equal(admitStudent.href, '/school/admissions/admissions?view=new-registration');
});
