import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyAffectedClassesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-affected-classes.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-affected-classes' && event.payload.action_id !== 'notify-affected-classes') {
      return;
    }

    // TODO: Implement domain logic for notify-affected-classes
    console.log('[NotifyAffectedClassesConsumer] Executing action:', event.payload);
  }
}
