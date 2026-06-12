import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddRoomConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-room.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-room' && event.payload.action_id !== 'add-room') {
      return;
    }

    // TODO: Implement domain logic for add-room
    console.log('[AddRoomConsumer] Executing action:', event.payload);
  }
}
