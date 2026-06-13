import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class VisitorsRepository {

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

  async createAppointment(tenantId: string, data: any) {
    const result = await this.executeSql(
      `INSERT INTO visitors_appointments 
       (tenant_id, visitor_name, host_user_id, purpose, appointment_time, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, data.visitor_name, data.host_user_id, data.purpose, data.appointment_time, data.created_by_user_id]
    );
    return result.rows?.[0];
  }

  async listAppointments(tenantId: string) {
    const result = await this.executeSql(
      `SELECT * FROM visitors_appointments WHERE tenant_id = $1 ORDER BY appointment_time DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async logVisitor(tenantId: string, data: any) {
    const result = await this.executeSql(
      `INSERT INTO visitors_logs 
       (tenant_id, visitor_name, phone_number, purpose, host_user_id, badge_number, logged_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, data.visitor_name, data.phone_number, data.purpose, data.host_user_id, data.badge_number, data.logged_by_user_id]
    );
    return result.rows?.[0];
  }

  async listVisitorLogs(tenantId: string) {
    const result = await this.executeSql(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 ORDER BY time_in DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async checkOutVisitor(tenantId: string, logId: string) {
    const result = await this.executeSql(
      `UPDATE visitors_logs 
       SET time_out = NOW(), status = 'checked_out'
       WHERE tenant_id = $1 AND id = $2 AND status = 'active'
       RETURNING *`,
      [tenantId, logId]
    );
    return result.rows?.[0];
  }

  async logStudentExit(tenantId: string, data: any) {
    const result = await this.executeSql(
      `INSERT INTO student_exits 
       (tenant_id, student_id, reason, authorized_by_user_id, picked_up_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, data.student_id, data.reason, data.authorized_by_user_id, data.picked_up_by]
    );
    return result.rows?.[0];
  }

  async listStudentExits(tenantId: string) {
    const result = await this.executeSql(
      `SELECT * FROM student_exits WHERE tenant_id = $1 ORDER BY time_out DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async returnStudent(tenantId: string, exitId: string) {
    const result = await this.executeSql(
      `UPDATE student_exits 
       SET time_in = NOW(), status = 'returned'
       WHERE tenant_id = $1 AND id = $2 AND status = 'out'
       RETURNING *`,
      [tenantId, exitId]
    );
    return result.rows?.[0];
  }
}
