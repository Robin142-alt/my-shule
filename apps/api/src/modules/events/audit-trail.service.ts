import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditTrailService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAuditLogsForAggregate(tenantId: string, aggregateId: string) {
    const result = await this.databaseService.query(
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

  async getRecentAuditLogs(tenantId: string, limit: number = 50) {
    const result = await this.databaseService.query(
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
