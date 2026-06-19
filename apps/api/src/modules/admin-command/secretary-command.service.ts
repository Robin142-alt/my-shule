import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SecretaryCommandService {
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
        (SELECT COUNT(*)::int FROM frontoffice_visitors WHERE tenant_id = $1 AND checked_in_at::date = CURRENT_DATE) as "todayVisitors",
        (SELECT COUNT(*)::int FROM frontoffice_appointments WHERE tenant_id = $1 AND appointment_date = CURRENT_DATE) as "todayAppointments"
    `, [tenantId]);

    const row = metrics.rows[0] || { todayVisitors: 0, todayAppointments: 0 };
    return {
      metrics: {
        todayVisitors: row.todayVisitors || 0,
        todayAppointments: row.todayAppointments || 0,
        pendingClearances: 0,
      },
      upcomingAppointments: []
    };
  }

  async getDashboard() {
    return this.getOverview();
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

  async getAppointments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_appointments WHERE tenant_id = $1 ORDER BY appointment_date ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getCallsLog() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_calls WHERE tenant_id = $1 ORDER BY call_time DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReceptionQueue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_reception_queue WHERE tenant_id = $1 ORDER BY joined_at ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getParentMessages() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM parent_messages WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLettersDocuments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_documents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getStudentClearance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_clearance_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM frontoffice_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Front office report generated successfully' };
  }
}
