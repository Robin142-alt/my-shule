import { Injectable } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class WelfareCaseConsumer
  implements EventConsumerDescriptor<'welfare.case.referred'>
{
  readonly name = 'welfare-case.audit';
  readonly event_name = 'welfare.case.referred' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'welfare.case.referred'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id:
        typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id:
        typeof event.headers.request_id === 'string' ? event.headers.request_id : null,
      action: 'welfare.case.referred',
      resource_type: 'welfare',
      resource_id: event.aggregate_id,
      metadata: {
        consumer: this.name,
        event_id: event.id,
        event_key: event.event_key,
        payload: event.payload as any,
      },
    });
  }
}
