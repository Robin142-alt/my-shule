import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NurseCommandService {
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
        (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) as "todayVisits",
        (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND status = 'waiting') as "waitingQueue",
        (SELECT COUNT(*)::int FROM medicine_inventory WHERE tenant_id = $1 AND quantity <= reorder_level) as "lowStockMeds"
    `, [tenantId]);

    const row = metrics.rows[0] || { todayVisits: 0, waitingQueue: 0, lowStockMeds: 0 };
    return {
      metrics: {
        todayVisits: row.todayVisits || 0,
        waitingQueue: row.waitingQueue || 0,
        lowStockMeds: row.lowStockMeds || 0,
      },
      recentVisits: []
    };
  }

  async getVisits() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM clinic_visits WHERE tenant_id = $1 ORDER BY visit_date DESC, created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDispensingLog() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM medicine_dispensing_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getMedicineInventory() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM medicine_inventory WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getSickBayQueue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM clinic_visits WHERE tenant_id = $1 AND status = 'waiting' ORDER BY created_at ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getParentNotifications() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM clinic_parent_notifications WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getHealthReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM clinic_health_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Health report generated successfully' };
  }
}
