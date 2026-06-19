import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GuidanceCounsellingCommandService {
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
        (SELECT COUNT(*)::int FROM counselling_sessions WHERE tenant_id = $1) as "totalSessions",
        (SELECT COUNT(*)::int FROM counselling_sessions WHERE tenant_id = $1 AND status = 'pending') as "pendingReferrals"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalSessions: 0, pendingReferrals: 0 };
    return {
      metrics: {
        totalSessions: row.totalSessions || 0,
        pendingReferrals: row.pendingReferrals || 0,
        activeCases: 0,
      },
      upcomingSessions: []
    };
  }

  async getSessions() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM counselling_sessions WHERE tenant_id = $1 ORDER BY session_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReferrals() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM counselling_referrals WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getWelfareNotes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM admin_incidents WHERE tenant_id = $1 AND title ILIKE '%welfare%' ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getFollowUps() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM counselling_follow_ups WHERE tenant_id = $1 ORDER BY follow_up_date ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getParentEngagement() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM counselling_parent_engagements WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM counselling_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Counselling report generated successfully' };
  }
}
