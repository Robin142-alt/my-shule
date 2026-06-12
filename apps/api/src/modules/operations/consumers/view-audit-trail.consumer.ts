import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewAuditTrailConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-audit-trail.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-audit-trail' && event.payload.action_id !== 'view-audit-trail') {
      return;
    }

    // TODO: Implement domain logic for view-audit-trail
    console.log('[ViewAuditTrailConsumer] Executing action:', event.payload);
  }
}
