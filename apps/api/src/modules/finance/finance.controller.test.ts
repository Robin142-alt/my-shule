import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { FinanceController } from './finance.controller';

test('FinanceController is gated by finance module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, FinanceController), ['finance']);
  const createPaymentHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'createPayment')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createPaymentHandler), ['finance:write']);
  
  const getTasksHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'getTasks')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, getTasksHandler), ['finance:read']);

  const createTaskHandler = Object.getOwnPropertyDescriptor(FinanceController.prototype, 'createTask')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createTaskHandler), ['finance:write']);
});
