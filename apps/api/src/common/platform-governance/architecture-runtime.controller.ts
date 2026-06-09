import { Controller, Get, Injectable, UnauthorizedException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AutoRepairService, type AutoRepairDeploymentHealth } from '../auto-repair/auto-repair.service';
import { RequestContextService } from '../request-context/request-context.service';
import {
  evaluateArchitectureRuntimeContract,
  type ArchitectureRuntimeContractInput,
  type ArchitectureRuntimeReport,
} from './architecture-runtime-contract';
import {
  createPrincipalOperationalCommandCenter,
  evaluateOperationalExecutionContract,
  type OperationalExecutionReport,
} from './operational-execution-contract';

export interface ArchitectureRuntimeHealth {
  endpoint: 'GET /platform-governance/runtime-health';
  generatedAt: string;
  report: ArchitectureRuntimeReport;
  operationalization: OperationalExecutionReport;
  autoRepair: AutoRepairDeploymentHealth;
}

@Injectable()
export class ArchitectureRuntimeService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly autoRepairService: AutoRepairService,
  ) {}

  async getRuntimeHealth(): Promise<ArchitectureRuntimeHealth> {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireTenantId(store.tenant_id);
    const generatedAt = new Date().toISOString();
    const input = this.buildRuntimeContractInput(generatedAt);

    this.autoRepairService.repairDashboardSnapshot({
      tenant: {
        tenantId,
        lifecycleState: store.billing?.lifecycle_state ?? 'ACTIVE',
      },
      moduleAssignments: {
        platform: 'ENABLED',
      },
      capabilityMap: {
        'platform:auto-repair': this.hasCapability(store.permissions, 'platform:auto-repair'),
      },
      widgetRegistry: {
        version: 'runtime',
        widgets: [
          {
            widgetId: input.widget.widgetId,
            name: 'Architecture Runtime Contract',
            moduleSource: input.widget.moduleSource,
            capabilitiesRequired: [...input.widget.capabilitiesRequired],
            eventSubscriptions: [...input.widget.eventSubscriptions],
            states: {
              ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
              EMPTY: { label: 'Empty', visibility: 'VISIBLE' },
              LOCKED: { label: 'Locked', visibility: 'DISABLED' },
              DEGRADED: { label: 'Degraded', visibility: 'READONLY', retryable: true },
              FAILED: { label: 'Failed', visibility: 'VISIBLE', retryable: true },
              LOADING: { label: 'Loading', visibility: 'VISIBLE' },
            },
            actions: [
              {
                actionId: input.button.actionId,
                capabilityRequired: input.button.capabilityRequired,
                failurePolicy: input.button.failurePolicy,
              },
            ],
          },
        ],
      },
      uiDashboardState: {
        dashboardId: 'platform-governance',
        role: store.role ?? 'system',
        staticLayout: true,
        operationalIntent: 'Runtime verification of AGP, capability, widget, event, audit, and repair contracts',
        widgets: [
          {
            widgetId: input.widget.widgetId,
            state: input.widget.state,
            visible: input.widget.visible,
            moduleSource: input.widget.moduleSource,
            capabilitiesRequired: [...input.widget.capabilitiesRequired],
            eventSubscriptions: [...input.widget.eventSubscriptions],
            intents: ['ACTION', 'DECISION'],
            primarySurface: true,
          },
        ],
      },
      eventBindings: {
        'platform.runtime.checked': [input.widget.widgetId],
      },
      eventLogs: [
        {
          eventName: 'platform.runtime.checked',
          tenantId,
          emittedAt: generatedAt,
        },
      ],
      failedActionsLog: [],
    });

    return {
      endpoint: 'GET /platform-governance/runtime-health',
      generatedAt,
      report: evaluateArchitectureRuntimeContract(input),
      operationalization: evaluateOperationalExecutionContract(createPrincipalOperationalCommandCenter()),
      autoRepair: this.autoRepairService.getDeploymentHealth(),
    };
  }

  private buildRuntimeContractInput(generatedAt: string): ArchitectureRuntimeContractInput {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireTenantId(store.tenant_id);
    const lifecycleState = store.billing?.lifecycle_state ?? 'ACTIVE';
    const eventId = `runtime:${store.request_id}`;

    return {
      runtime: {
        tenantId,
        userId: store.user_id,
        role: store.role,
        lifecycleState,
        billingState: store.billing?.status ?? 'PAID',
        enabledModules: ['platform'],
        capabilities: store.permissions,
        requestId: store.request_id,
        traceId: store.trace_id,
      },
      command: {
        commandId: store.request_id,
        tenantId,
        action: 'platform.runtime.health.check',
        capabilityRequired: 'platform:auto-repair',
      },
      event: {
        eventId,
        tenantId,
        name: 'platform.runtime.checked',
        aggregateType: 'platform_runtime',
        aggregateId: tenantId,
        payloadTenantId: tenantId,
        emittedAt: generatedAt,
      },
      projection: {
        name: 'platform.runtime_health',
        tenantId,
        sourceEventId: eventId,
        updatedAt: generatedAt,
      },
      widget: {
        widgetId: 'platform.runtime_contract',
        dashboardId: 'platform-governance',
        moduleSource: 'platform',
        state: 'ACTIVE',
        visible: true,
        capabilitiesRequired: ['platform:auto-repair'],
        eventSubscriptions: ['platform.runtime.checked'],
      },
      button: {
        actionId: 'platform.runtime_contract.retry',
        state: 'ACTIVE',
        visible: true,
        capabilityRequired: 'platform:auto-repair',
        handler: 'auto-repair.runtime-contract.retry',
        failurePolicy: 'RETRY',
      },
      audit: {
        tenantId,
        actorUserId: store.user_id,
        action: 'platform.runtime.health.check',
        eventId,
        recordedAt: generatedAt,
      },
    };
  }

  private hasCapability(capabilities: string[], requiredCapability: string): boolean {
    if (capabilities.includes('*:*') || capabilities.includes(requiredCapability)) {
      return true;
    }

    const [resource] = requiredCapability.split(':');

    return capabilities.includes(`${resource}:*`);
  }

  private requireTenantId(tenantId: string | null): string {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for architecture runtime health');
    }

    return tenantId;
  }
}

@Controller('platform-governance')
export class ArchitectureRuntimeController {
  constructor(private readonly architectureRuntimeService: ArchitectureRuntimeService) {}

  @Get('runtime-health')
  @Permissions('platform:auto-repair')
  getRuntimeHealth() {
    return this.architectureRuntimeService.getRuntimeHealth();
  }
}
