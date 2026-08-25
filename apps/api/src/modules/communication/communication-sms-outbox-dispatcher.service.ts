import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AUTH_ANONYMOUS_USER_ID,
  AUTH_SYSTEM_ROLE,
} from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import {
  SmsDispatchService,
  SmsProviderDispatchError,
} from '../integrations/sms-dispatch.service';
import { CommunicationSchemaService } from './communication-schema.service';
import {
  ClaimedCommunicationSms,
  CommunicationSmsOutboxRepository,
} from './communication-sms-outbox.repository';

class InvalidQueuedSmsError extends Error {}

@Injectable()
export class CommunicationSmsOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationSmsOutboxDispatcherService.name);
  private dispatchTimer: ReturnType<typeof setInterval> | null = null;
  private dispatchInProgress = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly schemaService: CommunicationSchemaService,
    private readonly repository: CommunicationSmsOutboxRepository,
    private readonly smsDispatchService: SmsDispatchService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isWorkerEnabled()) {
      this.logger.log('Communication SMS outbox worker is disabled for this runtime');
      return;
    }

    await this.schemaService.onModuleInit();

    const intervalMs = this.getPositiveInteger(
      'communication.smsOutboxWorkerIntervalMs',
      5_000,
      1_000,
      300_000,
    );
    this.dispatchTimer = setInterval(() => {
      void this.dispatchPendingSms();
    }, intervalMs);
    this.dispatchTimer.unref?.();
    void this.dispatchPendingSms();
    this.logger.log(`Communication SMS outbox worker running every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
      this.dispatchTimer = null;
    }
  }

  async dispatchPendingSms(): Promise<number> {
    if (this.dispatchInProgress) {
      return 0;
    }

    this.dispatchInProgress = true;

    try {
      const batchSize = this.getPositiveInteger('communication.smsOutboxBatchSize', 25, 1, 250);
      const concurrency = this.getPositiveInteger(
        'communication.smsOutboxConcurrency',
        5,
        1,
        Math.min(batchSize, 25),
      );
      const providerTimeoutMs = this.getPositiveInteger(
        'communication.smsProviderRequestTimeoutMs',
        10_000,
        1_000,
        60_000,
      );
      const leaseMs = Math.max(
        this.getPositiveInteger('communication.smsOutboxLeaseMs', 120_000, 30_000, 900_000),
        providerTimeoutMs + 30_000,
      );
      let nextSlot = 0;
      let processed = 0;

      const worker = async () => {
        while (true) {
          const slot = nextSlot;
          nextSlot += 1;

          if (slot >= batchSize) {
            return;
          }

          let messages: ClaimedCommunicationSms[];

          try {
            messages = await this.repository.claimDueBatch(1, leaseMs);
          } catch (error) {
            this.logger.error(`Communication SMS claim failed: ${this.deliveryErrorMessage(error)}`);
            return;
          }

          const message = messages[0];

          if (!message) {
            return;
          }

          processed += 1;

          try {
            await this.dispatchOne(message);
          } catch (error) {
            this.logger.error(
              `Communication SMS ${message.id} processing failed: ${this.deliveryErrorMessage(error)}`,
            );
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      return processed;
    } catch (error) {
      this.logger.error(
        `Communication SMS outbox tick failed: ${this.deliveryErrorMessage(error)}`,
      );
      return 0;
    } finally {
      this.dispatchInProgress = false;
    }
  }

  private async dispatchOne(message: ClaimedCommunicationSms): Promise<void> {
    await this.requestContext.run(
      {
        request_id: `communication-sms-outbox:${message.id}:${message.attempt_count}`,
        tenant_id: message.tenant_id,
        user_id: AUTH_ANONYMOUS_USER_ID,
        role: AUTH_SYSTEM_ROLE,
        session_id: null,
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: null,
        user_agent: 'system:communication-sms-outbox',
        method: 'WORKER',
        path: `/internal/communication/sms-outbox/${message.id}`,
        started_at: new Date().toISOString(),
      },
      async () => {
        let recipient: string;
        let body: string;

        try {
          recipient = this.normalizeRecipient(message.recipient_phone);
          body = this.normalizeMessage(message.message);
        } catch (error) {
          await this.recordProviderFailure(message, error);
          return;
        }

        const dispatchStarted = await this.prisma.executeWithTenant(
          message.tenant_id,
          null,
          (tx) => this.repository.markDispatchStarted(
            {
              tenant_id: message.tenant_id,
              sms_id: message.id,
              lease_token: message.lease_token,
            },
            tx,
          ),
        );

        if (!dispatchStarted) {
          throw new Error('Claimed SMS could not be marked as provider dispatch started');
        }

        let dispatchResult: Awaited<ReturnType<SmsDispatchService['send']>>;

        try {
          dispatchResult = await this.smsDispatchService.send({
            tenant_id: message.tenant_id,
            to: recipient,
            message: body,
            source: 'communication_sms_outbox',
            metadata: {
              dispatch_key: message.dispatch_key,
              sms_outbox_id: message.id,
              attempt_count: message.attempt_count,
            },
          });
        } catch (error) {
          await this.recordProviderFailure(message, error);
          return;
        }

        try {
          await this.prisma.executeWithTenant(message.tenant_id, null, async (tx) => {
            const recorded = await this.repository.markProviderAccepted(
              {
                tenant_id: message.tenant_id,
                sms_id: message.id,
                provider_id: dispatchResult.provider_id,
                provider_code: dispatchResult.provider_code,
                provider_reference: dispatchResult.provider_message_id,
                lease_token: message.lease_token,
                metadata: this.outcomeMetadata(message, recipient),
              },
              tx,
            );

            if (!recorded) {
              throw new Error('Claimed SMS could not be finalized for its school');
            }

            await this.eventPublisher.publish(
              {
                tenant_id: message.tenant_id,
                event_key: `communication.sms.provider_accepted:${message.id}`,
                event_name: 'communication.sms.provider_accepted',
                aggregate_type: 'communication_sms',
                aggregate_id: message.id,
                actor_user_id: message.sent_by,
                actor_role: AUTH_SYSTEM_ROLE,
                source_dashboard: 'system:communication-sms-outbox',
                payload: {
                  tenant_id: message.tenant_id,
                  sms_id: message.id,
                  recipient_phone_last4: this.phoneLast4(recipient),
                  requested_by_user_id: message.sent_by,
                  provider_id: dispatchResult.provider_id,
                  provider_code: dispatchResult.provider_code,
                  provider_message_id: dispatchResult.provider_message_id,
                  attempt_count: message.attempt_count,
                  provider_accepted_at: new Date().toISOString(),
                },
              },
              tx,
            );
          });
        } catch {
          this.logger.error(
            `Communication SMS ${message.id} was accepted by the provider but its durable receipt could not be recorded; it will require delivery reconciliation and will not be blindly retried`,
          );
          await this.recordPostAcceptanceUnknown(message, recipient, dispatchResult);
        }
      },
    );
  }

  private async recordPostAcceptanceUnknown(
    message: ClaimedCommunicationSms,
    recipient: string,
    dispatchResult: Awaited<ReturnType<SmsDispatchService['send']>>,
  ): Promise<void> {
    const failureReason = 'The provider accepted this SMS, but the accepted receipt/event transaction failed; manual reconciliation is required';

    try {
      await this.prisma.executeWithTenant(message.tenant_id, null, async (tx) => {
        const recorded = await this.repository.markProviderAcceptanceUnknown(
          {
            tenant_id: message.tenant_id,
            sms_id: message.id,
            provider_id: dispatchResult.provider_id,
            provider_code: dispatchResult.provider_code,
            provider_reference: dispatchResult.provider_message_id,
            lease_token: message.lease_token,
            last_error: failureReason,
            metadata: this.outcomeMetadata(message, recipient),
          },
          tx,
        );

        if (!recorded) {
          throw new Error('Provider-accepted SMS could not be marked for delivery reconciliation');
        }

        await this.eventPublisher.publish(
          {
            tenant_id: message.tenant_id,
            event_key: `communication.sms.delivery_unknown:${message.id}`,
            event_name: 'communication.sms.delivery_unknown',
            aggregate_type: 'communication_sms',
            aggregate_id: message.id,
            actor_user_id: message.sent_by,
            actor_role: AUTH_SYSTEM_ROLE,
            source_dashboard: 'system:communication-sms-outbox',
            payload: {
              tenant_id: message.tenant_id,
              sms_id: message.id,
              recipient_phone_last4: this.phoneLast4(recipient),
              requested_by_user_id: message.sent_by,
              attempt_count: message.attempt_count,
              failure_reason: failureReason,
              outcome_recorded_at: new Date().toISOString(),
            },
          },
          tx,
        );
      });
    } catch {
      this.logger.error(
        `Communication SMS ${message.id} provider evidence could not be persisted for reconciliation; the lease remains protected from blind retry`,
      );
    }
  }

  private async recordProviderFailure(message: ClaimedCommunicationSms, error: unknown): Promise<void> {
    const maxAttempts = this.getPositiveInteger(
      'communication.smsOutboxMaxAttempts',
      8,
      1,
      50,
    );
    const acceptanceUnknown = error instanceof SmsProviderDispatchError && error.acceptanceUnknown;
    const terminal = error instanceof InvalidQueuedSmsError
      || (error instanceof SmsProviderDispatchError && !error.retryable)
      || message.attempt_count >= maxAttempts;
    const outcome: 'retry' | 'failed' | 'unknown' = acceptanceUnknown
      ? 'unknown'
      : terminal
        ? 'failed'
        : 'retry';
    const nextAttemptAt = outcome === 'retry' ? this.nextRetryAt(message.attempt_count) : null;
    const lastError = this.deliveryErrorMessage(error);

    await this.prisma.executeWithTenant(message.tenant_id, null, async (tx) => {
      const recorded = await this.repository.markDeliveryFailure(
        {
          tenant_id: message.tenant_id,
          sms_id: message.id,
          outcome,
          lease_token: message.lease_token,
          next_attempt_at: nextAttemptAt,
          last_error: lastError,
          metadata: this.outcomeMetadata(message, message.recipient_phone),
        },
        tx,
      );

      if (!recorded) {
        throw new Error('Claimed SMS failure could not be finalized for its school');
      }

      if (outcome !== 'retry') {
        const eventName = outcome === 'unknown'
          ? 'communication.sms.delivery_unknown' as const
          : 'communication.sms.delivery_failed' as const;
        await this.eventPublisher.publish(
          {
            tenant_id: message.tenant_id,
            event_key: `${eventName}:${message.id}`,
            event_name: eventName,
            aggregate_type: 'communication_sms',
            aggregate_id: message.id,
            actor_user_id: message.sent_by,
            actor_role: AUTH_SYSTEM_ROLE,
            source_dashboard: 'system:communication-sms-outbox',
            payload: {
              tenant_id: message.tenant_id,
              sms_id: message.id,
              recipient_phone_last4: this.phoneLast4(message.recipient_phone),
              requested_by_user_id: message.sent_by,
              attempt_count: message.attempt_count,
              failure_reason: lastError,
              outcome_recorded_at: new Date().toISOString(),
            },
          },
          tx,
        );
      }
    });

    this.logger.warn(
      `Communication SMS ${message.id} ${outcome === 'unknown' ? 'requires delivery reconciliation' : outcome === 'failed' ? 'failed permanently' : 'scheduled for retry'} after attempt ${message.attempt_count}`,
    );
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

    throw new InvalidQueuedSmsError('Queued SMS recipient phone number is invalid');
  }

  private normalizeMessage(value: string): string {
    const message = value.trim();

    if (!message) {
      throw new InvalidQueuedSmsError('Queued SMS message is empty');
    }

    if (message.length > 1_600) {
      throw new InvalidQueuedSmsError('Queued SMS message exceeds the supported length');
    }

    return message;
  }

  private nextRetryAt(attemptCount: number): string {
    const baseDelayMs = this.getPositiveInteger(
      'communication.smsOutboxRetryBaseMs',
      60_000,
      1_000,
      3_600_000,
    );
    const maxDelayMs = this.getPositiveInteger(
      'communication.smsOutboxRetryMaxMs',
      3_600_000,
      baseDelayMs,
      86_400_000,
    );
    const delayMs = Math.min(
      baseDelayMs * 2 ** Math.max(attemptCount - 1, 0),
      maxDelayMs,
    );

    return new Date(Date.now() + delayMs).toISOString();
  }

  private outcomeMetadata(
    message: ClaimedCommunicationSms,
    recipientPhone: string,
  ): {
    attempt_count: number;
    recipient_phone_last4: string | null;
    requested_by_user_id: string | null;
  } {
    return {
      attempt_count: message.attempt_count,
      recipient_phone_last4: this.phoneLast4(recipientPhone),
      requested_by_user_id: message.sent_by,
    };
  }

  private phoneLast4(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits ? digits.slice(-4) : null;
  }

  private deliveryErrorMessage(error: unknown): string {
    if (error instanceof InvalidQueuedSmsError || error instanceof SmsProviderDispatchError) {
      return error.message.slice(0, 500);
    }

    return 'SMS dispatch failed before provider acceptance could be recorded';
  }

  private isWorkerEnabled(): boolean {
    return this.configService.get<boolean>('communication.smsOutboxWorkerEnabled') ?? false;
  }

  private getPositiveInteger(
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const configured = Number(this.configService.get<number | string>(key) ?? fallback);

    if (!Number.isFinite(configured)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(configured), minimum), maximum);
  }
}
