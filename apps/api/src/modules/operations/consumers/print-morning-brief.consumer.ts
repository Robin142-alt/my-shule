import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintMorningBriefConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-morning-brief.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-morning-brief' && event.payload.action_id !== 'print-morning-brief') {
      return;
    }

    // TODO: Implement domain logic for print-morning-brief
    console.log('[PrintMorningBriefConsumer] Executing action:', event.payload);
  }
}
