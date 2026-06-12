import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DisableModuleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'disable-module.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'disable-module' && event.payload.action_id !== 'disable-module') {
      return;
    }

    // TODO: Implement domain logic for disable-module
    console.log('[DisableModuleConsumer] Executing action:', event.payload);
  }
}
