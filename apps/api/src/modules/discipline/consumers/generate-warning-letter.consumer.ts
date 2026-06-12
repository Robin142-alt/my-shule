import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateWarningLetterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-warning-letter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-warning-letter' && event.payload.action_id !== 'generate-warning-letter') {
      return;
    }

    // TODO: Implement domain logic for generate-warning-letter
    console.log('[GenerateWarningLetterConsumer] Executing action:', event.payload);
  }
}
