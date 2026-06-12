import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-template' && event.payload.action_id !== 'create-template') {
      return;
    }

    // TODO: Implement domain logic for create-template
    console.log('[CreateTemplateConsumer] Executing action:', event.payload);
  }
}
