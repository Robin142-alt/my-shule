import { BadRequestException } from "@nestjs/common";

export type CollectionProviderCode =
  | "safaricom"
  | "equity"
  | "kcb"
  | "coop"
  | "other_bank";
export type CollectionChannelKind =
  | "mpesa_paybill"
  | "bank_paybill"
  | "bank_account";
export type CollectionConnectionMode = "daraja" | "statement";

// Capabilities describe implemented, verifiable collection contracts. Bank APIs
// require bank-specific merchant onboarding; a filled-in form is not a connection.
export const COLLECTION_PROVIDERS = [
  {
    code: "safaricom",
    name: "Safaricom M-PESA",
    channel_kinds: ["mpesa_paybill"],
    connection_modes: ["daraja", "statement"],
    description:
      "School-owned Paybill. Automatic collection requires Daraja registration and verified transactions. Statement review remains available.",
    credential_fields: [
      {
        key: "consumer_key",
        label: "Daraja consumer key",
        required: true,
        secret: true,
      },
      {
        key: "consumer_secret",
        label: "Daraja consumer secret",
        required: true,
        secret: true,
      },
      {
        key: "passkey",
        label: "Lipa na M-PESA passkey",
        required: true,
        secret: true,
      },
      {
        key: "initiator_name",
        label: "Transaction status initiator",
        required: true,
        secret: false,
      },
      {
        key: "security_credential",
        label: "Transaction status security credential",
        required: true,
        secret: true,
      },
    ],
  },
  ...[
    ["equity", "Equity Bank"],
    ["kcb", "KCB Bank"],
    ["coop", "Co-operative Bank"],
    ["other_bank", "Other bank"],
  ].map(([code, name]) => ({
    code,
    name,
    channel_kinds: ["bank_paybill", "bank_account"],
    connection_modes: ["statement"],
    description:
      "Money goes directly to the school account. Use statement reconciliation with Principal review. Automatic bank collection requires a bank-approved adapter and merchant onboarding.",
    credential_fields: [],
  })),
] as const;

export function collectionProvider(code: string) {
  const provider = COLLECTION_PROVIDERS.find((item) => item.code === code);
  if (!provider)
    throw new BadRequestException("Choose a supported payment provider");
  return provider;
}
