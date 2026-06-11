import { Injectable } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class DisciplineIncidentConsumer
  implements EventConsumerDescriptor<'discipline.incident.reported'>
{
  readonly name = 'discipline-incident.audit';
  readonly event_name = 'discipline.incident.reported' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'discipline.incident.reported'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id:
        typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id:
        typeof event.headers.request_id === 'string' ? event.headers.request_id : null,
      action: 'discipline.incident.reported',
      resource_type: 'discipline',
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
