import assert from "node:assert/strict";
import test from "node:test";
import { CollectionSuspenseService } from "./collection-suspense.service";
import type { CollectionPayment } from "./collection-payments.service";
import type { PostFinancialTransactionInput } from "../finance/finance.types";

test("unmatched receipts recognize cash and liability; matching cancels only the suspense entry", async () => {
  const posted: PostFinancialTransactionInput[] = [];
  const service = new CollectionSuspenseService(
    { query: async () => ({ rows: [] }) } as never,
    { requireStore: () => ({ tenant_id: "school-a" }) } as never,
    {
      findByCode: async (_tenant: string, code: string) => ({
        id: code,
        category: "liability",
        normal_balance: "credit",
        currency_code: "KES",
      }),
    } as never,
    {
      postTransaction: async (input: PostFinancialTransactionInput) => {
        posted.push(input);
        return { transaction_id: `ledger-${posted.length}` };
      },
    } as never,
  );
  const payment = {
    id: "collection-1",
    tenant_id: "school-a",
    provider_code: "equity",
    provider_transaction_id: "BANK-1",
    amount_minor: "12345",
    occurred_at: new Date().toISOString(),
    suspense_transaction_id: null,
    suspense_release_transaction_id: null,
    asset_account_code: "1125-SCHOOL-COLLECTIONS",
  } as CollectionPayment;
  assert.equal(await service.release(payment), null);
  const suspense = await service.recognize(payment);
  assert.equal(posted.length, 1);
  assert.equal(
    await service.recognize({ ...payment, suspense_transaction_id: suspense }),
    suspense,
  );
  const released = await service.release({
    ...payment,
    suspense_transaction_id: suspense,
  });
  assert.equal(
    await service.release({
      ...payment,
      suspense_transaction_id: suspense,
      suspense_release_transaction_id: released,
    }),
    released,
  );
  assert.equal(posted.length, 2);
  const balances = new Map<string, bigint>();
  for (const transaction of posted) {
    let net = 0n;
    for (const entry of transaction.entries) {
      const signed =
        BigInt(entry.amount_minor) * (entry.direction === "debit" ? 1n : -1n);
      balances.set(
        entry.account_id,
        (balances.get(entry.account_id) ?? 0n) + signed,
      );
      net += signed;
    }
    assert.equal(net, 0n);
  }
  assert.equal(posted[0].entries[0].direction, "debit");
  assert.equal(posted[0].entries[0].account_id, "1125-SCHOOL-COLLECTIONS");
  assert.equal(posted[1].entries[0].account_id, "1125-SCHOOL-COLLECTIONS");
  assert.equal(posted[0].entries[1].direction, "credit");
  assert.ok([...balances.values()].every((value) => value === 0n));
  await assert.rejects(
    () => service.recognize({ ...payment, tenant_id: "school-b" }),
    /school mismatch/,
  );
});
