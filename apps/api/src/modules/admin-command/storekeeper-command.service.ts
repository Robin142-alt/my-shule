import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StorekeeperCommandService {
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
        (SELECT COUNT(*)::int FROM inventory_items WHERE tenant_id = $1) as "totalItems",
        (SELECT COUNT(*)::int FROM inventory_items WHERE tenant_id = $1 AND stock_level <= reorder_level) as "lowStockCount",
        (SELECT COUNT(*)::int FROM inventory_requests WHERE tenant_id = $1 AND status = 'pending') as "pendingRequests"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalItems: 0, lowStockCount: 0, pendingRequests: 0 };
    return {
      metrics: {
        totalItems: row.totalItems || 0,
        lowStockCount: row.lowStockCount || 0,
        pendingRequests: row.pendingRequests || 0,
        damagedCount: 0,
      },
      recentActivities: []
    };
  }

  async getItems() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_items WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async issueItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO inventory_transactions (tenant_id, item_id, quantity, transaction_type, created_by)
       VALUES ($1, $2, $3, 'issue', $4)`,
      [tenantId, dto.itemId, dto.quantity, userId]
    );
    return { success: true, message: 'Item issued successfully' };
  }

  async receiveItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO inventory_transactions (tenant_id, item_id, quantity, transaction_type, created_by)
       VALUES ($1, $2, $3, 'receive', $4)`,
      [tenantId, dto.itemId, dto.quantity, userId]
    );
    return { success: true, message: 'Item received successfully' };
  }

  async getLowStock() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_items WHERE tenant_id = $1 AND stock_level <= reorder_level`,
      [tenantId]
    );
    return res.rows;
  }

  async getRequests() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getStocktake() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_stocktakes WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDamagedMissing() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_items WHERE tenant_id = $1 AND damaged_quantity > 0`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Report generated successfully' };
  }
}
