import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CloseCaseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'close-case.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'close-case' && event.payload.action_id !== 'close-case') {
      return;
    }

    // TODO: Implement domain logic for close-case
    console.log('[CloseCaseConsumer] Executing action:', event.payload);
  }
}
