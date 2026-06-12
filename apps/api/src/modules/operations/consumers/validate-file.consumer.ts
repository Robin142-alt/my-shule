import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ValidateFileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'validate-file.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'validate-file' && event.payload.action_id !== 'validate-file') {
      return;
    }

    // TODO: Implement domain logic for validate-file
    console.log('[ValidateFileConsumer] Executing action:', event.payload);
  }
}
