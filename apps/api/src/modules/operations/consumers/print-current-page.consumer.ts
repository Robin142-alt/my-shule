import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintCurrentPageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-current-page.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-current-page' && event.payload.action_id !== 'print-current-page') {
      return;
    }

    // TODO: Implement domain logic for print-current-page
    console.log('[PrintCurrentPageConsumer] Executing action:', event.payload);
  }
}
