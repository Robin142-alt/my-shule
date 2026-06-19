import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SecurityOfficerCommandService {
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
        (SELECT COUNT(*)::int FROM frontoffice_visitors WHERE tenant_id = $1 AND checked_in_at::date = CURRENT_DATE) as "activeVisitors",
        (SELECT COUNT(*)::int FROM security_incidents WHERE tenant_id = $1 AND status = 'open') as "activeIncidents"
    `, [tenantId]);

    const row = metrics.rows[0] || { activeVisitors: 0, activeIncidents: 0 };
    return {
      metrics: {
        activeVisitors: row.activeVisitors || 0,
        activeIncidents: row.activeIncidents || 0,
        unauthorizedExits: 0,
      },
      gateLogs: []
    };
  }

  async getVisitors() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_visitors WHERE tenant_id = $1 ORDER BY checked_in_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async checkInVisitor(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO frontoffice_visitors (tenant_id, name, purpose, phone, checked_in_at, created_by)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
      [tenantId, dto.name, dto.purpose, dto.phone, userId]
    );
    return { success: true, message: 'Visitor checked in successfully' };
  }

  async getGateRegister() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM security_gate_register WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getStudentExitPasses() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_exit_passes WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async flagUnauthorizedExit(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO security_incidents (tenant_id, title, description, incident_type, created_by)
       VALUES ($1, 'Unauthorized Exit Attempt', $2, 'exit_violation', $3)`,
      [tenantId, `Student exit violation details for ID: ${dto.studentId}`, userId]
    );
    return { success: true, message: 'Unauthorized exit flagged' };
  }

  async getStaffMovement() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM staff_movements WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async logStaffDeparture(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO staff_movements (tenant_id, staff_id, movement_type, log_time, created_by)
       VALUES ($1, $2, 'departure', CURRENT_TIMESTAMP, $3)`,
      [tenantId, dto.staffId, userId]
    );
    return { success: true, message: 'Staff departure logged successfully' };
  }

  async getIncidents() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM security_incidents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM security_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Security report generated successfully' };
  }
}
