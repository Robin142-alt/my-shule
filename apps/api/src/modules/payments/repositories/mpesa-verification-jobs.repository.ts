import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { PiiEncryptionService } from '../../security/pii-encryption.service';

interface MpesaVerificationJobRow {
  id: string;
  tenant_id: string;
  transaction_status: string;
}

@Injectable()
export class MpesaVerificationJobsRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly piiEncryptionService: PiiEncryptionService,
  ) {}

  async createForStkCallback(input: {
    tenant_id: string;
    callback_log_id: string;
    checkout_request_id: string;
    mpesa_receipt_number?: string | null;
    next_retry_at?: string | null;
  }): Promise<MpesaVerificationJobRow> {
    const result = await this.databaseService.query<MpesaVerificationJobRow>(
      `
        INSERT INTO mpesa_verification_jobs (
          tenant_id,
          callback_log_id,
          checkout_request_id,
          mpesa_receipt_number,
          transaction_status,
          next_retry_at
        )
        VALUES ($1, $2::uuid, $3, $4, 'pending', COALESCE($5::timestamptz, NOW()))
        RETURNING id, tenant_id, transaction_status
      `,
      [
        input.tenant_id,
        input.callback_log_id,
        input.checkout_request_id,
        input.mpesa_receipt_number ?? null,
        input.next_retry_at ?? null,
      ],
    );

    return result.rows[0];
  }

  async createForC2bConfirmation(input: {
    tenant_id: string;
    c2b_payment_id: string;
    mpesa_receipt_number: string;
    next_retry_at?: string | null;
  }): Promise<MpesaVerificationJobRow> {
    const result = await this.databaseService.query<MpesaVerificationJobRow>(
      `
        INSERT INTO mpesa_verification_jobs (
          tenant_id,
          c2b_payment_id,
          mpesa_receipt_number,
          transaction_status,
          next_retry_at
        )
        VALUES ($1, $2::uuid, $3, 'pending', COALESCE($4::timestamptz, NOW()))
        RETURNING id, tenant_id, transaction_status
      `,
      [
        input.tenant_id,
        input.c2b_payment_id,
        input.mpesa_receipt_number,
        input.next_retry_at ?? null,
      ],
    );

    return result.rows[0];
  }

  async markProviderResponse(input: {
    tenant_id: string;
    verification_job_id: string;
    transaction_status: 'provider_verified' | 'provider_failed' | 'retry_scheduled' | 'manual_review';
    provider_response: Record<string, unknown>;
    next_retry_at?: string | null;
  }): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE mpesa_verification_jobs
        SET
          transaction_status = $3,
          verification_attempts = verification_attempts + 1,
          last_provider_response_encrypted = $4,
          verified_at = CASE WHEN $3 = 'provider_verified' THEN NOW() ELSE verified_at END,
          failed_at = CASE WHEN $3 = 'provider_failed' THEN NOW() ELSE failed_at END,
          next_retry_at = $5::timestamptz,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [
        input.tenant_id,
        input.verification_job_id,
        input.transaction_status,
        this.piiEncryptionService.encrypt(
          JSON.stringify(input.provider_response),
          `mpesa_verification_jobs:${input.tenant_id}:${input.verification_job_id}:provider_response`,
        ),
        input.next_retry_at ?? null,
      ],
    );
  }
}
