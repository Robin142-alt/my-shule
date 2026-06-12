import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AUTH_ANONYMOUS_USER_ID,
  AUTH_SYSTEM_ROLE,
} from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { EventConsumerRegistryService } from './event-consumer-registry.service';
import { DomainEvent, DispatchOutboxEventJobPayload } from './events.types';
import { EventConsumerRunsRepository } from './repositories/event-consumer-runs.repository';
import { OutboxEventsRepository } from './repositories/outbox-events.repository';

@Injectable()
export class EventConsumerService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  private readonly logger = new Logger(EventConsumerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly outboxEventsRepository: OutboxEventsRepository,
    private readonly eventConsumerRunsRepository: EventConsumerRunsRepository,
    private readonly eventConsumerRegistry: EventConsumerRegistryService,
  ) {}

  async consume(jobPayload: DispatchOutboxEventJobPayload): Promise<void> {
    await this.requestContext.run(
      {
        request_id: jobPayload.request_id,
        trace_id: jobPayload.trace_id,
        parent_span_id: jobPayload.parent_span_id,
        tenant_id: jobPayload.tenant_id,
        user_id: jobPayload.user_id ?? AUTH_ANONYMOUS_USER_ID,
        role: jobPayload.role ?? AUTH_SYSTEM_ROLE,
        session_id: jobPayload.session_id ?? null,
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: null,
        user_agent: 'system:event-consumer',
        method: 'WORKER',
        path: `/internal/events/${jobPayload.outbox_event_id}`,
        started_at: new Date().toISOString(),
      },
      async () => {
        try {
          await this.prisma.withRequestTransaction(async () => {
            const event = await this.getRequiredEvent(jobPayload.tenant_id, jobPayload.outbox_event_id);

            if (event.status === 'published') {
              return;
            }

            const consumers = this.eventConsumerRegistry.getConsumersForEvent(event.event_name);

            for (const consumer of consumers) {
              const consumerRun = await this.eventConsumerRunsRepository.acquireRun(
                event.tenant_id,
                event.id,
                event.event_key,
                consumer.name,
              );

              if (consumerRun.status === 'completed') {
                continue;
              }

              await this.eventConsumerRunsRepository.markAttempt(event.tenant_id, consumerRun.id);

              try {
                await consumer.handle(event as never);
                await this.eventConsumerRunsRepository.markCompleted(event.tenant_id, consumerRun.id);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Unknown domain event consumer error';
                await this.eventConsumerRunsRepository.markFailed(
                  event.tenant_id,
                  consumerRun.id,
                  message,
                );
                throw error;
              }
            }

            await this.outboxEventsRepository.markPublished(event.tenant_id, event.id);
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown domain event processing error';

          this.logger.error(message);
          await this.failEvent(jobPayload.tenant_id, jobPayload.outbox_event_id, message);
          throw error;
        }
      },
    );
  }

  private async getRequiredEvent(tenantId: string, outboxEventId: string): Promise<DomainEvent> {
    const event = await this.outboxEventsRepository.findById(tenantId, outboxEventId, true);

    if (!event) {
      throw new NotFoundException(`Outbox event "${outboxEventId}" was not found`);
    }

    return event;
  }

  private async failEvent(
    tenantId: string,
    outboxEventId: string,
    message: string,
  ): Promise<void> {
    await this.requestContext.run(
      {
        request_id: this.requestContext.getStore()?.request_id ?? `event-failure:${outboxEventId}`,
        tenant_id: tenantId,
        user_id: AUTH_ANONYMOUS_USER_ID,
        role: AUTH_SYSTEM_ROLE,
        session_id: null,
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: null,
        user_agent: 'system:event-consumer',
        method: 'WORKER',
        path: `/internal/events/${outboxEventId}/fail`,
        started_at: new Date().toISOString(),
      },
      async () => {
        await this.prisma.withRequestTransaction(async () => {
          await this.outboxEventsRepository.markFailed(
            tenantId,
            outboxEventId,
            message,
            Number(this.configService.get<number>('events.retryDelayMs') ?? 5000),
            Number(this.configService.get<number>('events.maxAttempts') ?? 25),
          );
        });
      },
    );
  }
}
