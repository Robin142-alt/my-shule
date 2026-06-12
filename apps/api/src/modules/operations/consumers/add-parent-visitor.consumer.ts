import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddParentVisitorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-parent-visitor.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-parent-visitor' && event.payload.action_id !== 'add-parent-visitor') {
      return;
    }

    // TODO: Implement domain logic for add-parent-visitor
    console.log('[AddParentVisitorConsumer] Executing action:', event.payload);
  }
}
