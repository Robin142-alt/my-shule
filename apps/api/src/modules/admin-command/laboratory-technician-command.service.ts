import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class LaboratoryTechnicianCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
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
    return this.operations.listReportSnapshots(tenantId, 'laboratory-technician-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, labInventory, chemicals, apparatusIssue, labTimetable, safetyIncidents] = await Promise.all([
      this.getOverview(),
      this.getLabInventory(),
      this.getChemicals(),
      this.getApparatusIssue(),
      this.getLabTimetable(),
      this.getSafetyIncidents(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'laboratory-technician-command',
      reportId: 'laboratory-operations',
      title: String(dto?.name || dto?.title || 'Laboratory operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, labInventory, chemicals, apparatusIssue, labTimetable, safetyIncidents },
      filters: { requested_from: 'laboratory-technician-dashboard' },
      targetRoles: ['principal', 'laboratory_technician', 'dean_academics'],
    });
  }

  async recordLaboratoryAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'laboratory_technician',
      targetRoles: ['laboratory_technician', 'dean_academics', 'principal', 'teacher'],
      eventType: `laboratory.${action}`,
      entityType: 'laboratory_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title: `Laboratory: ${action.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`,
      message: dto?.description ?? dto?.notes ?? dto?.reason ?? null,
      priority: action.includes('incident') || action.includes('dispose') ? 'high' : 'normal',
      payload: { action, ...dto },
    });
  }
}
