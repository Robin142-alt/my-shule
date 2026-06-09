import { Injectable, Optional } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { EventPublisherService } from '../event-publisher.service';
import { SchoolOperationNotificationsRepository } from '../repositories/school-operation-notifications.repository';

@Injectable()
export class OperationalWorkflowExecutionConsumer
  implements EventConsumerDescriptor<'workflow.action.dispatched'>
{
  readonly name = 'workflow-action-dispatched.execution';
  readonly event_name = 'workflow.action.dispatched' as const;

  constructor(
    private readonly eventPublisher: EventPublisherService,
    @Optional()
    private readonly schoolOperationNotificationsRepository?: SchoolOperationNotificationsRepository,
  ) {}

  async handle(event: DomainEvent<'workflow.action.dispatched'>): Promise<void> {
    const completedAt = new Date().toISOString();

    await this.materializeDashboardTask(event);

    await this.eventPublisher.publish({
      event_key: `workflow.action.completed:${event.tenant_id}:${event.payload.command_id}:${event.payload.action_id}`,
      event_name: 'workflow.action.completed',
      aggregate_type: 'operational_workflow',
      aggregate_id: event.aggregate_id,
      payload: {
        tenant_id: event.tenant_id,
        command_id: event.payload.command_id,
        dashboard_id: event.payload.dashboard_id,
        role: event.payload.role,
        node_id: event.payload.node_id,
        action_id: event.payload.action_id,
        workflow_id: event.payload.workflow_id,
        execution_handler: event.payload.execution_handler,
        aggregate_id: event.payload.aggregate_id,
        completed_at: completedAt,
        emitted_events: [...event.payload.emitted_events],
        audit_action: event.payload.audit_action,
        status: 'COMPLETED',
        payload: event.payload.payload,
      },
      headers: {
        causation_event_id: event.id,
        operational_action_id: event.payload.action_id,
        workflow_id: event.payload.workflow_id,
        dashboard_id: event.payload.dashboard_id,
      },
    });
  }

  private async materializeDashboardTask(
    event: DomainEvent<'workflow.action.dispatched'>,
  ): Promise<void> {
    if (!this.schoolOperationNotificationsRepository) {
      return;
    }

    const targetRoles = this.resolveTargetRoles(event.payload.payload, event.payload.role);
    const actionLabel = this.humanize(
      event.payload.action_label ?? event.payload.action_id,
    );
    const sourceModule = this.textFromPayload(
      event.payload.payload,
      ['sourceModule', 'source_module', 'module'],
      event.payload.dashboard_id.replace(/-dashboard$/i, ''),
    );
    const relatedModule = this.textFromPayload(
      event.payload.payload,
      ['relatedModule', 'related_module', 'targetModule', 'target_module'],
      sourceModule,
    );
    const relatedRecordId = this.textFromPayload(
      event.payload.payload,
      ['relatedRecordId', 'related_record_id', 'recordId', 'record_id', 'aggregateId'],
      event.payload.aggregate_id,
    );

    await this.schoolOperationNotificationsRepository.upsertFromSchoolOperation({
      tenantId: event.tenant_id,
      operationId: event.payload.command_id,
      notification: {
        id: `${event.payload.command_id}:${event.payload.action_id}:dashboard-task`,
        type: 'workflow.action.dispatched',
        title: `${actionLabel} routed`,
        body: `${actionLabel} was routed through ${event.payload.execution_handler}.`,
        audienceRoles: targetRoles,
        target_roles: targetRoles,
        sourceModule,
        relatedModule,
        relatedRecordId,
        actionType: event.payload.action_id,
        originRole: event.payload.role,
        requestStatus: 'routed',
        priority: this.textFromPayload(event.payload.payload, ['priority', 'severity'], 'normal'),
        href: `/${relatedModule}?record=${encodeURIComponent(relatedRecordId)}`,
        dashboardId: event.payload.dashboard_id,
        nodeId: event.payload.node_id,
        workflowId: event.payload.workflow_id,
        commandId: event.payload.command_id,
        executionHandler: event.payload.execution_handler,
        emittedEvents: event.payload.emitted_events,
      },
    });
  }

  private resolveTargetRoles(payload: Record<string, unknown>, fallbackRole: string): string[] {
    const candidate =
      payload.targetRoles
      ?? payload.target_roles
      ?? payload.audienceRoles
      ?? payload.audience_roles
      ?? payload.recipientRoles
      ?? payload.recipient_roles
      ?? payload.recipientRole
      ?? payload.targetRole;

    const values = Array.isArray(candidate) ? candidate : [candidate];
    const roles = values
      .filter((role): role is string => typeof role === 'string' && Boolean(role.trim()))
      .map((role) => role.trim());

    return roles.length ? [...new Set(roles)] : [fallbackRole];
  }

  private textFromPayload(
    payload: Record<string, unknown>,
    keys: string[],
    fallback: string,
  ): string {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return fallback;
  }

  private humanize(value: string): string {
    return value
      .replace(/[-_.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
