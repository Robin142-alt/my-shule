import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnApparatusConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-apparatus.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-apparatus' && event.payload.action_id !== 'return-apparatus') {
      return;
    }

    // TODO: Implement domain logic for return-apparatus
    console.log('[ReturnApparatusConsumer] Executing action:', event.payload);
  }
}
