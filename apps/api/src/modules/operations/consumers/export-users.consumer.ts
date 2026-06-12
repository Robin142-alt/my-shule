import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportUsersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-users.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-users' && event.payload.action_id !== 'export-users') {
      return;
    }

    // TODO: Implement domain logic for export-users
    console.log('[ExportUsersConsumer] Executing action:', event.payload);
  }
}
