import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  createPrincipalOperationalCommandCenter,
  evaluateOperationalExecutionContract,
  type OperationalActionDefinition,
  type OperationalDashboardContract,
  type OperationalExecutionReport,
  type OperationalNodeDefinition,
  type OperationalRetryPolicy,
  type OperationalWorkflowDefinition,
} from '../../common/platform-governance/operational-execution-contract';
import { EventPublisherService } from './event-publisher.service';

export interface OperationalActionCatalogEntry {
  actionId: string;
  label: string;
  dashboardId: string;
  role: string;
  nodeId: string;
  nodeTitle: string;
  workflowBinding: string;
  executionHandler: string;
  capabilityRequirements: string[];
  fallbackHandler: string;
  retryPolicy: OperationalRetryPolicy;
  emittedEvents: string[];
  auditAction: string;
}

export interface PrincipalOperationalCatalog {
  dashboardId: string;
  role: string;
  operationalization: OperationalExecutionReport;
  actions: OperationalActionCatalogEntry[];
}

export interface OperationalActionDispatchRequest {
  aggregateId?: string;
  commandId?: string;
  payload?: Record<string, unknown>;
}

export interface OperationalRuntimeActionContract {
  label?: string;
  capability?: string;
  workflowBinding?: string;
  executionHandler?: string;
  eventContract?: string[];
  auditEvent?: string;
  retryPolicy?: 'NONE' | 'RETRY' | 'ESCALATE';
  fallbackHandler?: string;
}

export interface OperationalActionDispatchResult {
  status: 'DISPATCHED';
  actionId: string;
  workflowBinding: string;
  executionHandler: string;
  eventId: string;
  eventName: 'workflow.action.dispatched';
  widgetRefresh: {
    dashboardId: string;
    nodeId: string;
    events: string[];
  };
  auditAction: string;
}

interface OperationalActionMatch {
  dashboard: OperationalDashboardContract;
  node: OperationalNodeDefinition;
  action: OperationalActionDefinition;
  workflow: OperationalWorkflowDefinition;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OperationalWorkflowDispatcherService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  getPrincipalCatalog(): PrincipalOperationalCatalog {
    const dashboard = createPrincipalOperationalCommandCenter();

    return {
      dashboardId: dashboard.dashboardId,
      role: dashboard.role,
      operationalization: evaluateOperationalExecutionContract(dashboard),
      actions: this.flattenActionCatalog(dashboard),
    };
  }

  async dispatchPrincipalAction(
    actionId: string,
    request: OperationalActionDispatchRequest,
  ): Promise<OperationalActionDispatchResult> {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireTenantId(store.tenant_id);
    const match = this.findPrincipalAction(actionId);

    this.requireActionCapabilities(store.permissions, match.action.capabilityRequirements);

    const commandId = this.normalizeOptionalText(request.commandId) ?? store.request_id;
    const logicalAggregateId =
      this.normalizeOptionalText(request.aggregateId)
      ?? `${match.workflow.workflowId}:${commandId}`;
    const outboxAggregateId = this.toOutboxAggregateId(logicalAggregateId, commandId);
    const requestedAt = new Date().toISOString();
    const event = await this.eventPublisher.publish({
      event_key: `workflow.action.dispatched:${tenantId}:${commandId}:${match.action.actionId}`,
      event_name: 'workflow.action.dispatched',
      aggregate_type: 'operational_workflow',
      aggregate_id: outboxAggregateId,
      payload: {
        tenant_id: tenantId,
        command_id: commandId,
        dashboard_id: match.dashboard.dashboardId,
        role: match.dashboard.role,
        node_id: match.node.nodeId,
        action_id: match.action.actionId,
        workflow_id: match.workflow.workflowId,
        execution_handler: this.requireText(match.action.executionHandler, 'execution handler'),
        fallback_handler: this.requireText(match.action.fallbackHandler, 'fallback handler'),
        retry_policy: this.requireRetryPolicy(match.action.retryPolicy),
        emitted_events: [...match.action.emittedEvents],
        audit_action: this.requireText(match.action.auditAction, 'audit action'),
        aggregate_id: logicalAggregateId,
        requested_by_user_id: store.user_id,
        requested_at: requestedAt,
        payload: request.payload ?? {},
      },
      headers: {
        operational_action_id: match.action.actionId,
        workflow_id: match.workflow.workflowId,
        dashboard_id: match.dashboard.dashboardId,
      },
    });

    return {
      status: 'DISPATCHED',
      actionId: match.action.actionId,
      workflowBinding: match.workflow.workflowId,
      executionHandler: this.requireText(match.action.executionHandler, 'execution handler'),
      eventId: event.id,
      eventName: 'workflow.action.dispatched',
      widgetRefresh: {
        dashboardId: match.dashboard.dashboardId,
        nodeId: match.node.nodeId,
        events: [...match.action.emittedEvents],
      },
      auditAction: this.requireText(match.action.auditAction, 'audit action'),
    };
  }

