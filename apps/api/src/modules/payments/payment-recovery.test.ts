import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeRequestPath } from "../../common/request-path.util";
import { PaymentsJobProducerService } from "./services/payments-job-producer.service";
import { PaymentInboxRecoveryService } from "./services/payment-inbox-recovery.service";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { PaymentsJobExecutionService } from './services/payments-job-execution.service';
import { Logger } from '@nestjs/common';

test('a school recovery failure cannot starve later schools or prevent retry on the next page cycle', async (t) => {
  const errors: string[] = [];
  t.mock.method(Logger.prototype, 'error', (message: string) => errors.push(message));
  const context = new RequestContextService();
  const tenants = Array.from({ length: 101 }, (_, i) => `school-${String(i).padStart(3, '0')}`);
  const visited: string[] = [], dispatched: string[] = [], cursors: string[] = [];
  const db = {
    withRequestTransaction: (fn: () => Promise<unknown>) => fn(),
    query: async (sql: string, values: string[]) => {
      if (sql.includes('FROM tenants')) {
        assert.equal(context.requireStore().tenant_id, null);
        cursors.push(values[0]);
        return { rows: tenants.filter((tenant) => tenant > values[0]).slice(0, 100).map((tenant_id) => ({ tenant_id })) };
      }
      assert.equal(context.requireStore().tenant_id, values[0]);
      return { rows: sql.includes('UPDATE callback_logs') ? [{ id: 'callback', checkout_request_id: 'checkout' }] : [] };
    },
  };
  const recovery = new PaymentInboxRecoveryService(db as never, context, {
    enqueuePayment: async ({ tenant_id }: { tenant_id: string }) => dispatched.push(tenant_id),
  } as never, {
    recoverSchool: async (tenant: string) => {
      assert.equal(context.requireStore().tenant_id, tenant);
      visited.push(tenant);
      if (tenant === tenants[0]) throw new Error('private provider details must not be logged');
    },
  } as never);
  await recovery.sweep();
  await recovery.sweep();
  await recovery.sweep();
  assert.deepEqual(cursors, ['', tenants[99], '']);
  assert.equal(visited.filter((tenant) => tenant === tenants[0]).length, 2);
  assert.ok(dispatched.includes(tenants[100]));
  assert.equal(dispatched.length, 199);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((message) => message.includes(tenants[0]) && !message.includes('private provider')));
  assert.equal(context.snapshot(), undefined);
});

test("callback bearer tokens are redacted in application logs with and without queries", () => {
  for (const suffix of ["result", "timeout"]) {
    const path = `/api/payments/mpesa/transaction-status/amani-school/request-id/secret-bearer/${suffix}`;
    assert.equal(
      sanitizeRequestPath(path),
      path.replace("secret-bearer", "[redacted]"),
    );
    assert.equal(
      sanitizeRequestPath(`${path}?token=other-secret`),
      `${path.replace("secret-bearer", "[redacted]")}?token=%5Bredacted%5D`,
    );
  }
});

test("queue IDs separate tenants and late deliveries while replaying a delivery is stable", () => {
  const producer = new PaymentsJobProducerService({} as never);
  const payment = {
    tenant_id: "school-a",
    checkout_request_id: "checkout:1",
    callback_log_id: "callback-1",
  };
  const id = producer.buildJobId(payment);
  assert.ok(!id.includes(":"));
  assert.equal(producer.buildJobId({ ...payment }), id);
  assert.notEqual(
    producer.buildJobId({ ...payment, tenant_id: "school-b" }),
    id,
  );
  assert.notEqual(
    producer.buildJobId({ ...payment, callback_log_id: "late-success" }),
    id,
  );
});

test('bank jobs share the existing queue, yield priority to callbacks, and retry a failed dispatch without changing school identity',async()=>{
  const added:any[]=[],retried:string[]=[];
  let existing:any=null;
  const producer=new PaymentsJobProducerService({getQueue:()=>({getJob:async()=>existing,
    add:async(...args:any[])=>{added.push(args);}})} as never);
  await producer.enqueueBankRetrieval('school-a','request-a');await producer.enqueueBankRetrieval('school-b','request-b');
  assert.equal(added[0][0],'retrieve-bank-transactions');assert.equal(added[0][2].priority,10);
  assert.notEqual(added[0][2].jobId,added[1][2].jobId);assert.equal(added[0][1].tenant_id,'school-a');
  existing={getState:async()=> 'failed',retry:async()=>{retried.push('retry');}};
  await producer.enqueueBankRetrieval('school-a','request-again');assert.deepEqual(retried,['retry']);assert.equal(added.length,2);
});

test('bank queue execution establishes and restores one school context',async()=>{
  const context=new RequestContextService(),seen:string[]=[];
  const service=new PaymentsJobExecutionService({} as never,{} as never,{recoverSchool:async(tenant:string)=>{
    assert.equal(context.requireStore().tenant_id,tenant);seen.push(tenant);
  }} as never,context);
  await service.processBankRetrieval({tenant_id:'school-a',request_id:'a',enqueued_at:new Date().toISOString()},'job-a');
  await service.processBankRetrieval({tenant_id:'school-b',request_id:'b',enqueued_at:new Date().toISOString()},'job-b');
  assert.deepEqual(seen,['school-a','school-b']);
  await assert.rejects(()=>service.processBankRetrieval({tenant_id:'../../other',request_id:'x',enqueued_at:''},'job-x'),/not configured/);
});

test("a failed dispatch preserves recovery of other schools and uses individual tenant context", async () => {
  const context = new RequestContextService();
  const dispatched: string[] = [];
  const queries: string[] = [];
  const db = {
    withRequestTransaction: (fn: () => Promise<unknown>) => fn(),
    query: async (sql: string, values: string[]) => {
      if (sql.includes("FROM tenants"))
        return { rows: [{ tenant_id: "school-a" }, { tenant_id: "school-b" }] };
      assert.equal(context.requireStore().tenant_id, values[0]);
      queries.push(sql);
      return {
        rows: sql.includes("UPDATE callback_logs")
          ? [{ id: "callback", checkout_request_id: "checkout" }]
          : [],
      };
    },
  };
  const recovery = new PaymentInboxRecoveryService(db as never, context, {
    enqueuePayment: async (data: { tenant_id: string }) => {
      dispatched.push(data.tenant_id);
      if (data.tenant_id === "school-a") throw new Error("Redis unavailable");
    },
  } as never);
  await recovery.sweep();
  assert.deepEqual(dispatched, ["school-a", "school-b"]);
  assert.ok(
    queries.some((sql) =>
      sql.includes(
        "callback_trust_status IN ('edge_signed','provider_verified')",
      ),
    ),
  );
  assert.ok(queries.every((sql) => sql.includes("SKIP LOCKED")));
});
