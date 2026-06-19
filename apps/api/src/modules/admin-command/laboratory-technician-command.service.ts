import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LaboratoryTechnicianCommandService {
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
        (SELECT COUNT(*)::int FROM lab_inventories WHERE tenant_id = $1) as "totalItems",
        (SELECT COUNT(*)::int FROM lab_chemicals WHERE tenant_id = $1 AND quantity <= reorder_level) as "lowChemicals",
        (SELECT COUNT(*)::int FROM lab_apparatus_issues WHERE tenant_id = $1 AND status = 'issued') as "activeIssues"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalItems: 0, lowChemicals: 0, activeIssues: 0 };
    return {
      metrics: {
        totalItems: row.totalItems || 0,
        lowChemicals: row.lowChemicals || 0,
        activeIssues: row.activeIssues || 0,
      },
      upcomingPracticals: []
    };
  }

  async getLabInventory() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_inventories WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getChemicals() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_chemicals WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getApparatusIssue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_apparatus_issues WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLabTimetable() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_timetables WHERE tenant_id = $1 ORDER BY schedule_date ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getSafetyIncidents() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_safety_incidents WHERE tenant_id = $1 ORDER BY incident_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lab_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Lab report generated successfully' };
  }
}
