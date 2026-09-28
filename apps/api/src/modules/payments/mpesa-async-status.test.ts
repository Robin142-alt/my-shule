import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { MpesaAsyncStatusService } from "./mpesa-async-status.service";

function harness() {
  const context = new RequestContextService();
  const token = "a".repeat(64),
    id = randomUUID();
  const originalDate = new Date("2026-01-01T00:00:00Z");
  const request = {
    id,
    state: "pending",
    token_hash: createHash("sha256").update(token).digest("hex"),
    conversation_id: "CONVERSATION-1",
    result_conversation_id: null as string | null,
    trans_id: "RECEIPT1",
    created_at: originalDate,
    amount_minor: null as string | null,
    receiver_shortcode: null as string | null,
    receipt_number: null as string | null,
    result_code: null as string | null,
  };
  let writes = 0;
  const db = {
    withRequestTransaction: (work: () => unknown) => work(),
    query: async (sql: string, params: unknown[]) => {
      assert.equal(context.requireStore().tenant_id, "amani-school");
      if (sql.includes("FROM mpesa_c2b_payments"))
        return {
          rows: [
            {
              id: randomUUID(),
              mpesa_config_id: randomUUID(),
              business_short_code: "123456",
              amount_minor: "10000",
            },
          ],
        };
      if (sql.includes("SELECT")) return { rows: [request] };
      if (sql.includes("state='timed_out'")) request.state = "timed_out";
      else if (sql.includes("UPDATE mpesa_status_requests")) {
        request.state = params[2] as string;
        request.result_conversation_id = params[3] as string;
        request.result_code = params[4] as string;
        request.amount_minor = params[5] as string;
        request.receipt_number = params[6] as string;
        request.receiver_shortcode = params[7] as string;
      }
      writes++;
      return { rows: [] };
    },
  };
  const service = new MpesaAsyncStatusService(
    db as never,
    context,
    {} as never,
    {} as never,
  );
  const run = <T>(work: () => Promise<T>) =>
    context.run(
      {
        request_id: "test",
        tenant_id: "amani-school",
        user_id: "anonymous",
        role: "guest",
        permissions: [],
        is_authenticated: false,
        session_id: null,
        client_ip: null,
        user_agent: null,
        method: "POST",
        path: "/payments/status",
        started_at: new Date().toISOString(),
      },
      work,
    );
  const payload = (overrides: Record<string, unknown> = {}) => ({
    Result: {
      ConversationID: "CONVERSATION-1",
      ResultCode: 0,
      ResultParameters: {
        ResultParameter: Object.entries({
          ReceiptNo: "RECEIPT1",
          TransactionAmount: "100.00",
          CreditPartyName: "123456 - School",
          TransactionStatus: "Completed",
          ...overrides,
        }).map(([Key, Value]) => ({ Key, Value })),
      },
    },
  });
  return {
    request,
    service,
    run,
    payload,
    id,
    token,
    writes: () => writes,
    originalDate,
  };
}

test("asynchronous confirmation binds token, conversation, receipt, destination and exact amount", async () => {
  const h = harness();
  await h.run(() =>
    h.service.receive("amani-school", h.id, h.token, h.payload()),
  );
  const result = await h.run(() =>
    h.service.verify("amani-school", "RECEIPT1"),
  );
  assert.equal(result.provider_status, "provider_verified");
  assert.equal(result.amount_minor, "10000");
  await h.run(() =>
    h.service.receive(
      "amani-school",
      h.id,
      h.token,
      h.payload({ TransactionAmount: "900.00" }),
    ),
  );
  assert.equal(h.writes(), 1);
  assert.equal(h.request.amount_minor, "10000");
});
test("forged status tokens and unrelated conversations cannot change a payment", async () => {
  const h = harness();
  await assert.rejects(
    h.run(() =>
      h.service.receive("amani-school", h.id, "b".repeat(64), h.payload()),
    ),
    /Unknown payment verification/,
  );
  const payload = h.payload();
  payload.Result.ConversationID = "WRONG";
  await assert.rejects(
    h.run(() => h.service.receive("amani-school", h.id, h.token, payload)),
    /conversation does not match/,
  );
  assert.equal(h.writes(), 0);
});
test("incomplete or unconfirmed provider results stay in review without posting", async () => {
  const h = harness();
  await h.run(() =>
    h.service.receive(
      "amani-school",
      h.id,
      h.token,
      h.payload({ TransactionStatus: "Pending" }),
    ),
  );
  assert.equal(h.request.state, "review");
  await assert.rejects(
    h.run(() => h.service.verify("amani-school", "RECEIPT1")),
    /statement review is required/,
  );
});
test("a query result with the wrong destination or amount cannot verify settlement", async () => {
  for (const mismatch of [
    { CreditPartyName: "999999 - Another school" },
    { TransactionAmount: "101.00" },
  ]) {
    const h = harness();
    await h.run(() =>
      h.service.receive("amani-school", h.id, h.token, h.payload(mismatch)),
    );
    await assert.rejects(
      h.run(() => h.service.verify("amani-school", "RECEIPT1")),
      /identity or amount did not match/,
    );
  }
});
test("timeouts preserve original request timestamps and remain auditable", async () => {
  const h = harness();
  await h.run(() => h.service.receive("amani-school", h.id, h.token, {}, true));
  assert.equal(h.request.state, "timed_out");
  assert.equal(h.request.created_at, h.originalDate);
});
test("provider errors without settlement parameters are retained for review", async () => {
  const h = harness();
  await h.run(() =>
    h.service.receive("amani-school", h.id, h.token, {
      Result: { ConversationID: "CONVERSATION-1", ResultCode: 1 },
    }),
  );
  assert.equal(h.request.state, "review");
  assert.equal(h.request.result_code, "1");
});
