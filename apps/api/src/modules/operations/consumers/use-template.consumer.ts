import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UseTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'use-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'use-template' && event.payload.action_id !== 'use-template') {
      return;
    }

    // TODO: Implement domain logic for use-template
    console.log('[UseTemplateConsumer] Executing action:', event.payload);
  }
}
