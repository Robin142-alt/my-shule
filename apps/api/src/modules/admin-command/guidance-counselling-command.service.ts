import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class GuidanceCounsellingCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for counselling operations');
    }
    const normalized = this.operations.uuidOrNull(userId);
    if (!normalized) {
      throw new UnauthorizedException('Authenticated user must be a valid UUID');
    }
    return normalized;
  }

  private requireSchoolId(dto?: any): string {
    const context = this.requestContext.getStore() as ({ school_id?: unknown } | undefined);
    const schoolId = dto?.school_id ?? dto?.schoolId ?? context?.school_id;
    const normalized = this.operations.uuidOrNull(schoolId);
    if (!normalized) {
      throw new BadRequestException('School context is required for counselling referrals');
    }
    return normalized;
  }

  private requireUuid(value: unknown, label: string): string {
    const normalized = this.operations.uuidOrNull(value);
    if (!normalized) {
      throw new BadRequestException(`${label} must be a valid UUID`);
    }
    return normalized;
  }

  private normalizeRiskLevel(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
    const riskLevel = String(value ?? 'medium').trim().toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
      return riskLevel as 'low' | 'medium' | 'high' | 'critical';
    }
    throw new BadRequestException('Risk level must be low, medium, high, or critical');
  }

  private normalizeReferralStatus(value: unknown): 'open' | 'accepted' | 'declined' | 'closed' {
    const status = String(value ?? '').trim().toLowerCase();
    if (['open', 'accepted', 'declined', 'closed'].includes(status)) {
      return status as 'open' | 'accepted' | 'declined' | 'closed';
    }
    throw new BadRequestException('Referral status must be open, accepted, declined, or closed');
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

  async createReferral(dto: any) {
    const tenantId = this.requireTenantId();
    const schoolId = this.requireSchoolId(dto);
    const actorUserId = this.requireUserId();
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const classId = this.requireUuid(dto?.class_id ?? dto?.classId, 'Class');
    const academicTermId = this.requireUuid(dto?.academic_term_id ?? dto?.academicTermId, 'Academic term');
    const academicYearId = this.requireUuid(dto?.academic_year_id ?? dto?.academicYearId, 'Academic year');
    const incidentId = this.operations.uuidOrNull(dto?.incident_id ?? dto?.incidentId);
    const counsellorUserId = this.operations.uuidOrNull(dto?.counsellor_user_id ?? dto?.counsellorUserId);
    const reason = this.operations.requiredText(dto?.reason ?? dto?.summary, 'Referral reason');
    const riskLevel = this.normalizeRiskLevel(dto?.risk_level ?? dto?.riskLevel);

    const result = await this.operations.writeSql(
      `
        INSERT INTO counselling_referrals (
          tenant_id,
          school_id,
          student_id,
          class_id,
          academic_term_id,
          academic_year_id,
          incident_id,
          referred_by_user_id,
          counsellor_user_id,
          reason,
          risk_level,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8::uuid, $9::uuid, $10, $11, 'open', NOW(), NOW())
        RETURNING *
      `,
      [
        tenantId,
        schoolId,
        studentId,
        classId,
        academicTermId,
        academicYearId,
        incidentId,
        actorUserId,
        counsellorUserId,
        reason,
        riskLevel,
      ],
    );
    const referral = result.rows[0];
    if (!referral) {
      throw new BadRequestException('Counselling referral could not be created');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'principal', 'deputy_principal', 'class_teacher'],
      eventType: 'counselling.referral.created',
      entityType: 'counselling_referral',
      entityId: referral.id,
      title: 'Counselling: Referral Created',
      message: reason,
      priority: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'normal',
      payload: { ...dto, referral_id: referral.id, risk_level: riskLevel },
    });

    return { referral, workflow };
  }

  async updateReferralStatus(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const referralId = this.requireUuid(id, 'Counselling referral');
    const status = this.normalizeReferralStatus(dto?.status);
    const responseNote = String(dto?.response_note ?? dto?.responseNote ?? dto?.note ?? '').trim() || null;
    const counsellorUserId = this.operations.uuidOrNull(dto?.counsellor_user_id ?? dto?.counsellorUserId) ?? (status === 'accepted' ? actorUserId : null);

    const result = await this.operations.writeSql(
      `
        UPDATE counselling_referrals
        SET
          status = $3,
          response_note = COALESCE($4, response_note),
          counsellor_user_id = COALESCE($5::uuid, counsellor_user_id),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, referralId, status, responseNote, counsellorUserId],
    );
    const referral = result.rows[0];
    if (!referral) {
      throw new BadRequestException('Counselling referral was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'principal', 'deputy_principal', 'class_teacher'],
      eventType: 'counselling.referral.status_updated',
      entityType: 'counselling_referral',
      entityId: referral.id,
      title: `Counselling: Referral ${status.replace(/\b\w/g, (char) => char.toUpperCase())}`,
      message: responseNote,
      priority: status === 'accepted' ? 'high' : 'normal',
      payload: { ...dto, status },
    });

    return { referral, workflow };
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
    return this.operations.listReportSnapshots(tenantId, 'guidance-counselling-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, sessions, referrals, welfareNotes, followUps, parentEngagement] = await Promise.all([
      this.getOverview(),
      this.getSessions(),
      this.getReferrals(),
      this.getWelfareNotes(),
      this.getFollowUps(),
      this.getParentEngagement(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'guidance-counselling-command',
      reportId: 'counselling-operations',
      title: String(dto?.name || dto?.title || 'Counselling operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, sessions, referrals, welfareNotes, followUps, parentEngagement },
      filters: { requested_from: 'guidance-counselling-dashboard' },
      targetRoles: ['principal', 'counsellor', 'deputy_principal'],
    });
  }

  async saveSettings(dto: any) {
    const tenantId = this.requireTenantId();
    const visibility = String(dto?.default_case_visibility ?? 'restricted').trim().toLowerCase();
    if (!['restricted', 'private', 'team'].includes(visibility)) {
      throw new BadRequestException('Default case visibility must be restricted, private, or team');
    }
    const payload = {
      notify_referrer_on_acceptance: Boolean(dto?.notify_referrer_on_acceptance),
      require_audit_reason: Boolean(dto?.require_audit_reason),
      default_case_visibility: visibility,
      source_dashboard: 'counsellor-command-center',
    };
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'principal', 'system_monitor'],
      eventType: 'counselling.settings.saved',
      entityType: 'counselling_settings',
      entityId: null,
      title: 'Counselling settings saved',
      message: 'Counsellor privacy and notification settings were saved.',
      priority: 'normal',
      payload,
    });
    return { success: true, event };
  }

  async recordCounsellingAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'principal', 'deputy_principal', 'class_teacher'],
      eventType: `counselling.${action}`,
      entityType: 'counselling_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title: `Counselling: ${action.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`,
      message: dto?.summary ?? dto?.notes ?? dto?.reason ?? dto?.message ?? null,
      priority: action.includes('flag') || action.includes('referral') ? 'high' : 'normal',
      payload: { action, ...dto },
    });
  }
}
