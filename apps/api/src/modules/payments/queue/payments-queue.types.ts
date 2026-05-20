export interface EnqueuePaymentJobData {
  tenant_id: string;
  checkout_request_id: string;
  callback_log_id?: string | null;
  request_id: string;
  trace_id?: string;
  parent_span_id?: string | null;
  user_id?: string;
  role?: string | null;
  session_id?: string | null;
}

export interface ProcessPaymentJobData extends EnqueuePaymentJobData {
  enqueued_at: string;
}

export interface ProcessPaymentJobResult {
  job_id: string;
  tenant_id: string;
  checkout_request_id: string;
  callback_log_id: string | null;
  payment_intent_id: string | null;
  mpesa_transaction_id: string | null;
  ledger_transaction_id: string | null;
  status: 'completed' | 'failed' | 'duplicate';
  processed_at: string;
  failure_reason?: string | null;
}

export interface EnqueuePaymentJobResult {
  job_id: string;
  queue_name: string;
  tenant_id: string;
  checkout_request_id: string;
  deduplicated: boolean;
  state: string;
}

export interface EnqueueMpesaVerificationJobData {
  tenant_id: string;
  verification_job_id: string;
  callback_log_id?: string | null;
  checkout_request_id?: string | null;
  c2b_payment_id?: string | null;
  mpesa_receipt_number?: string | null;
  request_id: string;
  trace_id?: string;
  parent_span_id?: string | null;
  user_id?: string;
  role?: string | null;
  session_id?: string | null;
}

export interface ProcessMpesaVerificationJobData extends EnqueueMpesaVerificationJobData {
  enqueued_at: string;
}

export interface ProcessMpesaVerificationJobResult {
  job_id: string;
  tenant_id: string;
  verification_job_id: string;
  callback_log_id: string | null;
  checkout_request_id: string | null;
  c2b_payment_id: string | null;
  c2b_payment_status?: string | null;
  provider_status: 'provider_verified' | 'provider_failed' | 'provider_pending';
  payment_queue_job_id: string | null;
  processed_at: string;
  failure_reason?: string | null;
}

export interface EnqueueMpesaVerificationJobResult {
  job_id: string;
  queue_name: string;
  tenant_id: string;
  verification_job_id: string;
  deduplicated: boolean;
  state: string;
}

export type PaymentsQueueJobData = ProcessPaymentJobData | ProcessMpesaVerificationJobData;
export type PaymentsQueueJobResult =
  | ProcessPaymentJobResult
  | ProcessMpesaVerificationJobResult;
