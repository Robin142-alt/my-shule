import { BadRequestException } from "@nestjs/common";
import { collectionProvider } from "../tenant-finance/payment-provider.catalog";

export interface CollectionPaymentInput {
  provider_code: string;
  provider_transaction_id: string;
  destination_account: string;
  amount_minor: string;
  currency_code: string;
  account_reference: string;
  occurred_at: string;
}
export function normalizeCollectionInput(
  input: CollectionPaymentInput,
): CollectionPaymentInput {
  collectionProvider(input.provider_code);
  if (
    !/^\d{1,19}$/.test(input.amount_minor) ||
    BigInt(input.amount_minor) <= 0n ||
    BigInt(input.amount_minor) > 9223372036854775807n
  )
    throw new BadRequestException(
      "Payment amount must be a positive integer minor-unit amount",
    );
  if (input.currency_code !== "KES")
    throw new BadRequestException("Only KES collections are supported");
  for (const key of [
    "provider_transaction_id",
    "destination_account",
  ] as const) {
    if (
      typeof input[key] !== "string" ||
      !input[key].trim() ||
      input[key].length > 100
    )
      throw new BadRequestException(`Invalid ${key}`);
  }
  if (
    typeof input.account_reference !== "string" ||
    input.account_reference.length > 120
  )
    throw new BadRequestException("Invalid student account reference");
  const occurred = new Date(input.occurred_at);
  if (
    !Number.isFinite(occurred.getTime()) ||
    occurred.getTime() > Date.now() + 300000
  )
    throw new BadRequestException("Invalid transaction timestamp");
  return {
    ...input,
    provider_transaction_id: input.provider_transaction_id.trim().toUpperCase(),
    destination_account: input.destination_account.trim(),
    amount_minor: BigInt(input.amount_minor).toString(),
    account_reference: input.account_reference.trim(),
    occurred_at: occurred.toISOString(),
  };
}
