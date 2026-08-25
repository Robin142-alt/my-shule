import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';

export interface SendSmsParams {
  tenantId: string;
  userId: string;
  recipientPhone: string;
  message: string;
  idempotencyKey?: string | null;
}

@Injectable()
export class CommunicationSmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly agp: AgpExecutionService,
  ) {}

  async sendSms(params: SendSmsParams) {
    const smsId = randomUUID();
    const recipientPhone = this.normalizeRecipient(params.recipientPhone);
    const message = this.normalizeMessage(params.message);
    const dispatchKey = this.createDispatchKey(params.tenantId, params.idempotencyKey, smsId);

    return this.agp.execute({
      actionName: 'SMS_QUEUED',
      requiredCapability: 'school_sms:send',
      aggregateType: 'COMMUNICATION_SMS',
      aggregateId: smsId,
      governanceRecordedInHandler: true,
      handler: async () => this.prisma.executeWithTenant(
        params.tenantId,
        params.userId,
        async (tx) => {
          const rows = await tx.$queryRawUnsafe<Array<{
            id: string;
            status: string;
            recipient_phone: string;
            message: string;
            created: boolean;
          }>>(
            `
              INSERT INTO communication_sms_outbox (
                id,
                tenant_id,
                recipient_phone,
                message,
                status,
                sent_by,
                dispatch_key,
                available_at,
                created_at,
                updated_at
              )
              VALUES ($1::uuid, $2, $3, $4, 'Pending', $5::uuid, $6, NOW(), NOW(), NOW())
              ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
              SET dispatch_key = EXCLUDED.dispatch_key
              RETURNING
                id::text,
                status,
                recipient_phone,
                message,
                (xmax = 0) AS created
            `,
            smsId,
            params.tenantId,
            recipientPhone,
            message,
            params.userId,
            dispatchKey,
          );

          const queued = rows[0];

          if (!queued || queued.recipient_phone !== recipientPhone || queued.message !== message) {
            throw new BadRequestException(
              'The idempotency key was already used for a different SMS request',
            );
          }

          await this.eventPublisher.publish(
            {
              tenant_id: params.tenantId,
              event_key: `communication.sms.queued:${queued.id}`,
              event_name: 'communication.sms.queued',
              aggregate_type: 'communication_sms',
              aggregate_id: queued.id,
              actor_user_id: params.userId,
              payload: {
                tenant_id: params.tenantId,
                sms_id: queued.id,
                recipient_phone_last4: this.phoneLast4(recipientPhone),
                sent_by: params.userId,
                queued_at: new Date().toISOString(),
              },
            },
            tx,
          );

          if (queued.created) {
            await tx.$executeRawUnsafe(
              `
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
                VALUES (
                  $1,
                  $2::uuid,
                  'SMS_QUEUED',
                  'communication',
                  'communication_sms',
                  $3,
                  'communication_sms',
                  $3::uuid,
                  $3::uuid,
                  $4::jsonb,
                  NOW(),
                  NOW(),
                  NOW()
                )
              `,
              params.tenantId,
              params.userId,
              queued.id,
              JSON.stringify({
                status: 'SUCCESS',
                recipient_phone_last4: this.phoneLast4(recipientPhone),
                dispatch_key: dispatchKey,
              }),
            );
          }

          return {
            success: true,
            messageId: queued?.id ?? smsId,
            status: queued?.status ?? 'Pending',
          };
        },
      ),
    });
  }

  async getSms(tenantId: string, limit = 50) {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const result = await this.prisma.query(
      `
        SELECT
          id::text,
          '***' || right(regexp_replace(recipient_phone, '\\D', '', 'g'), 4) AS recipient_phone,
          left(regexp_replace(message, '[\\r\\n]+', ' ', 'g'), 120) AS message_preview,
          status,
          provider_code,
          attempt_count,
          last_error,
          provider_accepted_at,
          failed_at,
          created_at,
          updated_at
        FROM communication_sms_outbox
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [tenantId, boundedLimit],
    );
    return { data: result.rows };
  }

  private normalizeRecipient(value: string): string {
    const compact = value.trim().replace(/[\s().-]+/g, '');

    if (/^0(?:1|7)\d{8}$/.test(compact)) {
      return `+254${compact.slice(1)}`;
    }

    if (/^254(?:1|7)\d{8}$/.test(compact)) {
      return `+${compact}`;
    }

    if (/^\+[1-9]\d{7,14}$/.test(compact)) {
      return compact;
    }

    throw new BadRequestException('A valid SMS recipient phone number is required');
  }

  private normalizeMessage(value: string): string {
    const message = value.trim();

    if (!message) {
      throw new BadRequestException('SMS message is required');
    }

    if (message.length > 1_600) {
      throw new BadRequestException('SMS message exceeds the supported length');
    }

    return message;
  }

  private phoneLast4(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits ? digits.slice(-4) : null;
  }

  private createDispatchKey(
    tenantId: string,
    idempotencyKey: string | null | undefined,
    smsId: string,
  ): string {
    const normalized = idempotencyKey?.trim();

    if (!normalized) {
      return `communication-sms:${smsId}`;
    }

    if (normalized.length > 200) {
      throw new BadRequestException('SMS idempotency key is too long');
    }

    const digest = createHash('sha256')
      .update(`${tenantId}\u0000${normalized}`)
      .digest('hex');
    return `communication-sms-idempotency:${digest}`;
  }
}
