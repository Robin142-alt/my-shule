import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCollectionInput } from "./collection-payment.types";

const payment = {
  provider_code: "safaricom",
  provider_transaction_id: "ABC123",
  destination_account: "123456",
  amount_minor: "15000",
  currency_code: "KES",
  account_reference: "ADM-001",
  occurred_at: "2026-09-01T10:00:00+03:00",
};
test("collection envelope uses exact integer money and a canonical provider identity", () => {
  assert.equal(normalizeCollectionInput(payment).amount_minor, "15000");
  assert.equal(
    normalizeCollectionInput(payment).occurred_at,
    "2026-09-01T07:00:00.000Z",
  );
});
test("collection envelope rejects fractional, negative, zero or overflowing minor amounts", () => {
  for (const amount_minor of ["1.5", "-1", "0", "1e4", "9223372036854775808"]) {
    assert.throws(() => normalizeCollectionInput({ ...payment, amount_minor }));
  }
});
test("collection envelope rejects unknown provider, missing identity and unsupported currency", () => {
  assert.throws(() =>
    normalizeCollectionInput({ ...payment, provider_code: "unknown" }),
  );
  assert.throws(() =>
    normalizeCollectionInput({ ...payment, provider_transaction_id: "" }),
  );
  assert.throws(() =>
    normalizeCollectionInput({ ...payment, currency_code: "USD" }),
  );
});
