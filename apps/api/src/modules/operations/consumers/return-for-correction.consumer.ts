import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnForCorrectionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-for-correction.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-for-correction' && event.payload.action_id !== 'return-for-correction') {
      return;
    }

    // TODO: Implement domain logic for return-for-correction
    console.log('[ReturnForCorrectionConsumer] Executing action:', event.payload);
  }
}
