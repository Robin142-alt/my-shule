import { BadRequestException } from "@nestjs/common";
import { type ProviderAssessment } from './bank-provider.catalog';
import { BANK_PROVIDER_REGISTRY } from './providers/registered-bank-providers';

// Registration validates codes; the financial engine has no fixed bank-name union.
export type CollectionProviderCode = string;
export type CollectionChannelKind =
  | "mpesa_paybill"
  | "bank_paybill"
  | "bank_account";
export type CollectionConnectionMode = "daraja" | "statement" | "bank_api";
export interface CollectionProviderDefinition {
  code:string;name:string;description:string;channel_kinds:readonly string[];connection_modes:readonly string[];
  credential_fields:readonly {key:string;label:string;required:boolean;secret:boolean;description?:string;multiline?:boolean}[];
  assessment?:ProviderAssessment;
  platform_managed_credentials?:boolean;
}

// Capabilities describe implemented, verifiable collection contracts. Bank APIs
// require bank-specific merchant onboarding; a filled-in form is not a connection.
const NON_BANK_PROVIDERS: readonly CollectionProviderDefinition[] = [
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
        required: false,
        description: "Required only for M-PESA Express (STK prompts). Leave blank for C2B Paybill automatic collections.",
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
];

export function listCollectionProviders(): readonly CollectionProviderDefinition[] {
  return [NON_BANK_PROVIDERS[0],...BANK_PROVIDER_REGISTRY.definitions(),...NON_BANK_PROVIDERS.slice(1)];
}
export const COLLECTION_PROVIDERS = listCollectionProviders();

export function collectionProvider(code: string) {
  const provider = listCollectionProviders().find((item) => item.code === code);
  if (!provider)
    throw new BadRequestException("Choose a supported payment provider");
  return provider;
}
