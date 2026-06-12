import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RunTenantCheckConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'run-tenant-check.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'run-tenant-check' && event.payload.action_id !== 'run-tenant-check') {
      return;
    }

    // TODO: Implement domain logic for run-tenant-check
    console.log('[RunTenantCheckConsumer] Executing action:', event.payload);
  }
}
