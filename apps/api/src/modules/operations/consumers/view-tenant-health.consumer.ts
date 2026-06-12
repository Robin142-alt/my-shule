import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewTenantHealthConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-tenant-health.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-tenant-health' && event.payload.action_id !== 'view-tenant-health') {
      return;
    }

    // TODO: Implement domain logic for view-tenant-health
    console.log('[ViewTenantHealthConsumer] Executing action:', event.payload);
  }
}
