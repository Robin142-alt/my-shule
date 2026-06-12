import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignDisciplineMasterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-discipline-master.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-discipline-master' && event.payload.action_id !== 'assign-discipline-master') {
      return;
    }

    // TODO: Implement domain logic for assign-discipline-master
    console.log('[AssignDisciplineMasterConsumer] Executing action:', event.payload);
  }
}
