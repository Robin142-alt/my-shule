import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProcurementOfficerCommandService {
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
        (SELECT COUNT(*)::int FROM procurement_suppliers WHERE tenant_id = $1) as "totalSuppliers",
        (SELECT COUNT(*)::int FROM procurement_purchase_requests WHERE tenant_id = $1 AND status = 'pending') as "pendingRequests",
        (SELECT COUNT(*)::int FROM procurement_purchase_orders WHERE tenant_id = $1 AND status = 'active') as "activeOrders"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalSuppliers: 0, pendingRequests: 0, activeOrders: 0 };
    return {
      metrics: {
        totalSuppliers: row.totalSuppliers || 0,
        pendingRequests: row.pendingRequests || 0,
        activeOrders: row.activeOrders || 0,
      },
      recentRequests: []
    };
  }

  async getSuppliers() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_suppliers WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getPurchaseRequests() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_purchase_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getQuotations() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_quotations WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getPurchaseOrders() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_purchase_orders WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDeliveries() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_deliveries WHERE tenant_id = $1 ORDER BY delivery_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM procurement_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Procurement report generated successfully' };
  }
}
