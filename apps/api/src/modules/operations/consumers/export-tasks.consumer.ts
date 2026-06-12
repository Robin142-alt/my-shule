import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportTasksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-tasks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-tasks' && event.payload.action_id !== 'export-tasks') {
      return;
    }

    // TODO: Implement domain logic for export-tasks
    console.log('[ExportTasksConsumer] Executing action:', event.payload);
  }
}
