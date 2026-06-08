import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { CommunicationController } from './communication.controller';

test('CommunicationController is gated by communication_sms module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, CommunicationController), ['communication_sms']);
  
  const sendSmsHandler = Object.getOwnPropertyDescriptor(CommunicationController.prototype, 'sendSms')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, sendSmsHandler), ['school_sms:send']);
});
