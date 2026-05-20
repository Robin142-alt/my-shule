import { BaseEntity } from '../../../database/entities/base.entity';
import { CallbackLogStatus } from '../payments.types';

export class CallbackLogEntity extends BaseEntity {
  merchant_request_id!: string | null;
  checkout_request_id!: string | null;
  mpesa_short_code!: string | null;
  delivery_id!: string;
  request_fingerprint!: string;
  event_timestamp!: Date | null;
  signature!: string | null;
  signature_verified!: boolean;
  headers!: Record<string, unknown>;
  raw_body!: string;
  raw_payload!: Record<string, unknown> | null;
  raw_payload_encrypted_ref!: string | null;
  payload_sha256!: string | null;
  source_ip!: string | null;
  callback_trust_status!: string;
  provider_verified_at!: Date | null;
  provider_result_code!: string | null;
  provider_result_desc!: string | null;
  processing_status!: CallbackLogStatus;
  queue_job_id!: string | null;
  failure_reason!: string | null;
  queued_at!: Date | null;
  processed_at!: Date | null;
}
