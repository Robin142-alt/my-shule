import type { IncomingHttpHeaders } from 'node:http';
import type { CollectionPaymentInput } from '../collection-payment.types';
import type { PaymentChannelRevision } from '../../tenant-finance/payment-channel-workflow.types';

export interface CollectionAdapterChannel {
  revision: PaymentChannelRevision;
  credentials: Record<string, string>;
}
export interface CollectionVerification {
  conversation_id: string;
  settled: boolean;
  provider_transaction_id: string;
  destination_account: string;
  amount_minor: string;
  currency_code: string;
  account_reference?: string;
}
/** Adapters own provider protocol and evidence; they never write financial tables. */
export interface CollectionAdapter {
  readonly provider: string;
  authenticate(channel: CollectionAdapterChannel, rawBody: string, headers: IncomingHttpHeaders): void;
  parse(payload: unknown): CollectionPaymentInput;
  requestVerification(channel: CollectionAdapterChannel, payment: CollectionPaymentInput,
    urls: { result: string; timeout: string }): Promise<{ conversation_id: string }>;
  parseVerification(payload: unknown): CollectionVerification;
}

export function verificationMatches(payment: CollectionPaymentInput, evidence: CollectionVerification, conversation: string): boolean {
  return evidence.settled && evidence.conversation_id === conversation &&
    evidence.provider_transaction_id === payment.provider_transaction_id &&
    evidence.destination_account === payment.destination_account &&
    evidence.amount_minor === payment.amount_minor && evidence.currency_code === payment.currency_code &&
    (evidence.account_reference === undefined || evidence.account_reference === payment.account_reference);
}
