import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ContinueSetupConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'continue-setup.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'continue-setup' && event.payload.action_id !== 'continue-setup') {
      return;
    }

    // TODO: Implement domain logic for continue-setup
    console.log('[ContinueSetupConsumer] Executing action:', event.payload);
  }
}
