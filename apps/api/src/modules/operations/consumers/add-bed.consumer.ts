import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddBedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-bed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-bed' && event.payload.action_id !== 'add-bed') {
      return;
    }

    // TODO: Implement domain logic for add-bed
    console.log('[AddBedConsumer] Executing action:', event.payload);
  }
}
