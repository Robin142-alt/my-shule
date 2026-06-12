import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SecretaryService {
  private readonly logger = new Logger(SecretaryService.name);

  constructor(private readonly db: DatabaseService) {}

  async getQueueTickets(tenantId: string) {
    return this.db.query(
      `SELECT * FROM secretary_queue_tickets WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async createQueueTicket(tenantId: string, userId: string, data: any) {
    return this.db.query(
      `INSERT INTO secretary_queue_tickets (tenant_id, ticket_number, visitor_name, purpose, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, data.ticket_number, data.visitor_name, data.purpose, userId]
    );
  }

  async getParentRequests(tenantId: string) {
    return this.db.query(
      `SELECT * FROM parent_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async getVisitorLogs(tenantId: string) {
    return this.db.query(
      `SELECT * FROM visitor_logs WHERE tenant_id = $1 ORDER BY check_in DESC`,
      [tenantId]
    );
  }

  async getCallLogs(tenantId: string) {
    return this.db.query(
      `SELECT * FROM call_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async getAppointments(tenantId: string) {
    return this.db.query(
      `SELECT * FROM appointments WHERE tenant_id = $1 ORDER BY appointment_date DESC, start_time DESC`,
      [tenantId]
    );
  }

  async getOfficeDocuments(tenantId: string) {
    return this.db.query(
      `SELECT * FROM office_documents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }
}
