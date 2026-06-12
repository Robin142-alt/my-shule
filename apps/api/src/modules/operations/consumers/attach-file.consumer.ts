import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AttachFileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'attach-file.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'attach-file' && event.payload.action_id !== 'attach-file') {
      return;
    }

    // TODO: Implement domain logic for attach-file
    console.log('[AttachFileConsumer] Executing action:', event.payload);
  }
}
