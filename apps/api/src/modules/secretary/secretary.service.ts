import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SecretaryService {

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

  private readonly logger = new Logger(SecretaryService.name);

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService) {}

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
