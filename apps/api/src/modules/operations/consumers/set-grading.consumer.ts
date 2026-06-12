import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SetGradingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'set-grading.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'set-grading' && event.payload.action_id !== 'set-grading') {
      return;
    }

    // TODO: Implement domain logic for set-grading
    console.log('[SetGradingConsumer] Executing action:', event.payload);
  }
}
