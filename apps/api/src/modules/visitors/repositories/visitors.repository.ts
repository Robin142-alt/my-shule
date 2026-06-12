import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class VisitorsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createAppointment(tenantId: string, data: any) {
    const result = await this.databaseService.query(
      `INSERT INTO visitors_appointments 
       (tenant_id, visitor_name, host_user_id, purpose, appointment_time, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, data.visitor_name, data.host_user_id, data.purpose, data.appointment_time, data.created_by_user_id]
    );
    return result.rows?.[0];
  }

  async listAppointments(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM visitors_appointments WHERE tenant_id = $1 ORDER BY appointment_time DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async logVisitor(tenantId: string, data: any) {
    const result = await this.databaseService.query(
      `INSERT INTO visitors_logs 
       (tenant_id, visitor_name, phone_number, purpose, host_user_id, badge_number, logged_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, data.visitor_name, data.phone_number, data.purpose, data.host_user_id, data.badge_number, data.logged_by_user_id]
    );
    return result.rows?.[0];
  }

  async listVisitorLogs(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 ORDER BY time_in DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async checkOutVisitor(tenantId: string, logId: string) {
    const result = await this.databaseService.query(
      `UPDATE visitors_logs 
       SET time_out = NOW(), status = 'checked_out'
       WHERE tenant_id = $1 AND id = $2 AND status = 'active'
       RETURNING *`,
      [tenantId, logId]
    );
    return result.rows?.[0];
  }

  async logStudentExit(tenantId: string, data: any) {
    const result = await this.databaseService.query(
      `INSERT INTO student_exits 
       (tenant_id, student_id, reason, authorized_by_user_id, picked_up_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, data.student_id, data.reason, data.authorized_by_user_id, data.picked_up_by]
    );
    return result.rows?.[0];
  }

  async listStudentExits(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM student_exits WHERE tenant_id = $1 ORDER BY time_out DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows ?? [];
  }

  async returnStudent(tenantId: string, exitId: string) {
    const result = await this.databaseService.query(
      `UPDATE student_exits 
       SET time_in = NOW(), status = 'returned'
       WHERE tenant_id = $1 AND id = $2 AND status = 'out'
       RETURNING *`,
      [tenantId, exitId]
    );
    return result.rows?.[0];
  }
}
