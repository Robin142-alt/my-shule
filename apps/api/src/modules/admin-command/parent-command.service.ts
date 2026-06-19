import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ParentCommandService {
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

  async getDashboard() {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id;
    const res = await this.executeSql(
      `SELECT * FROM parents WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    const parent = res.rows[0] || { first_name: 'Parent', last_name: '' };
    return {
      parent,
      children: [],
      summary: {
        outstandingFees: 0,
      }
    };
  }

  async getDownloads() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM parent_shared_files WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getHealth() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM clinic_visits WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getMessages() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM parent_messages WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getNotifications() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM notifications WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }
}
