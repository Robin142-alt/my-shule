import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewArrearsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-arrears.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-arrears' && event.payload.action_id !== 'view-arrears') {
      return;
    }

    // TODO: Implement domain logic for view-arrears
    console.log('[ViewArrearsConsumer] Executing action:', event.payload);
  }
}
