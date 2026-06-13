import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { PiiEncryptionService } from '../../security/pii-encryption.service';
import { CallbackLogEntity } from '../entities/callback-log.entity';
import { CallbackLogStatus } from '../payments.types';

interface CallbackLogRow {
  id: string;
  tenant_id: string;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_short_code: string | null;
  delivery_id: string;
  request_fingerprint: string;
  event_timestamp: Date | null;
  signature: string | null;
  signature_verified: boolean;
  headers: Record<string, unknown> | null;
  raw_body: string;
  raw_payload: Record<string, unknown> | null;
  raw_payload_encrypted_ref: string | null;
  payload_sha256: string | null;
  source_ip: string | null;
  callback_trust_status: string;
  provider_verified_at: Date | null;
  provider_result_code: string | null;
  provider_result_desc: string | null;
  processing_status: CallbackLogStatus;
  queue_job_id: string | null;
  failure_reason: string | null;
  queued_at: Date | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateCallbackLogInput {
  tenant_id: string;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_short_code?: string | null;
  delivery_id: string;
  request_fingerprint: string;
  event_timestamp: string | null;
  signature: string | null;
  signature_verified: boolean;
  headers: Record<string, unknown>;
  raw_body: string;
  raw_payload: Record<string, unknown> | null;
  raw_payload_encrypted_ref?: string | null;
  payload_sha256?: string | null;
  source_ip: string | null;
  callback_trust_status?: string | null;
}

@Injectable()
export class CallbackLogsRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly piiEncryptionService: PiiEncryptionService,
  ) {}

  async createLog(input: CreateCallbackLogInput): Promise<CallbackLogEntity> {
    const result = await this.executeSql<CallbackLogRow>(
      `
        INSERT INTO callback_logs (
          tenant_id,
          merchant_request_id,
          checkout_request_id,
          mpesa_short_code,
          delivery_id,
          request_fingerprint,
          event_timestamp,
          signature,
          signature_verified,
          headers,
          raw_body,
          raw_payload,
          raw_payload_encrypted_ref,
          payload_sha256,
          source_ip,
          callback_trust_status,
          processing_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::timestamptz,
          $8,
          $9,
          $10::jsonb,
          $11,
          $12::jsonb,
          $13,
          $14,
          $15::inet,
          $16,
          'received'
        )
        RETURNING
          id,
          tenant_id,
          merchant_request_id,
          checkout_request_id,
          mpesa_short_code,
          delivery_id,
          request_fingerprint,
          event_timestamp,
          signature,
          signature_verified,
          headers,
          raw_body,
          raw_payload,
          raw_payload_encrypted_ref,
          payload_sha256,
          source_ip,
          callback_trust_status,
          provider_verified_at,
          provider_result_code,
          provider_result_desc,
          processing_status,
          queue_job_id,
          failure_reason,
          queued_at,
          processed_at,
          created_at,
          updated_at
      `,
      [
        input.tenant_id,
        input.merchant_request_id,
        input.checkout_request_id,
        input.mpesa_short_code ?? null,
        input.delivery_id,
        input.request_fingerprint,
        input.event_timestamp,
        input.signature,
        input.signature_verified,
        JSON.stringify(input.headers ?? {}),
        this.piiEncryptionService.encrypt(
          input.raw_body,
          this.rawBodyAad(input.tenant_id),
        ),
        input.raw_payload ? JSON.stringify(input.raw_payload) : null,
        input.raw_payload_encrypted_ref ?? null,
        input.payload_sha256 ?? null,
        input.source_ip,
        input.callback_trust_status ?? (input.signature_verified ? 'edge_signed' : 'received_unverified'),
      ],
    );

    return this.mapEntity(result.rows[0]);
  }

  async findById(tenantId: string, callbackLogId: string): Promise<CallbackLogEntity | null> {
    const result = await this.executeSql<CallbackLogRow>(
      `
        SELECT
          id,
          tenant_id,
          merchant_request_id,
          checkout_request_id,
          mpesa_short_code,
          delivery_id,
          request_fingerprint,
          event_timestamp,
          signature,
          signature_verified,
          headers,
          raw_body,
          raw_payload,
          raw_payload_encrypted_ref,
          payload_sha256,
          source_ip,
          callback_trust_status,
          provider_verified_at,
          provider_result_code,
          provider_result_desc,
          processing_status,
          queue_job_id,
          failure_reason,
          queued_at,
          processed_at,
          created_at,
          updated_at
        FROM callback_logs
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, callbackLogId],
    );

    return result.rows[0] ? this.mapEntity(result.rows[0]) : null;
  }

  async findLatestByCheckoutRequestId(
    tenantId: string,
    checkoutRequestId: string,
  ): Promise<CallbackLogEntity | null> {
    const result = await this.executeSql<CallbackLogRow>(
      `
        SELECT
          id,
          tenant_id,
          merchant_request_id,
          checkout_request_id,
          mpesa_short_code,
          delivery_id,
          request_fingerprint,
          event_timestamp,
          signature,
          signature_verified,
          headers,
          raw_body,
          raw_payload,
          raw_payload_encrypted_ref,
          payload_sha256,
          source_ip,
          callback_trust_status,
          provider_verified_at,
          provider_result_code,
          provider_result_desc,
          processing_status,
          queue_job_id,
          failure_reason,
          queued_at,
          processed_at,
          created_at,
          updated_at
        FROM callback_logs
        WHERE tenant_id = $1
          AND checkout_request_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, checkoutRequestId],
    );

    return result.rows[0] ? this.mapEntity(result.rows[0]) : null;
  }

  async markQueued(tenantId: string, callbackLogId: string, queueJobId: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'queued', {
      queue_job_id: queueJobId,
      queued_at: 'NOW()',
      failure_reason: null,
    });
  }

  async markProcessing(tenantId: string, callbackLogId: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'processing', {
      failure_reason: null,
    });
  }

  async markProcessed(tenantId: string, callbackLogId: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'processed', {
      processed_at: 'NOW()',
      failure_reason: null,
    });
  }

  async markProcessedByCheckoutRequestId(
    tenantId: string,
    checkoutRequestId: string,
  ): Promise<void> {
    await this.executeSql(
      `
        UPDATE callback_logs
        SET
          processing_status = 'processed',
          processed_at = COALESCE(processed_at, NOW()),
          failure_reason = NULL,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND checkout_request_id = $2
          AND processing_status NOT IN ('processed', 'rejected', 'replayed')
      `,
      [tenantId, checkoutRequestId],
    );
  }

  async markFailed(tenantId: string, callbackLogId: string, reason: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'failed', {
      processed_at: 'NOW()',
      failure_reason: reason,
    });
  }

  async markFailedByCheckoutRequestId(
    tenantId: string,
    checkoutRequestId: string,
    reason: string,
  ): Promise<void> {
    await this.executeSql(
      `
        UPDATE callback_logs
        SET
          processing_status = 'failed',
          processed_at = COALESCE(processed_at, NOW()),
          failure_reason = $3,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND checkout_request_id = $2
          AND processing_status NOT IN ('processed', 'rejected', 'replayed')
      `,
      [tenantId, checkoutRequestId, reason],
    );
  }

  async markRejected(tenantId: string, callbackLogId: string, reason: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'rejected', {
      processed_at: 'NOW()',
      failure_reason: reason,
    });
  }

  async markReplayed(tenantId: string, callbackLogId: string): Promise<void> {
    await this.markStatus(tenantId, callbackLogId, 'replayed', {
      processed_at: 'NOW()',
      failure_reason: null,
    });
  }

  async markProviderVerified(
    tenantId: string,
    callbackLogId: string,
    input: {
      result_code?: string | null;
      result_desc?: string | null;
    } = {},
  ): Promise<void> {
    await this.executeSql(
      `
        UPDATE callback_logs
        SET
          callback_trust_status = 'provider_verified',
          provider_verified_at = NOW(),
          provider_result_code = $3,
          provider_result_desc = $4,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, callbackLogId, input.result_code ?? null, input.result_desc ?? null],
    );
  }

  async markProviderFailed(
    tenantId: string,
    callbackLogId: string,
    input: {
      result_code?: string | null;
      result_desc?: string | null;
    } = {},
  ): Promise<void> {
    await this.executeSql(
      `
        UPDATE callback_logs
        SET
          callback_trust_status = 'provider_failed',
          provider_result_code = $3,
          provider_result_desc = $4,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, callbackLogId, input.result_code ?? null, input.result_desc ?? null],
    );
  }

  private async markStatus(
    tenantId: string,
    callbackLogId: string,
    status: CallbackLogStatus,
    extras: Record<string, string | null>,
  ): Promise<void> {
    const assignments = [`processing_status = $3`, `updated_at = NOW()`];
    const values: Array<string | null> = [tenantId, callbackLogId, status];
    let parameterIndex = 4;

    for (const [column, value] of Object.entries(extras)) {
      if (value === 'NOW()') {
        assignments.push(`${column} = NOW()`);
        continue;
      }

      assignments.push(`${column} = $${parameterIndex}`);
      values.push(value);
      parameterIndex += 1;
    }

    await this.executeSql(
      `
        UPDATE callback_logs
        SET ${assignments.join(', ')}
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      values,
    );
  }

  private mapEntity(row: CallbackLogRow): CallbackLogEntity {
    return Object.assign(new CallbackLogEntity(), {
      ...row,
      raw_body: '[encrypted]',
      headers: row.headers ?? {},
      raw_payload: row.raw_payload ?? null,
    });
  }

  private rawBodyAad(tenantId: string): string {
    return `callback_logs:${tenantId}:raw_body`;
  }
}
