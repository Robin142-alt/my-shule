import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAttendanceSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-attendance-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-attendance-slip' && event.payload.action_id !== 'print-attendance-slip') {
      return;
    }

    // TODO: Implement domain logic for print-attendance-slip
    console.log('[PrintAttendanceSlipConsumer] Executing action:', event.payload);
  }
}
