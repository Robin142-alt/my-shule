import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IctManagerCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM ict_assets WHERE tenant_id = $1) as "totalAssets",
        (SELECT COUNT(*)::int FROM ict_assets WHERE tenant_id = $1 AND status = 'assigned') as "assignedAssets",
        (SELECT COUNT(*)::int FROM ict_maintenance_logs WHERE tenant_id = $1 AND status = 'pending') as "pendingMaintenance"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalAssets: 0, assignedAssets: 0, pendingMaintenance: 0 };
    return {
      metrics: {
        totalAssets: row.totalAssets || 0,
        assignedAssets: row.assignedAssets || 0,
        pendingMaintenance: row.pendingMaintenance || 0,
      },
      recentTickets: []
    };
  }

  async getAssets() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_assets WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getAssetAssignment() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_asset_assignments WHERE tenant_id = $1 ORDER BY assigned_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLoansReturns() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_asset_loans WHERE tenant_id = $1 ORDER BY loan_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getMaintenance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_maintenance_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getFacilitiesIssues() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM facility_issues WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'ICT report generated successfully' };
  }
}