  async dispatchRuntimeRoleAction(
    role: string,
    actionId: string,
    request: OperationalActionDispatchRequest,
  ): Promise<OperationalActionDispatchResult> {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireTenantId(store.tenant_id);
    const normalizedRole = this.requireText(role, 'role');
    const normalizedActionId = this.requireText(actionId, 'action id');
    const contract = this.requireRuntimeActionContract(request.payload);
    const workflowBinding = this.requireText(contract.workflowBinding ?? null, 'workflow binding');
    const executionHandler = this.requireText(contract.executionHandler ?? null, 'execution handler');
    const fallbackHandler = this.requireText(contract.fallbackHandler ?? null, 'fallback handler');
    const auditAction = this.requireText(contract.auditEvent ?? null, 'audit action');
    const emittedEvents = this.requireStringArray(contract.eventContract, 'event contract');
    const commandId = this.normalizeOptionalText(request.commandId) ?? store.request_id;
    const logicalAggregateId =
      this.normalizeOptionalText(request.aggregateId)
      ?? `${workflowBinding}:${commandId}`;
    const outboxAggregateId = this.toOutboxAggregateId(logicalAggregateId, commandId);
    const requestedAt = new Date().toISOString();
    const event = await this.eventPublisher.publish({
      event_key: `workflow.action.dispatched:${tenantId}:${commandId}:${normalizedRole}:${normalizedActionId}`,
      event_name: 'workflow.action.dispatched',
      aggregate_type: 'operational_workflow',
      aggregate_id: outboxAggregateId,
      payload: {
        tenant_id: tenantId,
        command_id: commandId,
        dashboard_id: `${normalizedRole}-dashboard`,
        role: normalizedRole,
        node_id: normalizedActionId,
        action_id: normalizedActionId,
        action_label: contract.label ?? normalizedActionId,
        capability_required: contract.capability ?? 'platform:operational-execute',
        workflow_id: workflowBinding,
        execution_handler: executionHandler,
        fallback_handler: fallbackHandler,
        retry_policy: this.toRuntimeRetryPolicy(contract.retryPolicy),
        emitted_events: emittedEvents,
        audit_action: auditAction,
        aggregate_id: logicalAggregateId,
        requested_by_user_id: store.user_id,
        requested_at: requestedAt,
        payload: request.payload ?? {},
      },
      headers: {
        operational_action_id: normalizedActionId,
        workflow_id: workflowBinding,
        dashboard_id: `${normalizedRole}-dashboard`,
      },
    });

    return {
      status: 'DISPATCHED',
      actionId: normalizedActionId,
      workflowBinding,
      executionHandler,
      eventId: event.id,
      eventName: 'workflow.action.dispatched',
      widgetRefresh: {
        dashboardId: `${normalizedRole}-dashboard`,
        nodeId: normalizedActionId,
        events: emittedEvents,
      },
      auditAction,
    };
  }

