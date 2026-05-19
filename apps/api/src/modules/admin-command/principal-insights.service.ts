import { Injectable, MessageEvent } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { catchError, concat, from, interval, map, Observable, of, switchMap } from 'rxjs';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PRINCIPAL_INSIGHT_PROVIDERS } from './principal-insights.providers';
import type {
  PrincipalExecutiveDashboard,
  PrincipalInsightAlert,
  PrincipalInsightProviderConfig,
  PrincipalInsightSection,
  PrincipalInsightSeverity,
  PrincipalInsightWidget,
} from './principal-insights.types';

const CACHE_TTL_SECONDS = 45;

@Injectable()
export class PrincipalInsightsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly moduleAccessService: ModuleAccessService,
    private readonly repository: AdminCommandRepository,
    private readonly cache: PrincipalInsightsCacheService,
  ) {}

  async buildDashboard(tenantId: string): Promise<PrincipalExecutiveDashboard> {
    const enabledModules = await this.moduleAccessService.listCurrentTenantModules();
    const store = this.requestContext.getStore();
    const permissions = store?.permissions ?? [];

    await this.auditDashboardView(tenantId, store?.user_id);

    return this.buildDashboardPayload(tenantId, enabledModules, permissions);
  }

  async buildDashboardForTenant(
    tenantId: string,
    permissions: string[],
  ): Promise<PrincipalExecutiveDashboard> {
    const enabledModules = await this.moduleAccessService.listEnabledModulesForTenant(tenantId);

    return this.buildDashboardPayload(tenantId, enabledModules, permissions);
  }

  streamDashboard(tenantId: string): Observable<MessageEvent> {
    const permissions = this.requestContext.getStore()?.permissions ?? [];

    return concat(of(0), interval(CACHE_TTL_SECONDS * 1000)).pipe(
      switchMap(() => from(this.buildDashboardForTenant(tenantId, permissions))),
      map((dashboard) => ({
        type: 'principal.dashboard',
        data: dashboard,
      })),
      catchError((error: unknown) => of({
        type: 'principal.error',
        data: {
          message: error instanceof Error
            ? error.message
            : 'Principal dashboard stream failed',
        },
      })),
    );
  }

  private async buildDashboardPayload(
    tenantId: string,
    enabledModules: string[],
    permissions: string[],
  ): Promise<PrincipalExecutiveDashboard> {
    const cacheKey = this.cacheKey(tenantId, enabledModules, permissions);
    const enabledModuleHash = this.hashFor(enabledModules.slice().sort());
    const filterHash = this.hashFor({ permissions: permissions.slice().sort() });

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const snapshot = await this.repository.findPrincipalDashboardSnapshot({
        tenant_id: tenantId,
        enabled_module_hash: enabledModuleHash,
        filter_hash: filterHash,
      });

      if (snapshot) {
        return snapshot;
      }

      const overview = await this.repository.getPrincipalOverviewSnapshot(tenantId);
      const sections: PrincipalInsightSection[] = [];

      for (const provider of PRINCIPAL_INSIGHT_PROVIDERS) {
        if (!enabledModules.includes(provider.module_code)) {
          continue;
        }

        if (provider.permission_required && !this.hasPermission(permissions, provider.permission_required)) {
          continue;
        }

        const metrics = await this.repository.getPrincipalModuleMetrics(
          tenantId,
          provider.module_code,
        );
        sections.push(this.buildSection(provider, metrics));
      }

      const alerts = sections.flatMap((section) => section.alerts);
      const reportExports = Array.from(new Set(sections.flatMap((section) => section.reports)));

      const dashboard: PrincipalExecutiveDashboard = {
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        enabled_modules: enabledModules,
        overview,
        sections,
        alerts,
        notifications: alerts.slice(0, 25),
        realtime_channels: this.buildRealtimeChannels(enabledModules),
        report_exports: reportExports,
        cache: {
          ttl_seconds: CACHE_TTL_SECONDS,
          key: cacheKey,
        },
      };

      await this.repository.upsertPrincipalDashboardSnapshot({
        tenant_id: tenantId,
        enabled_module_hash: enabledModuleHash,
        filter_hash: filterHash,
        payload: dashboard,
        ttl_seconds: CACHE_TTL_SECONDS,
      });

      return dashboard;
    });
  }

  private async auditDashboardView(
    tenantId: string,
    actorUserId: string | undefined,
  ): Promise<void> {
    await this.repository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      action: 'principal_dashboard.viewed',
      entity_type: 'principal_dashboard',
      metadata: {
        source: 'principal_executive_dashboard',
      },
    });
  }

  private buildSection(
    provider: PrincipalInsightProviderConfig,
    metrics: Record<string, unknown>,
  ): PrincipalInsightSection {
    const widgets = provider.widgets.map((widget) => {
      const value = this.metricValue(metrics, widget.metric_key);

      return {
        id: widget.id,
        title: widget.title,
        value,
        unit: widget.unit,
        description: widget.description,
        status: this.inferStatus(widget.metric_key, value),
        trend: 'flat',
      } satisfies PrincipalInsightWidget;
    });
    const alerts = widgets
      .filter((widget) => widget.status !== 'normal')
      .map((widget) => this.widgetAlert(provider, widget));

    return {
      id: provider.id,
      module_code: provider.module_code,
      title: provider.title,
      category: provider.category,
      permission_required: provider.permission_required,
      confidentiality: provider.confidentiality ?? 'standard',
      widgets,
      alerts,
      drilldowns: [...provider.drilldowns],
      reports: [...provider.reports],
    };
  }

  private widgetAlert(
    provider: PrincipalInsightProviderConfig,
    widget: PrincipalInsightWidget,
  ): PrincipalInsightAlert {
    return {
      id: `${provider.id}.${widget.id}`,
      module_code: provider.module_code,
      title: widget.title,
      message: `${widget.title} needs attention in ${provider.title}.`,
      severity: widget.status === 'critical' ? 'critical' : 'warning',
      action_hint: `Open ${provider.title} drill-down for details.`,
    };
  }

  private buildRealtimeChannels(enabledModules: string[]): string[] {
    const channels = ['principal.alerts', 'principal.approvals'];

    if (enabledModules.includes('teacher_biometric_attendance')) {
      channels.push('attendance.teacher.live');
    }

    if (enabledModules.includes('clinic_health')) {
      channels.push('clinic.inventory.alerts');
    }

    if (enabledModules.includes('lab_management')) {
      channels.push('labs.safety.alerts');
    }

    if (enabledModules.includes('finance')) {
      channels.push('finance.collections');
    }

    return channels;
  }

  private metricValue(metrics: Record<string, unknown>, key: string): number | string {
    const value = metrics[key];

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    return 0;
  }

  private inferStatus(metricKey: string, value: number | string): PrincipalInsightSeverity {
    if (typeof value !== 'number') {
      return 'normal';
    }

    if (value <= 0) {
      return 'normal';
    }

    const criticalSignals = [
      'absent',
      'critical',
      'expired',
      'out_of_stock',
      'overdue',
      'shortage',
    ];
    const warningSignals = [
      'alert',
      'conflict',
      'draft',
      'failed',
      'late',
      'low_stock',
      'missing',
      'pending',
      'repeat',
      'unassigned',
    ];

    if (criticalSignals.some((signal) => metricKey.includes(signal))) {
      return 'critical';
    }

    if (warningSignals.some((signal) => metricKey.includes(signal))) {
      return 'warning';
    }

    return 'normal';
  }

  private hasPermission(permissions: string[], permission: string): boolean {
    const [resource] = permission.split(':');

    return (
      permissions.includes('*:*')
      || permissions.includes(permission)
      || permissions.includes(`${resource}:*`)
    );
  }

  private cacheKey(
    tenantId: string,
    enabledModules: string[],
    permissions: string[],
  ): string {
    return [
      tenantId,
      'principal-executive',
      enabledModules.slice().sort().join(','),
      permissions.slice().sort().join(','),
    ].join(':');
  }

  private hashFor(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }
}
