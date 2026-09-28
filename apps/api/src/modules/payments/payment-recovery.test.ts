import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeRequestPath } from "../../common/request-path.util";
import { PaymentsJobProducerService } from "./services/payments-job-producer.service";
import { PaymentInboxRecoveryService } from "./services/payment-inbox-recovery.service";
import { RequestContextService } from "../../common/request-context/request-context.service";

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