  private flattenActionCatalog(
    dashboard: OperationalDashboardContract,
  ): OperationalActionCatalogEntry[] {
    const actions: OperationalActionCatalogEntry[] = [];

    for (const section of dashboard.sections) {
      for (const node of section.nodes) {
        for (const action of node.actions) {
          actions.push({
            actionId: action.actionId,
            label: action.label,
            dashboardId: dashboard.dashboardId,
            role: dashboard.role,
            nodeId: node.nodeId,
            nodeTitle: node.title,
            workflowBinding: this.requireText(action.workflowBinding, 'workflow binding'),
            executionHandler: this.requireText(action.executionHandler, 'execution handler'),
            capabilityRequirements: [...action.capabilityRequirements],
            fallbackHandler: this.requireText(action.fallbackHandler, 'fallback handler'),
            retryPolicy: this.requireRetryPolicy(action.retryPolicy),
            emittedEvents: [...action.emittedEvents],
            auditAction: this.requireText(action.auditAction, 'audit action'),
          });
        }
      }
    }

    return actions;
  }

  private findPrincipalAction(actionId: string): OperationalActionMatch {
    const dashboard = createPrincipalOperationalCommandCenter();
    const normalizedActionId = this.requireText(actionId, 'action id');

    for (const section of dashboard.sections) {
      for (const node of section.nodes) {
        const action = node.actions.find((candidate) => candidate.actionId === normalizedActionId);

        if (!action) {
          continue;
        }

        const workflow = dashboard.workflows.find(
          (candidate) => candidate.workflowId === action.workflowBinding,
        );

        if (!workflow) {
          throw new BadRequestException(
            `Operational action ${normalizedActionId} is not bound to a workflow state machine`,
          );
        }

        return {
          dashboard,
          node,
          action,
          workflow,
        };
      }
    }

    throw new NotFoundException(`Operational action ${normalizedActionId} is not registered`);
  }

  private requireActionCapabilities(
    grantedCapabilities: string[],
    requiredCapabilities: string[],
  ): void {
    const missingCapability = requiredCapabilities.find(
      (requiredCapability) => !this.hasCapability(grantedCapabilities, requiredCapability),
    );

    if (missingCapability) {
      throw new ForbiddenException(`Missing capability: ${missingCapability}`);
    }
  }

  private hasCapability(grantedCapabilities: string[], requiredCapability: string): boolean {
    if (grantedCapabilities.includes('*:*') || grantedCapabilities.includes(requiredCapability)) {
      return true;
    }

    const [resource] = requiredCapability.split(':');

    return grantedCapabilities.includes(`${resource}:*`);
  }

  private requireTenantId(tenantId: string | null): string {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for operational dispatch');
    }

    return tenantId;
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    return this.requireText(value, 'text value');
  }

  private requireText(value: string | null, label: string): string {
    const normalizedValue = value?.trim() ?? '';

    if (normalizedValue.length === 0) {
      throw new BadRequestException(`Operational ${label} is required`);
    }

    return normalizedValue;
  }

  private toOutboxAggregateId(logicalAggregateId: string, commandId: string): string {
    if (UUID_PATTERN.test(logicalAggregateId)) {
      return logicalAggregateId;
    }

    if (UUID_PATTERN.test(commandId)) {
      return commandId;
    }

    return randomUUID();
  }

  private requireRetryPolicy(policy: OperationalRetryPolicy | null): OperationalRetryPolicy {
    if (!policy || policy.maxAttempts < 1) {
      throw new BadRequestException('Operational retry policy is required');
    }

    return { ...policy };
  }

  private requireRuntimeActionContract(
    payload: Record<string, unknown> | undefined,
  ): OperationalRuntimeActionContract {
    const contract = payload?.runtimeActionContract;

    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
      throw new BadRequestException('Operational runtime action contract is required');
    }

    return contract as OperationalRuntimeActionContract;
  }

  private requireStringArray(value: unknown, label: string): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException(`Operational ${label} is required`);
    }

    return value.map((item) => this.requireText(String(item), label));
  }

  private toRuntimeRetryPolicy(policy: OperationalRuntimeActionContract['retryPolicy']): OperationalRetryPolicy {
    if (policy === 'NONE') {
      return {
        maxAttempts: 1,
        backoff: 'fixed',
      };
    }

    return {
      maxAttempts: policy === 'ESCALATE' ? 2 : 3,
      backoff: 'exponential',
    };
  }
}
