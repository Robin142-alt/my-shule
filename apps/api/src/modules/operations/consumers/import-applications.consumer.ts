import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportApplicationsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-applications.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-applications' && event.payload.action_id !== 'import-applications') {
      return;
    }

    // TODO: Implement domain logic for import-applications
    console.log('[ImportApplicationsConsumer] Executing action:', event.payload);
  }
}
