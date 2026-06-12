import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenSchoolTenantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-school-tenant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-school-tenant' && event.payload.action_id !== 'open-school-tenant') {
      return;
    }

    // TODO: Implement domain logic for open-school-tenant
    console.log('[OpenSchoolTenantConsumer] Executing action:', event.payload);
  }
}
