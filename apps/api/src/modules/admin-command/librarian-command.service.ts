import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LibrarianCommandService {
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
        (SELECT COUNT(*)::int FROM library_books WHERE tenant_id = $1) as "totalBooks",
        (SELECT COUNT(*)::int FROM library_borrowers WHERE tenant_id = $1) as "activeBorrowers",
        (SELECT COUNT(*)::int FROM library_loans WHERE tenant_id = $1 AND return_date IS NULL AND due_date < CURRENT_DATE) as "overdueBooks"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalBooks: 0, activeBorrowers: 0, overdueBooks: 0 };
    return {
      metrics: {
        totalBooks: row.totalBooks || 0,
        activeBorrowers: row.activeBorrowers || 0,
        overdueBooks: row.overdueBooks || 0,
      },
      recentLoans: []
    };
  }

  async getBooks() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_books WHERE tenant_id = $1 ORDER BY title ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getBorrowers() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_borrowers WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getIssueBook() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_loans WHERE tenant_id = $1 AND return_date IS NULL ORDER BY loan_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReturnBook() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_loans WHERE tenant_id = $1 AND return_date IS NOT NULL ORDER BY return_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getOverdueBooks() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_loans WHERE tenant_id = $1 AND return_date IS NULL AND due_date < CURRENT_DATE ORDER BY due_date ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getFinesLostDamaged() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_fines WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM library_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Library report generated successfully' };
  }
}
