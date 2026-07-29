import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditTrailService {
  private static readonly UUID_PATTERN =
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  constructor(private readonly prisma: PrismaService) {}

  private async queryWithTenant<T = any>(
    tenantId: string,
    userId: string | null,
    query: string,
    params: any[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (typeof (this.prisma as any).executeWithTenant === 'function') {
      return this.prisma.executeWithTenant(tenantId, userId, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    }

    if (typeof (this.prisma as any).query === 'function') {
      return (this.prisma as any).query(query, params);
    }

    const result = await this.prisma.$queryRawUnsafe(query, ...params);
    const arr = Array.isArray(result) ? result : [result];
    return { rows: arr, rowCount: arr.length };
  }

  private async executeWithTenant(
    tenantId: string,
    userId: string | null,
    query: string,
    params: any[],
  ): Promise<void> {
    if (typeof (this.prisma as any).executeWithTenant === 'function') {
      await this.prisma.executeWithTenant(tenantId, userId, async (tx: any) => {
        await tx.$executeRawUnsafe(query, ...params);
      });
      return;
    }

    if (typeof (this.prisma as any).query === 'function') {
      await (this.prisma as any).query(query, params);
      return;
    }

    await this.prisma.$executeRawUnsafe(query, ...params);
  }

  async getAuditLogsForAggregate(tenantId: string, aggregateId: string) {
    const result = await this.queryWithTenant(
      tenantId,
      null,
      `
      SELECT * FROM audit_logs
      WHERE tenant_id = $1
        AND (aggregate_id::text = $2 OR entity_id = $2)
      ORDER BY occurred_at DESC
      LIMIT 100
      `,
      [tenantId, aggregateId],
    );
    return result.rows;
  }

  async createAuditLog(
    tenantId: string,
    userId: string | null,
    action: string,
    aggregateType: string,
    aggregateId: string,
    metadata: any,
  ) {
    await this.executeWithTenant(
      tenantId,
      userId,
      `
      INSERT INTO audit_logs (
        tenant_id, actor_user_id, action, module, entity_type, entity_id,
        resource_type, resource_id, aggregate_id, metadata
      ) VALUES (
        $1,
        CASE
          WHEN COALESCE($2::text, '') ~* $7
            AND EXISTS (SELECT 1 FROM users WHERE id = $2::uuid)
          THEN $2::uuid
          ELSE NULL
        END,
        $3,
        COALESCE(NULLIF(split_part($3, '.', 1), ''), 'system'),
        $4,
        $5,
        $4,
        CASE WHEN $5::text ~* $7 THEN $5::uuid ELSE NULL END,
        CASE WHEN $5::text ~* $7 THEN $5::uuid ELSE NULL END,
        $6::jsonb
      )
      `,
      [
        tenantId,
        userId,
        action,
        aggregateType,
        aggregateId,
        JSON.stringify(metadata ?? {}),
        AuditTrailService.UUID_PATTERN,
      ],
    );
  }

  async getRecentAuditLogs(tenantId: string, limit: number = 50) {
    const result = await this.queryWithTenant(
      tenantId,
      null,
      `
      SELECT * FROM audit_logs
      WHERE tenant_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2
      `,
      [tenantId, limit],
    );
    return result.rows;
  }
}
