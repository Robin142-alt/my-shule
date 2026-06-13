import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SyncDeviceEntity } from '../entities/sync-device.entity';

interface SyncDeviceRow {
  id: string;
  tenant_id: string;
  device_id: string;
  platform: string;
  app_version: string | null;
  metadata: Record<string, unknown> | null;
  last_seen_at: Date;
  last_push_at: Date | null;
  last_pull_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UpsertSyncDeviceInput {
  tenant_id: string;
  device_id: string;
  platform: string;
  app_version: string | null;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SyncDevicesRepository {

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

  constructor(private readonly prisma: PrismaService) {}

  async upsertDevice(input: UpsertSyncDeviceInput): Promise<SyncDeviceEntity> {
    const result = await this.executeSql<SyncDeviceRow>(
      `
        INSERT INTO sync_devices (
          tenant_id,
          device_id,
          platform,
          app_version,
          metadata,
          last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
        ON CONFLICT (tenant_id, device_id)
        DO UPDATE SET
          platform = EXCLUDED.platform,
          app_version = EXCLUDED.app_version,
          metadata = EXCLUDED.metadata,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING
          id,
          tenant_id,
          device_id,
          platform,
          app_version,
          metadata,
          last_seen_at,
          last_push_at,
          last_pull_at,
          created_at,
          updated_at
      `,
      [
        input.tenant_id,
        input.device_id,
        input.platform,
        input.app_version,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async markPush(tenantId: string, deviceId: string): Promise<void> {
    await this.executeSql(
      `
        UPDATE sync_devices
        SET
          last_seen_at = NOW(),
          last_push_at = NOW(),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND device_id = $2
      `,
      [tenantId, deviceId],
    );
  }

  async markPull(tenantId: string, deviceId: string): Promise<void> {
    await this.executeSql(
      `
        UPDATE sync_devices
        SET
          last_seen_at = NOW(),
          last_pull_at = NOW(),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND device_id = $2
      `,
      [tenantId, deviceId],
    );
  }

  private mapRow(row: SyncDeviceRow): SyncDeviceEntity {
    return Object.assign(new SyncDeviceEntity(), {
      ...row,
      metadata: row.metadata ?? {},
    });
  }
}
