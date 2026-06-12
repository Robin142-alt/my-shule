import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RemindUnmarkedClassesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'remind-unmarked-classes.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'remind-unmarked-classes' && event.payload.action_id !== 'remind-unmarked-classes') {
      return;
    }

    // TODO: Implement domain logic for remind-unmarked-classes
    console.log('[RemindUnmarkedClassesConsumer] Executing action:', event.payload);
  }
}
