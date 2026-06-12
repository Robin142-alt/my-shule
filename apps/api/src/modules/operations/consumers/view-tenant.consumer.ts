import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewTenantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-tenant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-tenant' && event.payload.action_id !== 'view-tenant') {
      return;
    }

    // TODO: Implement domain logic for view-tenant
    console.log('[ViewTenantConsumer] Executing action:', event.payload);
  }
}
