import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccountantCommandService {
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

  async getExpenses() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM finance_expenses WHERE tenant_id = $1 ORDER BY expense_date DESC`,
      [tenantId]
    );
    return res.rows;
  }
}
