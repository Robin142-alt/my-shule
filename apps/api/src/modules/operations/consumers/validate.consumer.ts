import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ValidateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'validate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'validate' && event.payload.action_id !== 'validate') {
      return;
    }

    // TODO: Implement domain logic for validate
    console.log('[ValidateConsumer] Executing action:', event.payload);
  }
}
