import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyHodConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-hod.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-hod' && event.payload.action_id !== 'notify-hod') {
      return;
    }

    // TODO: Implement domain logic for notify-hod
    console.log('[NotifyHodConsumer] Executing action:', event.payload);
  }
}
