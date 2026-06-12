import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddChemicalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-chemical.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-chemical' && event.payload.action_id !== 'add-chemical') {
      return;
    }

    // TODO: Implement domain logic for add-chemical
    console.log('[AddChemicalConsumer] Executing action:', event.payload);
  }
}
