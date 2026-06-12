import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignRoomConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-room.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-room' && event.payload.action_id !== 'assign-room') {
      return;
    }

    // TODO: Implement domain logic for assign-room
    console.log('[AssignRoomConsumer] Executing action:', event.payload);
  }
}
