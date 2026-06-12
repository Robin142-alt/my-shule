import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReferToBoardingMasterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'refer-to-boarding-master.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'refer-to-boarding-master' && event.payload.action_id !== 'refer-to-boarding-master') {
      return;
    }

    // TODO: Implement domain logic for refer-to-boarding-master
    console.log('[ReferToBoardingMasterConsumer] Executing action:', event.payload);
  }
}
