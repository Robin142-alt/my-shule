import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignToOfficeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-to-office.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-to-office' && event.payload.action_id !== 'assign-to-office') {
      return;
    }

    // TODO: Implement domain logic for assign-to-office
    console.log('[AssignToOfficeConsumer] Executing action:', event.payload);
  }
}
