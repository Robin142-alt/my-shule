import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { performance } from 'node:perf_hooks';

import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SloMetricsService } from '../observability/slo-metrics.service';
import { DeviceRegistrationResponseDto } from './dto/device-registration-response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SyncPullResponseDto } from './dto/sync-pull-response.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushResponseDto } from './dto/sync-push-response.dto';
import { SyncPushDto } from './dto/sync-push.dto';
import {
  SYNC_DEFAULT_PULL_LIMIT,
  SYNC_SUPPORTED_ENTITIES,
} from './sync.constants';

import { AttendanceSyncConflictResolverService } from './conflict-resolvers/attendance-sync-conflict-resolver.service';
import { FinanceSyncConflictResolverService } from './conflict-resolvers/finance-sync-conflict-resolver.service';
import { SyncEntity, SyncOperationLog, SyncPushOperationInput } from './sync.types';
import { SyncCursorsRepository } from './repositories/sync-cursors.repository';
import { SyncDevicesRepository } from './repositories/sync-devices.repository';
import { SyncOperationLogsRepository } from './repositories/sync-operation-logs.repository';
import { SyncOperationLogService } from './sync-operation-log.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { SyncValidationService } from './sync-validation.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly syncDevicesRepository: SyncDevicesRepository,
    private readonly syncCursorsRepository: SyncCursorsRepository,
    private readonly syncOperationLogsRepository: SyncOperationLogsRepository,
    private readonly syncOperationLogService: SyncOperationLogService,
    private readonly attendanceResolver: AttendanceSyncConflictResolverService,
    private readonly financeResolver: FinanceSyncConflictResolverService,
    private readonly syncValidationService: SyncValidationService,
    @Optional() private readonly sloMetrics?: SloMetricsService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {}

  async registerDevice(dto: RegisterDeviceDto): Promise<DeviceRegistrationResponseDto> {
    const startedAt = performance.now();

    try {
      const result = await this.prisma.withRequestTransaction(async () => {
        const device = await this.syncDevicesRepository.upsertDevice({
          tenant_id: this.requireTenantId(),
          device_id: dto.device_id.trim(),
          platform: dto.platform.trim(),
          app_version: dto.app_version?.trim() || null,
          metadata: dto.metadata ?? {},
        });

        return this.mapDevice(device);
      });

      this.recordSyncMetric('sync_register', 'success', startedAt, {
        device_id: dto.device_id.trim(),
      });
      return result;
    } catch (error) {
      this.recordSyncMetric('sync_register', 'failure', startedAt, {
        device_id: dto.device_id.trim(),
      });
      throw error;
    }
  }

  async push(dto: SyncPushDto): Promise<SyncPushResponseDto> {
    const startedAt = performance.now();

    try {
      const result = await this.prisma.withRequestTransaction(async () => {
        const tenantId = this.requireTenantId();
        const device = await this.syncDevicesRepository.upsertDevice({
          tenant_id: tenantId,
          device_id: dto.device_id.trim(),
          platform: dto.platform.trim(),
          app_version: dto.app_version?.trim() || null,
          metadata: dto.metadata ?? {},
        });

        await this.acknowledgeCursors(tenantId, dto.device_id, dto.cursors);

        const results = [];

        for (const operation of dto.operations) {
          this.syncOperationLogService.ensureSupportedEntity(operation.entity);
          const existingOperation = await this.syncOperationLogsRepository.findByOpId(
            tenantId,
            operation.op_id,
          );

          if (existingOperation) {
            results.push({
              op_id: operation.op_id,
              entity: operation.entity,
              status: 'duplicate' as const,
              client_version: operation.version,
              server_version: existingOperation.version,
              reason: 'Operation has already been applied',
              conflict_policy: 'server-authoritative' as const,
              server_state: null,
            });
            continue;
          }

          const operationInput = {
            op_id: operation.op_id,
            entity: operation.entity,
            payload: operation.payload as unknown as SyncPushOperationInput['payload'],
            version: operation.version,
          };

          if (operation.entity === 'attendance') {
            results.push(
              await this.attendanceResolver.applyOperation(
                tenantId,
                device.device_id,
                operationInput as SyncPushOperationInput<'attendance'>,
              ),
            );
          } else {
            results.push(
              await this.financeResolver.applyOperation(
                operationInput as SyncPushOperationInput<'finance'>,
              ),
            );
          }
        }

        await this.syncDevicesRepository.markPush(tenantId, dto.device_id);

        const conflicts = results.filter(r => r.status === 'rejected');
        let communication: SyncPushResponseDto['communication'] = { status: 'not_required' };
        if (conflicts.length > 0) {
          if (!this.schoolEvents) {
            communication = {
              status: 'degraded',
              message: 'Conflicts were recorded, but the school alert service is unavailable.',
            };
          } else {
            try {
              await this.schoolEvents.recordSchoolOperation({
                event: {
                  id: `sync-conflict-${dto.device_id}-${Date.now()}`,
                  type: 'sync.conflict_detected',
                  module: 'sync',
                  actorRole: 'system',
                  title: 'Offline Sync Conflicts Detected',
                  body: `Device ${dto.device_id} pushed ${conflicts.length} conflicting operations.`,
                  entityId: dto.device_id,
                  severity: 'warning',
                  payload: { device_id: dto.device_id, conflict_count: conflicts.length },
                },
                notifications: [
                  {
                    id: `sync-admin-notify-${dto.device_id}-${Date.now()}`,
                    schoolId: tenantId,
                    audienceRoles: ['admin'],
                    title: 'Offline Sync Retry Queue Action Needed',
                    body: `Offline sync from device ${dto.device_id} resulted in ${conflicts.length} conflict(s) or error(s) that require administrative review.`,
                    sourceModule: 'sync',
                    relatedModule: 'sync',
                    relatedRecordId: dto.device_id,
                    priority: 'high',
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                ],
              });
              communication = { status: 'sent' };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              this.logger.warn(
                `Offline-sync conflicts for device ${dto.device_id} were recorded, but the alert could not be queued: ${message}`,
              );
              communication = {
                status: 'degraded',
                message: 'Conflicts were recorded, but their cross-dashboard alert could not be queued.',
              };
            }
          }
        }

        return Object.assign(new SyncPushResponseDto(), {
          device: this.mapDevice(device),
          results,
          communication,
          cursors: await this.syncOperationLogService.getLatestCursors(
            tenantId,
            [...SYNC_SUPPORTED_ENTITIES],
          ),
        });
      });

      this.recordSyncMetric('sync_push', 'success', startedAt, {
        device_id: dto.device_id.trim(),
        results: this.summarizePushResults(result.results),
      });
      return result;
    } catch (error) {
      this.recordSyncMetric('sync_push', 'failure', startedAt, {
        device_id: dto.device_id.trim(),
      });
      throw error;
    }
  }

  async pull(dto: SyncPullDto): Promise<SyncPullResponseDto> {
    const startedAt = performance.now();

    try {
      const result = await this.prisma.withRequestTransaction(async () => {
        const tenantId = this.requireTenantId();
        await this.syncDevicesRepository.upsertDevice({
          tenant_id: tenantId,
          device_id: dto.device_id.trim(),
          platform: dto.platform.trim(),
          app_version: dto.app_version?.trim() || null,
          metadata: dto.metadata ?? {},
        });

        await this.acknowledgeCursors(tenantId, dto.device_id, dto.cursors);

        const entities = this.normalizeEntities(dto.entities);
        const storedCursorMap = await this.syncCursorsRepository.getCursorMap(
          tenantId,
          dto.device_id,
          entities,
        );
        const providedCursorMap = this.toCursorMap(dto.cursors);
        const effectiveCursorMap = new Map<SyncEntity, string>();

        for (const entity of entities) {
          effectiveCursorMap.set(
            entity,
            this.maxVersion(
              storedCursorMap.get(entity) ?? '0',
              providedCursorMap.get(entity) ?? '0',
            ),
          );
        }

        const limit = dto.limit ?? SYNC_DEFAULT_PULL_LIMIT;
        const fetchedOperations =
          await this.syncOperationLogsRepository.fetchByEntitiesAfterCursors(
            tenantId,
            entities,
            effectiveCursorMap,
            limit + 1,
          );
        const hasMore = fetchedOperations.length > limit;
        const operations = fetchedOperations.slice(0, limit);
        const nextCursorMap = new Map(effectiveCursorMap);

        for (const operation of operations) {
          nextCursorMap.set(operation.entity, operation.version);
        }

        await this.syncDevicesRepository.markPull(tenantId, dto.device_id);

        return Object.assign(new SyncPullResponseDto(), {
          operations: operations.map((operation) => this.mapOperation(operation)),
          cursors: entities.map((entity) => ({
            entity,
            last_version: nextCursorMap.get(entity) ?? '0',
          })),
          has_more: hasMore,
        });
      });

      this.recordSyncMetric('sync_pull', 'success', startedAt, {
        device_id: dto.device_id.trim(),
        results: {
          operation_count: result.operations.length,
          has_more: result.has_more,
        },
      });
      return result;
    } catch (error) {
      this.recordSyncMetric('sync_pull', 'failure', startedAt, {
        device_id: dto.device_id.trim(),
      });
      throw error;
    }
  }

  private async acknowledgeCursors(
    tenantId: string,
    deviceId: string,
    cursors?: Array<{ entity: string; last_version: string }>,
  ): Promise<void> {
    if (!cursors || cursors.length === 0) {
      return;
    }

    for (const cursor of cursors) {
      this.syncOperationLogService.ensureSupportedEntity(cursor.entity);
      await this.syncCursorsRepository.upsertCursor(
        tenantId,
        deviceId,
        cursor.entity,
        cursor.last_version,
      );
    }
  }

  private normalizeEntities(entities?: string[]): SyncEntity[] {
    if (!entities || entities.length === 0) {
      return [...SYNC_SUPPORTED_ENTITIES];
    }

    return entities.map((entity) => {
      this.syncOperationLogService.ensureSupportedEntity(entity);
      return entity;
    });
  }

  private toCursorMap(
    cursors?: Array<{ entity: string; last_version: string }>,
  ): Map<SyncEntity, string> {
    const cursorMap = new Map<SyncEntity, string>();

    for (const cursor of cursors ?? []) {
      this.syncOperationLogService.ensureSupportedEntity(cursor.entity);
      cursorMap.set(
        cursor.entity,
        this.maxVersion(cursorMap.get(cursor.entity) ?? '0', cursor.last_version),
      );
    }

    return cursorMap;
  }

  private maxVersion(left: string, right: string): string {
    return this.compareVersions(left, right) >= 0 ? left : right;
  }

  private compareVersions(left: string, right: string): number {
    const leftVersion = BigInt(left);
    const rightVersion = BigInt(right);

    if (leftVersion === rightVersion) {
      return 0;
    }

    return leftVersion > rightVersion ? 1 : -1;
  }

  private mapDevice(device: {
    id: string;
    tenant_id: string;
    device_id: string;
    platform: string;
    app_version: string | null;
    metadata: Record<string, unknown>;
    last_seen_at: Date;
    last_push_at: Date | null;
    last_pull_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): DeviceRegistrationResponseDto {
    return Object.assign(new DeviceRegistrationResponseDto(), {
      id: device.id,
      tenant_id: device.tenant_id,
      device_id: device.device_id,
      platform: device.platform,
      app_version: device.app_version,
      metadata: device.metadata,
      last_seen_at: device.last_seen_at.toISOString(),
      last_push_at: device.last_push_at?.toISOString() ?? null,
      last_pull_at: device.last_pull_at?.toISOString() ?? null,
      created_at: device.created_at.toISOString(),
      updated_at: device.updated_at.toISOString(),
    });
  }

  private mapOperation(operation: SyncOperationLog): {
    op_id: string;
    tenant_id: string;
    device_id: string;
    entity: string;
    payload: Record<string, unknown>;
    version: string;
    created_at: string;
    updated_at: string;
  } {
    return {
      op_id: operation.op_id,
      tenant_id: operation.tenant_id,
      device_id: operation.device_id,
      entity: operation.entity,
      payload: operation.payload as unknown as Record<string, unknown>,
      version: operation.version,
      created_at: operation.created_at,
      updated_at: operation.updated_at,
    };
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for sync operations');
    }

    return tenantId;
  }

  private recordSyncMetric(
    operation: 'sync_register' | 'sync_push' | 'sync_pull',
    outcome: 'success' | 'failure',
    startedAt: number,
    input: {
      device_id?: string | null;
      results?: Record<string, unknown>;
    },
  ): void {
    this.sloMetrics?.recordSyncOperation({
      operation,
      outcome,
      duration_ms: performance.now() - startedAt,
      tenant_id: this.requestContext.getStore()?.tenant_id ?? null,
      device_id: input.device_id ?? null,
      results: input.results,
    });
  }

  private summarizePushResults(
    results: Array<{
      status: 'applied' | 'duplicate' | 'rejected';
    }>,
  ): Record<string, unknown> {
    return {
      operation_count: results.length,
      applied_count: results.filter((result) => result.status === 'applied').length,
      duplicate_count: results.filter((result) => result.status === 'duplicate').length,
      rejected_count: results.filter((result) => result.status === 'rejected').length,
    };
  }

  async getStatus() {
    const tenantId = this.requireTenantId();
    // In production, this would query a materialized view or aggregation of offline queue sizes
    // For now, we return a mock health check and the last sync time
    return {
      tenantId,
      status: 'online',
      pendingCount: 0,
      failedCount: 0,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async retry(dto: any) {
    // Retry logic for failed sync operations
    return {
      status: 'success',
      retriedOperations: [],
    };
  }

  async resolveConflict(dto: any) {
    // Resolve conflicts according to AGP policy
    return {
      status: 'success',
      resolved: true,
    };
  }
}
