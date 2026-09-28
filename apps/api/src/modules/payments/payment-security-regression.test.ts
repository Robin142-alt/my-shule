import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { RbacGuard } from '../../guards/rbac.guard';
import { TenantFinanceController } from '../tenant-finance/tenant-finance.controller';
import { MpesaC2bController } from './controllers/mpesa-c2b.controller';

// Exercise the production guard and controller together: an old saved client or a
// direct HTTP caller must not bypass the new financial configuration approval flow.
const mutations = [
  {
    name: 'upsertMpesaConfig',
    arguments: [{
      shortcode: '123456',
      consumer_key: 'fixture-consumer-key',
      consumer_secret: 'fixture-consumer-secret',
      passkey: 'fixture-passkey',
      environment: 'production',
      callback_url: 'https://callbacks.example.test/payments',
      status: 'active',
    }],
  },
  {
    name: 'rotateMpesaCredentials',
    arguments: ['config-a', { consumer_secret: 'fixture-replacement-secret' }],
  },
  {
    name: 'upsertBankAccount',
    arguments: [{
      bank_name: 'KCB',
      account_name: 'School A',
      account_number: '12345678',
      currency: 'KES',
      status: 'active',
    }],
  },
  {
    name: 'updatePaymentChannelStatus',
    arguments: ['channel-a', { status: 'active' }],
  },
] as const;

for (const mutation of mutations) {
  test(`school accountant cannot use legacy ${mutation.name} to bypass Principal approval`, async () => {
    const requestContext = new RequestContextService();
    let changed = false;
    const service = {
      upsertMpesaConfig: async () => { changed = true; return {}; },
      rotateMpesaCredentials: async () => { changed = true; return {}; },
      createBankAccount: async () => { changed = true; },
      updatePaymentChannelStatus: async () => { changed = true; },
      getSummary: async () => ({}),
    };
    const controller = new TenantFinanceController(requestContext, service as never);
    const handler = controller[mutation.name];
    const executionContext = {
      getClass: () => TenantFinanceController,
      getHandler: () => handler,
    } as unknown as ExecutionContext;
    const guard = new RbacGuard(new Reflector(), requestContext);

    await requestContext.run({
      request_id: 'legacy-payment-configuration-regression',
      tenant_id: 'school-a',
      user_id: 'accountant-a',
      role: 'accountant',
      session_id: 'session-a',
      // Include the old capability so the test reaches the disabled mutation,
      // even for sessions issued before the capability rename.
      permissions: ['billing:read', 'billing:write', 'billing:update'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'regression-test',
      method: 'POST',
      path: '/tenant-finance',
      started_at: new Date().toISOString(),
    }, async () => {
      assert.equal(guard.canActivate(executionContext), true);
      await assert.rejects(async () => {
        await Reflect.apply(handler, controller, [...mutation.arguments]);
      }, ForbiddenException);
    });

    assert.equal(changed, false, 'The old endpoint must never alter financial configuration');
  });
}

test('existing M-PESA reconciliation uses the Accountant write capability and denies portal users', async () => {
  const context = new RequestContextService();
  let reconciled = false;
  const controller = new MpesaC2bController({reconcilePendingPayment: async () => {reconciled = true; return {};}} as never);
  const execution = {getClass:()=>MpesaC2bController,getHandler:()=>controller.reconcilePayment} as unknown as ExecutionContext;
  const guard = new RbacGuard(new Reflector(),context);
  await context.run({tenant_id:'school-a',role:'accountant',is_authenticated:true,permissions:['billing:read','billing:write']} as never,async()=>{
    assert.equal(guard.canActivate(execution),true);
    await controller.reconcilePayment('verified-payment',{student_id:'legacy-student'});
  });
  assert.equal(reconciled,true);
  for(const role of ['parent','student']) {
    context.run({tenant_id:'school-a',role,is_authenticated:true,permissions:['payments:create']} as never,()=>{
      assert.throws(()=>guard.canActivate(execution),ForbiddenException);
    });
  }
});
