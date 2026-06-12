import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateParentSummonsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-parent-summons.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-parent-summons' && event.payload.action_id !== 'create-parent-summons') {
      return;
    }

    // TODO: Implement domain logic for create-parent-summons
    console.log('[CreateParentSummonsConsumer] Executing action:', event.payload);
  }
}
