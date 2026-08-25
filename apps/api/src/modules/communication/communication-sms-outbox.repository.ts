import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface ClaimedCommunicationSms {
  id: string;
  tenant_id: string;
  recipient_phone: string;
  message: string;
  sent_by: string | null;
  attempt_count: number;
  dispatch_key: string;
  lease_token: string;
}

interface ClaimedCommunicationSmsLease {
  id: string;
  tenant_id: string;
  attempt_count: number;
  dispatch_key: string;
  lease_token: string;
}

interface SmsOutcomeMetadata {
  attempt_count: number;
  recipient_phone_last4: string | null;
  requested_by_user_id: string | null;
}

@Injectable()
export class CommunicationSmsOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claimDueBatch(batchSize: number, leaseMs: number): Promise<ClaimedCommunicationSms[]> {
    const leases = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<ClaimedCommunicationSmsLease[]>(
        `
          SELECT
            id::text,
            tenant_id,
            attempt_count,
            dispatch_key,
            lease_token::text
          FROM app.claim_communication_sms_outbox($1::integer, $2::integer)
        `,
        batchSize,
        leaseMs,
      );

      return rows.map((row) => ({
        ...row,
        attempt_count: Number(row.attempt_count ?? 0),
      }));
    });

    const messages: ClaimedCommunicationSms[] = [];

    for (const lease of leases) {
      try {
        const message = await this.prisma.executeWithTenant(lease.tenant_id, null, async (tx) => {
          const rows = await tx.$queryRawUnsafe<Array<{
            id: string;
            tenant_id: string;
            recipient_phone: string;
            message: string;
            sent_by: string | null;
          }>>(
            `
              SELECT
                id::text,
                tenant_id,
                recipient_phone,
                message,
                sent_by::text
              FROM communication_sms_outbox
              WHERE tenant_id = $1
                AND id = $2::uuid
                AND lower(status) = 'processing'
                AND lease_token = $3::uuid
                AND dispatch_started_at IS NULL
              LIMIT 1
            `,
            lease.tenant_id,
            lease.id,
            lease.lease_token,
          );

          return rows[0] ?? null;
        });

        if (message) {
          messages.push({ ...message, ...lease });
        } else {
          await this.releaseUnstartedClaim(
            lease,
            'Claimed SMS payload was unavailable before provider dispatch started',
          );
        }
      } catch (error) {
        await this.releaseUnstartedClaim(
          lease,
          'Claimed SMS payload could not be loaded before provider dispatch started',
        ).catch(() => undefined);
        throw error;
      }
    }

    return messages;
  }

  async markDispatchStarted(
    input: { tenant_id: string; sms_id: string; lease_token: string },
    tx: any,
  ): Promise<boolean> {
    const rows = await tx.$queryRawUnsafe(
      `
        UPDATE communication_sms_outbox
        SET dispatch_started_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND lower(status) = 'processing'
          AND lease_token = $3::uuid
          AND dispatch_started_at IS NULL
        RETURNING id::text
      `,
      input.tenant_id,
      input.sms_id,
      input.lease_token,
    ) as Array<{ id: string }>;

    return rows.length === 1;
  }

  async markProviderAccepted(
    input: {
      tenant_id: string;
      sms_id: string;
      provider_id: string;
      provider_code: string;
      provider_reference: string | null;
      lease_token: string;
      metadata: SmsOutcomeMetadata;
    },
    tx: any,
  ): Promise<boolean> {
    const rows = await tx.$queryRawUnsafe(
      `
        WITH updated_sms AS (
          UPDATE communication_sms_outbox
          SET status = 'Accepted',
              provider_id = $3::uuid,
              provider_code = $4,
              provider_reference = $5,
              provider_accepted_at = NOW(),
              failed_at = NULL,
              last_error = NULL,
              lease_expires_at = NULL,
              lease_token = NULL,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND lower(status) = 'processing'
            AND lease_token = $6::uuid
          RETURNING id, tenant_id
        ),
        inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id,
            actor_user_id,
            action,
            module,
            entity_type,
            entity_id,
            resource_type,
            resource_id,
            aggregate_id,
            metadata,
            occurred_at,
            created_at,
            updated_at
          )
          SELECT
            updated_sms.tenant_id,
            NULL,
            'communication.sms.provider_accepted',
            'communication',
            'communication_sms',
            updated_sms.id::text,
            'communication_sms',
            updated_sms.id,
            updated_sms.id,
            $7::jsonb,
            NOW(),
            NOW(),
            NOW()
          FROM updated_sms
          RETURNING id
        )
        SELECT id::text
        FROM updated_sms
      `,
      input.tenant_id,
      input.sms_id,
      input.provider_id,
      input.provider_code,
      input.provider_reference,
      input.lease_token,
      JSON.stringify({
        ...input.metadata,
        delivery_status: 'provider_accepted',
        provider_id: input.provider_id,
        provider_code: input.provider_code,
        provider_reference: input.provider_reference,
      }),
    ) as Array<{ id: string }>;

    return rows.length === 1;
  }

  async markProviderAcceptanceUnknown(
    input: {
      tenant_id: string;
      sms_id: string;
      provider_id: string;
      provider_code: string;
      provider_reference: string | null;
      lease_token: string;
      last_error: string;
      metadata: SmsOutcomeMetadata;
    },
    tx: any,
  ): Promise<boolean> {
    const rows = await tx.$queryRawUnsafe(
      `
        WITH updated_sms AS (
          UPDATE communication_sms_outbox
          SET status = 'DeliveryUnknown',
              provider_id = $3::uuid,
              provider_code = $4,
              provider_reference = $5,
              provider_accepted_at = COALESCE(provider_accepted_at, NOW()),
              delivery_unknown_at = NOW(),
              last_error = $7,
              lease_expires_at = NULL,
              lease_token = NULL,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND lower(status) = 'processing'
            AND lease_token = $6::uuid
            AND dispatch_started_at IS NOT NULL
          RETURNING id, tenant_id
        ),
        inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id,
            actor_user_id,
            action,
            module,
            entity_type,
            entity_id,
            resource_type,
            resource_id,
            aggregate_id,
            metadata,
            occurred_at,
            created_at,
            updated_at
          )
          SELECT
            updated_sms.tenant_id,
            NULL,
            'communication.sms.provider_acceptance_requires_reconciliation',
            'communication',
            'communication_sms',
            updated_sms.id::text,
            'communication_sms',
            updated_sms.id,
            updated_sms.id,
            $8::jsonb,
            NOW(),
            NOW(),
            NOW()
          FROM updated_sms
          RETURNING id
        )
        SELECT id::text
        FROM updated_sms
      `,
      input.tenant_id,
      input.sms_id,
      input.provider_id,
      input.provider_code,
      input.provider_reference,
      input.lease_token,
      input.last_error,
      JSON.stringify({
        ...input.metadata,
        delivery_status: 'unknown',
        provider_acceptance_recorded: true,
        provider_id: input.provider_id,
        provider_code: input.provider_code,
        provider_reference: input.provider_reference,
        last_error: input.last_error,
      }),
    ) as Array<{ id: string }>;

    return rows.length === 1;
  }

  async markDeliveryFailure(
    input: {
      tenant_id: string;
      sms_id: string;
      outcome: 'retry' | 'failed' | 'unknown';
      lease_token: string;
      next_attempt_at: string | null;
      last_error: string;
      metadata: SmsOutcomeMetadata;
    },
    tx: any,
  ): Promise<boolean> {
    const rows = await tx.$queryRawUnsafe(
      `
        WITH updated_sms AS (
          UPDATE communication_sms_outbox
          SET status = CASE
                WHEN $3::text = 'failed' THEN 'Failed'
                WHEN $3::text = 'unknown' THEN 'DeliveryUnknown'
                ELSE 'Pending'
              END,
              available_at = CASE
                WHEN $3::text = 'retry' THEN $4::timestamptz
                ELSE available_at
              END,
              failed_at = CASE WHEN $3::text = 'failed' THEN NOW() ELSE NULL END,
              delivery_unknown_at = CASE WHEN $3::text = 'unknown' THEN NOW() ELSE NULL END,
              last_error = $5,
              lease_expires_at = NULL,
              lease_token = NULL,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND lower(status) = 'processing'
            AND lease_token = $6::uuid
          RETURNING id, tenant_id
        ),
        inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id,
            actor_user_id,
            action,
            module,
            entity_type,
            entity_id,
            resource_type,
            resource_id,
            aggregate_id,
            metadata,
            occurred_at,
            created_at,
            updated_at
          )
          SELECT
            updated_sms.tenant_id,
            NULL,
            CASE
              WHEN $3::text = 'failed' THEN 'communication.sms.delivery_failed'
              WHEN $3::text = 'unknown' THEN 'communication.sms.delivery_unknown'
              ELSE 'communication.sms.retry_scheduled'
            END,
            'communication',
            'communication_sms',
            updated_sms.id::text,
            'communication_sms',
            updated_sms.id,
            updated_sms.id,
            $7::jsonb,
            NOW(),
            NOW(),
            NOW()
          FROM updated_sms
          RETURNING id
        )
        SELECT id::text
        FROM updated_sms
      `,
      input.tenant_id,
      input.sms_id,
      input.outcome,
      input.next_attempt_at,
      input.last_error,
      input.lease_token,
      JSON.stringify({
        ...input.metadata,
        delivery_status: input.outcome === 'retry' ? 'retry_scheduled' : input.outcome,
        next_attempt_at: input.next_attempt_at,
        last_error: input.last_error,
      }),
    ) as Array<{ id: string }>;

    return rows.length === 1;
  }

  private async releaseUnstartedClaim(
    lease: ClaimedCommunicationSmsLease,
    reason: string,
  ): Promise<void> {
    await this.prisma.executeWithTenant(lease.tenant_id, null, async (tx) => {
      await tx.$queryRawUnsafe(
        `
          WITH released_sms AS (
            UPDATE communication_sms_outbox
            SET status = 'Pending',
                available_at = NOW() + INTERVAL '5 seconds',
                last_error = $4,
                lease_expires_at = NULL,
                lease_token = NULL,
                dispatch_started_at = NULL,
                updated_at = NOW()
            WHERE tenant_id = $1
              AND id = $2::uuid
              AND lower(status) = 'processing'
              AND lease_token = $3::uuid
              AND dispatch_started_at IS NULL
            RETURNING id, tenant_id
          )
          INSERT INTO audit_logs (
            tenant_id,
            actor_user_id,
            action,
            module,
            entity_type,
            entity_id,
            resource_type,
            resource_id,
            aggregate_id,
            metadata,
            occurred_at,
            created_at,
            updated_at
          )
          SELECT
            released_sms.tenant_id,
            NULL,
            'communication.sms.claim_released',
            'communication',
            'communication_sms',
            released_sms.id::text,
            'communication_sms',
            released_sms.id,
            released_sms.id,
            jsonb_build_object(
              'attempt_count', $5::integer,
              'delivery_status', 'retry_scheduled',
              'reason', $4::text
            ),
            NOW(),
            NOW(),
            NOW()
          FROM released_sms
        `,
        lease.tenant_id,
        lease.id,
        lease.lease_token,
        reason,
        lease.attempt_count,
      );
    });
  }
}
