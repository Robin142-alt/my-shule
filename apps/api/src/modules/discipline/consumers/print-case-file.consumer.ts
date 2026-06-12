import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintCaseFileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-case-file.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-case-file' && event.payload.action_id !== 'print-case-file') {
      return;
    }

    // TODO: Implement domain logic for print-case-file
    console.log('[PrintCaseFileConsumer] Executing action:', event.payload);
  }
}
