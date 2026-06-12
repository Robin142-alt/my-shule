import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EnableModuleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'enable-module.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'enable-module' && event.payload.action_id !== 'enable-module') {
      return;
    }

    // TODO: Implement domain logic for enable-module
    console.log('[EnableModuleConsumer] Executing action:', event.payload);
  }
}
