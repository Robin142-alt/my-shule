import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditTrailService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  async getAuditLogsForAggregate(tenantId: string, aggregateId: string) {
    const result = await this.executeSql(
      `
      SELECT * FROM audit_logs
      WHERE tenant_id = $1 AND aggregate_id = $2
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [tenantId, aggregateId]
    );
    return result.rows;
  }

    async createAuditLog(tenantId: string, userId: string | null, action: string, aggregateType: string, aggregateId: string, metadata: any) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, aggregate_type, aggregate_id, metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
      tenantId, userId, action, aggregateType, aggregateId, metadata
    );
  }

  async getRecentAuditLogs(tenantId: string, limit: number = 50) {
    const result = await this.executeSql(
      `
      SELECT * FROM audit_logs
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [tenantId, limit]
    );
    return result.rows;
  }
}
