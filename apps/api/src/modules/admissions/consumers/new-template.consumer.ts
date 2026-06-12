import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-template' && event.payload.action_id !== 'new-template') {
      return;
    }

    // TODO: Implement domain logic for new-template
    console.log('[NewTemplateConsumer] Executing action:', event.payload);
  }
}
