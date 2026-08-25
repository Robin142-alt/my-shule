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

  private async requireCanonicalSchoolId(dto?: any): Promise<string> {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{ school_id: string }>(
      `
        SELECT id::text AS school_id
        FROM tenants
        WHERE tenant_id::text = $1
        ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END, created_at ASC
        LIMIT 2
      `,
      [tenantId],
    );
    if (result.rows.length !== 1) {
      throw new UnauthorizedException('The authenticated tenant is not linked to one canonical school');
    }

    const schoolId = this.operations.uuidOrNull(result.rows[0]?.school_id);
    if (!schoolId) {
      throw new UnauthorizedException('The authenticated tenant has an invalid school identity');
    }

    const suppliedSchoolId = dto?.school_id ?? dto?.schoolId;
    if (suppliedSchoolId !== undefined && suppliedSchoolId !== null && String(suppliedSchoolId).trim() !== '') {
      const normalizedSuppliedSchoolId = this.operations.uuidOrNull(suppliedSchoolId);
      if (!normalizedSuppliedSchoolId || normalizedSuppliedSchoolId !== schoolId) {
        throw new BadRequestException('School ID does not match the authenticated tenant');
      }
    }

    return schoolId;
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

  private requireDate(value: unknown, label: string): string {
    const date = String(value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
    return date;
  }

  private requireTimestamp(value: unknown, label: string): string {
    const parsed = new Date(String(value ?? ''));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} must be a valid date and time`);
    }
    return parsed.toISOString();
  }

  private optionalText(value: unknown, maxLength = 2000): string | null {
    const text = String(value ?? '').trim();
    return text ? text.slice(0, maxLength) : null;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getReferralOptions() {
    const tenantId = this.requireTenantId();
    const [students, classes, terms, years, incidents] = await Promise.all([
      this.executeSql<{ id: string; label: string; class_id: string | null }>(
        `
          SELECT
            student.id::text,
            CONCAT_WS(
              ' - ',
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              NULLIF(student.admission_number, '')
            ) AS label,
            student.current_class_id AS class_id
          FROM students student
          WHERE student.tenant_id = $1
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
          ORDER BY student.last_name ASC, student.first_name ASC, student.admission_number ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string }>(
        `
          SELECT
            section.id::text,
            COALESCE(
              NULLIF(section.custom_label, ''),
              NULLIF(TRIM(CONCAT_WS(' ', section.grade_level, section.stream)), ''),
              NULLIF(section.name, ''),
              section.id::text
            ) AS label
          FROM class_sections section
          WHERE section.tenant_id = $1
            AND COALESCE(section.is_active, true) = true
          ORDER BY section.grade_level ASC, section.stream ASC, section.name ASC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string; status: string | null }>(
        `
          SELECT
            term.id::text,
            CONCAT(term.name, ' (', term.starts_on::text, ' to ', term.ends_on::text, ')') AS label,
            term.status
          FROM academic_terms term
          WHERE term.tenant_id = $1
          ORDER BY CASE WHEN term.status = 'active' THEN 0 ELSE 1 END, term.starts_on DESC
          LIMIT 24
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string; status: string | null }>(
        `
          SELECT
            year.id::text,
            year.name AS label,
            year.status
          FROM academic_years year
          WHERE year.tenant_id = $1
          ORDER BY CASE WHEN year.status = 'active' THEN 0 ELSE 1 END, year.starts_on DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string }>(
        `
          SELECT
            incident.id::text,
            CONCAT(incident.title, ' - ', incident.created_at::date::text) AS label
          FROM admin_incidents incident
          WHERE incident.tenant_id = $1
            AND LOWER(COALESCE(incident.status, 'reported')) IN ('reported', 'reviewed', 'escalated')
          ORDER BY incident.created_at DESC
          LIMIT 100
        `,
        [tenantId],
      ),
    ]);

    return {
      students: students.rows,
      classes: classes.rows,
      terms: terms.rows,
      years: years.rows,
      incidents: incidents.rows,
    };
  }

  async getWorkspaceOptions() {
    const tenantId = this.requireTenantId();
    const [base, guardians, referrals] = await Promise.all([
      this.getReferralOptions(),
      this.executeSql<{ id: string; label: string; student_id: string }>(
        `
          SELECT
            guardian.id::text,
            CONCAT_WS(
              ' - ',
              NULLIF(guardian.display_name, ''),
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '')
            ) AS label,
            guardian.student_id::text
          FROM student_guardians guardian
          INNER JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
           AND student.deleted_at IS NULL
          WHERE guardian.tenant_id = $1
            AND guardian.status <> 'revoked'
          ORDER BY guardian.display_name ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string; student_id: string }>(
        `
          SELECT
            referral.id::text,
            CONCAT(
              TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)),
              ' - ',
              LEFT(referral.reason, 80)
            ) AS label,
            referral.student_id::text
          FROM counselling_referrals referral
          INNER JOIN students student
            ON student.tenant_id = referral.tenant_id
           AND student.id = referral.student_id
           AND student.deleted_at IS NULL
          WHERE referral.tenant_id = $1
            AND referral.status IN ('open', 'accepted')
          ORDER BY referral.created_at DESC
          LIMIT 200
        `,
        [tenantId],
      ),
    ]);

    return {
      ...base,
      guardians: guardians.rows,
      referrals: referrals.rows,
    };
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql<{
      active_cases: number;
      sessions_this_week: number;
      referrals_pending: number;
      follow_ups_due: number;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM counselling_referrals WHERE tenant_id = $1 AND status IN ('open', 'accepted')) AS active_cases,
          (
            SELECT COUNT(*)::int
            FROM counselling_sessions
            WHERE tenant_id = $1
              AND scheduled_for >= date_trunc('week', CURRENT_DATE)
              AND scheduled_for < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
          ) AS sessions_this_week,
          (SELECT COUNT(*)::int FROM counselling_referrals WHERE tenant_id = $1 AND status = 'open') AS referrals_pending,
          (
            SELECT COUNT(*)::int
            FROM counselling_followups
            WHERE tenant_id::text = $1
              AND due_date <= CURRENT_DATE
              AND LOWER(status) IN ('pending', 'open')
          ) AS follow_ups_due
      `,
      [tenantId],
    );

    const row = metrics.rows[0] ?? {
      active_cases: 0,
      sessions_this_week: 0,
      referrals_pending: 0,
      follow_ups_due: 0,
    };
    return {
      metrics: {
        active_cases: Number(row.active_cases ?? 0),
        sessions_this_week: Number(row.sessions_this_week ?? 0),
        referrals_pending: Number(row.referrals_pending ?? 0),
        follow_ups_due: Number(row.follow_ups_due ?? 0),
      },
    };
  }

  async getSessions() {
    const tenantId = this.requireTenantId();
    const [metrics, sessions] = await Promise.all([
      this.executeSql<{
        sessions_today: number;
        upcoming: number;
        completed_this_term: number;
      }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE scheduled_for::date = CURRENT_DATE)::int AS sessions_today,
            COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_for >= NOW())::int AS upcoming,
            COUNT(*) FILTER (
              WHERE status = 'completed'
                AND EXISTS (
                  SELECT 1
                  FROM academic_terms term
                  WHERE term.tenant_id = counselling_sessions.tenant_id
                    AND CURRENT_DATE BETWEEN term.starts_on AND term.ends_on
                    AND counselling_sessions.scheduled_for::date BETWEEN term.starts_on AND term.ends_on
                )
            )::int AS completed_this_term
          FROM counselling_sessions
          WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        student_name: string;
        class: string;
        counsellor: string;
        date: string;
        time: string;
        agenda: string;
        location: string;
        status: string;
      }>(
        `
          SELECT
            session.id::text,
            TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(
              NULLIF(section.custom_label, ''),
              NULLIF(TRIM(CONCAT_WS(' ', section.grade_level, section.stream)), ''),
              NULLIF(section.name, ''),
              ''
            ) AS class,
            COALESCE(NULLIF(counsellor.full_name, ''), 'Assigned counsellor') AS counsellor,
            session.scheduled_for::date::text AS date,
            TO_CHAR(session.scheduled_for, 'HH24:MI') AS time,
            COALESCE(NULLIF(session.agenda, ''), 'Counselling session') AS agenda,
            COALESCE(NULLIF(session.location, ''), '') AS location,
            INITCAP(REPLACE(session.status, '_', ' ')) AS status
          FROM counselling_sessions session
          INNER JOIN students student
            ON student.tenant_id = session.tenant_id
           AND student.id = session.student_id
           AND student.deleted_at IS NULL
          LEFT JOIN class_sections section
            ON section.tenant_id = session.tenant_id
           AND section.id::text = student.current_class_id::text
          LEFT JOIN users counsellor
            ON counsellor.id = session.counsellor_user_id
           AND EXISTS (
             SELECT 1
             FROM tenant_memberships membership
             WHERE membership.tenant_id = session.tenant_id
               AND membership.user_id = counsellor.id
           )
          WHERE session.tenant_id = $1
          ORDER BY session.scheduled_for DESC
          LIMIT 200
        `,
        [tenantId],
      ),
    ]);
    const summary = metrics.rows[0] ?? {
      sessions_today: 0,
      upcoming: 0,
      completed_this_term: 0,
    };
    return {
      metrics: {
        sessions_today: Number(summary.sessions_today ?? 0),
        upcoming: Number(summary.upcoming ?? 0),
        completed_this_term: Number(summary.completed_this_term ?? 0),
      },
      sessionsList: sessions.rows,
    };
  }

  async createSession(dto: any) {
    const tenantId = this.requireTenantId();
    const schoolId = await this.requireCanonicalSchoolId(dto);
    const actorUserId = this.requireUserId();
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const referralId = this.operations.uuidOrNull(dto?.referral_id ?? dto?.referralId);
    const scheduledFor = this.requireTimestamp(dto?.scheduled_for ?? dto?.scheduledFor, 'Session date and time');
    const agenda = this.operations.requiredText(dto?.agenda ?? dto?.reason ?? dto?.summary, 'Session agenda');
    const location = this.optionalText(dto?.location, 200);

    const result = await this.operations.writeSql(
      `
        INSERT INTO counselling_sessions (
          tenant_id,
          school_id,
          student_id,
          referral_id,
          counsellor_user_id,
          scheduled_for,
          location,
          agenda,
          status,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2::uuid,
          student.id,
          $4::uuid,
          $5::uuid,
          $6::timestamptz,
          $7,
          $8,
          'scheduled',
          NOW(),
          NOW()
        FROM students student
        LEFT JOIN counselling_referrals referral
          ON referral.tenant_id = student.tenant_id
         AND referral.student_id = student.id
         AND referral.id = $4::uuid
        WHERE student.tenant_id = $1
          AND student.id = $3::uuid
          AND student.deleted_at IS NULL
          AND ($4::uuid IS NULL OR referral.id IS NOT NULL)
        RETURNING *
      `,
      [tenantId, schoolId, studentId, referralId, actorUserId, scheduledFor, location, agenda],
    );
    const session = result.rows[0];
    if (!session) {
      throw new BadRequestException('The learner or referral was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor'],
      eventType: 'counselling.session.created',
      entityType: 'counselling_session',
      entityId: session.id,
      title: 'Counselling session scheduled',
      message: agenda,
      priority: 'normal',
      payload: {
        student_id: studentId,
        referral_id: referralId,
        scheduled_for: scheduledFor,
        location,
        source_dashboard: 'guidance-counselling',
      },
    });

    return { session, workflow };
  }

  async completeSession(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const sessionId = this.requireUuid(id, 'Counselling session');
    const outcomeSummary = this.optionalText(dto?.outcome_summary ?? dto?.outcomeSummary ?? dto?.summary, 4000);
    const result = await this.operations.writeSql(
      `
        UPDATE counselling_sessions
        SET status = 'completed',
            completed_at = NOW(),
            outcome_summary = COALESCE($3, outcome_summary),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, sessionId, outcomeSummary],
    );
    const session = result.rows[0];
    if (!session) {
      throw new BadRequestException('Counselling session was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor'],
      eventType: 'counselling.session.completed',
      entityType: 'counselling_session',
      entityId: sessionId,
      title: 'Counselling session completed',
      message: outcomeSummary,
      priority: 'normal',
      payload: {
        session_id: sessionId,
        source_dashboard: 'guidance-counselling',
      },
    });

    return { session, workflow };
  }

  async getReferrals() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql<{
      id: string;
      student_name: string;
      class: string;
      referred_by: string;
      reason: string;
      risk_level: string;
      date: string;
      status: string;
    }>(
      `
        SELECT
          referral.id::text,
          TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
          COALESCE(
            NULLIF(section.custom_label, ''),
            NULLIF(TRIM(CONCAT_WS(' ', section.grade_level, section.stream)), ''),
            NULLIF(section.name, ''),
            ''
          ) AS class,
          COALESCE(NULLIF(referrer.full_name, ''), '') AS referred_by,
          referral.reason,
          referral.risk_level,
          referral.created_at::date::text AS date,
          INITCAP(REPLACE(referral.status, '_', ' ')) AS status
        FROM counselling_referrals referral
        INNER JOIN students student
          ON student.tenant_id = referral.tenant_id
         AND student.id::text = referral.student_id::text
         AND student.deleted_at IS NULL
        LEFT JOIN class_sections section
          ON section.tenant_id = referral.tenant_id
         AND section.id::text = referral.class_id::text
        LEFT JOIN users referrer
          ON referrer.id = referral.referred_by_user_id
         AND EXISTS (
           SELECT 1
           FROM tenant_memberships membership
           WHERE membership.tenant_id = referral.tenant_id
             AND membership.user_id = referrer.id
         )
        WHERE referral.tenant_id = $1
        ORDER BY referral.created_at DESC
      `,
      [tenantId],
    );
    return {
      metrics: {
        pending_referrals: res.rows.filter((referral) => referral.status.toLowerCase() === 'open').length,
        accepted: res.rows.filter((referral) => referral.status.toLowerCase() === 'accepted').length,
        // The canonical referral table has no external-provider classification.
        // Do not mislabel unassigned referrals as external.
        external: 0,
      },
      referralsList: res.rows,
    };
  }

  async createReferral(dto: any) {
    const tenantId = this.requireTenantId();
    const schoolId = await this.requireCanonicalSchoolId(dto);
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
        SELECT
          $1,
          $2::uuid,
          student.id::uuid,
          class_section.id::uuid,
          academic_term.id::uuid,
          academic_year.id::uuid,
          $7::uuid,
          $8::uuid,
          $9::uuid,
          $10,
          $11,
          'open',
          NOW(),
          NOW()
        FROM students student
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = student.tenant_id
         AND class_section.id::text = $4
         AND COALESCE(class_section.is_active, TRUE) = TRUE
        INNER JOIN academic_terms academic_term
          ON academic_term.tenant_id = student.tenant_id
         AND academic_term.id::text = $5
        INNER JOIN academic_years academic_year
          ON academic_year.tenant_id = student.tenant_id
         AND academic_year.id::text = $6
         AND academic_term.academic_year_id::text = academic_year.id::text
        WHERE student.tenant_id = $1
          AND student.id::text = $3
          AND student.deleted_at IS NULL
          AND (
            student.current_class_id::text = class_section.id::text
            OR EXISTS (
              SELECT 1
              FROM student_class_assignments class_assignment
              WHERE class_assignment.tenant_id = student.tenant_id
                AND class_assignment.student_id::text = student.id::text
                AND class_assignment.class_section_id::text = class_section.id::text
                AND LOWER(COALESCE(class_assignment.status::text, 'active')) = 'active'
            )
          )
          AND (
            $7::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM admin_incidents incident
              WHERE incident.tenant_id = student.tenant_id
                AND incident.id = $7::uuid
            )
          )
          AND (
            $9::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM tenant_memberships counsellor_membership
              WHERE counsellor_membership.tenant_id = student.tenant_id
                AND counsellor_membership.user_id = $9::uuid
                AND LOWER(counsellor_membership.status::text) = 'active'
            )
          )
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
      throw new BadRequestException('The learner, class, academic period, incident, or counsellor was not found in this school');
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
      payload: {
        school_id: schoolId,
        student_id: studentId,
        class_id: classId,
        academic_term_id: academicTermId,
        academic_year_id: academicYearId,
        incident_id: incidentId,
        counsellor_user_id: counsellorUserId,
        referral_id: referral.id,
        risk_level: riskLevel,
        source_dashboard: 'guidance-counselling',
      },
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
        UPDATE counselling_referrals referral
        SET
          status = $3,
          response_note = COALESCE($4, response_note),
          counsellor_user_id = COALESCE($5::uuid, counsellor_user_id),
          updated_at = NOW()
        WHERE referral.tenant_id = $1
          AND referral.id = $2::uuid
          AND (
            $5::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM tenant_memberships counsellor_membership
              WHERE counsellor_membership.tenant_id = referral.tenant_id
                AND counsellor_membership.user_id = $5::uuid
                AND LOWER(counsellor_membership.status::text) = 'active'
            )
          )
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
      payload: {
        referral_id: referral.id,
        status,
        response_note: responseNote,
        counsellor_user_id: counsellorUserId,
        source_dashboard: 'guidance-counselling',
      },
    });

    return { referral, workflow };
  }

  async getWelfareNotes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql<{
      id: string;
      student_name: string;
      class: string;
      note_date: string;
      category: string;
      description: string;
      action_taken: string;
      status: string;
    }>(
      `
        SELECT
          welfare.id::text,
          TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
          COALESCE(
            NULLIF(section.custom_label, ''),
            NULLIF(TRIM(CONCAT_WS(' ', section.grade_level, section.stream)), ''),
            NULLIF(section.name, ''),
            ''
          ) AS class,
          welfare.created_at::date::text AS note_date,
          welfare.category,
          COALESCE(welfare.description, '') AS description,
          COALESCE(welfare.action_taken, '') AS action_taken,
          INITCAP(LOWER(welfare.status)) AS status
        FROM student_welfare_cases welfare
        INNER JOIN students student
          ON student.tenant_id = welfare.tenant_id
         AND student.id = welfare.student_id
         AND student.deleted_at IS NULL
        LEFT JOIN class_sections section
          ON section.tenant_id = student.tenant_id
         AND section.id::text = student.current_class_id::text
        WHERE welfare.tenant_id = $1
        ORDER BY welfare.created_at DESC
        LIMIT 200
      `,
      [tenantId],
    );
    return {
      metrics: {
        active_notes: res.rows.filter((note) => ['open', 'active'].includes(note.status.toLowerCase())).length,
        flagged: res.rows.filter((note) => note.status.toLowerCase() === 'flagged').length,
        resolved: res.rows.filter((note) => ['resolved', 'closed'].includes(note.status.toLowerCase())).length,
      },
      welfareNotesList: res.rows,
    };
  }

  async createWelfareNote(dto: any) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const category = this.operations.requiredText(dto?.category, 'Welfare category').slice(0, 100);
    const description = this.operations.requiredText(dto?.description ?? dto?.notes ?? dto?.summary, 'Welfare note');
    const actionTaken = this.optionalText(dto?.action_taken ?? dto?.actionTaken, 2000);
    const result = await this.operations.writeSql(
      `
        INSERT INTO student_welfare_cases (
          tenant_id, student_id, category, description, action_taken, status, reported_by, created_at, updated_at
        )
        SELECT $1, student.id, $3, $4, $5, 'OPEN', $6::uuid, NOW(), NOW()
        FROM students student
        WHERE student.tenant_id = $1
          AND student.id = $2::uuid
          AND student.deleted_at IS NULL
        RETURNING *
      `,
      [tenantId, studentId, category, description, actionTaken, actorUserId],
    );
    const note = result.rows[0];
    if (!note) {
      throw new BadRequestException('Student was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'class_teacher'],
      eventType: 'counselling.welfare_note.created',
      entityType: 'student_welfare_case',
      entityId: note.id,
      title: 'Student welfare note recorded',
      message: description,
      priority: 'normal',
      payload: {
        student_id: studentId,
        category,
        source_dashboard: 'guidance-counselling',
      },
    });
    return { note, workflow };
  }

  async flagWelfareNote(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const noteId = this.requireUuid(id, 'Welfare note');
    const flagReason = this.optionalText(dto?.reason ?? dto?.notes, 2000);
    const result = await this.operations.writeSql(
      `
        UPDATE student_welfare_cases
        SET status = 'FLAGGED',
            action_taken = COALESCE($3, action_taken),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, noteId, flagReason],
    );
    const note = result.rows[0];
    if (!note) {
      throw new BadRequestException('Welfare note was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor', 'principal', 'deputy_principal', 'class_teacher'],
      eventType: 'counselling.welfare_note.flagged',
      entityType: 'student_welfare_case',
      entityId: noteId,
      title: 'Student welfare note flagged for review',
      message: flagReason,
      priority: 'high',
      payload: {
        note_id: noteId,
        source_dashboard: 'guidance-counselling',
      },
    });
    return { note, workflow };
  }

  async getFollowUps() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql<{
      id: string;
      student_name: string;
      class: string;
      reason: string;
      due_date: string;
      priority: string;
      counsellor: string;
      status: string;
    }>(
      `
        SELECT
          followup.id::text,
          TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
          COALESCE(
            NULLIF(section.custom_label, ''),
            NULLIF(TRIM(CONCAT_WS(' ', section.grade_level, section.stream)), ''),
            NULLIF(section.name, ''),
            ''
          ) AS class,
          followup.reason,
          followup.due_date::text,
          INITCAP(LOWER(COALESCE(followup.priority, 'normal'))) AS priority,
          COALESCE(NULLIF(counsellor.full_name, ''), 'Assigned counsellor') AS counsellor,
          INITCAP(LOWER(followup.status)) AS status
        FROM counselling_followups followup
        INNER JOIN students student
          ON student.tenant_id = followup.tenant_id::text
         AND student.id = followup.student_id
         AND student.deleted_at IS NULL
        LEFT JOIN class_sections section
          ON section.tenant_id = student.tenant_id
         AND section.id::text = student.current_class_id::text
        LEFT JOIN users counsellor
          ON counsellor.id = followup.assigned_to
         AND EXISTS (
           SELECT 1
           FROM tenant_memberships membership
           WHERE membership.tenant_id = student.tenant_id
             AND membership.user_id = counsellor.id
         )
        WHERE followup.tenant_id::text = $1
        ORDER BY followup.due_date ASC, followup.created_at DESC
        LIMIT 200
      `,
      [tenantId],
    );
    const today = new Date().toISOString().slice(0, 10);
    return {
      metrics: {
        pending_followups: res.rows.filter((followUp) => ['pending', 'open'].includes(followUp.status.toLowerCase())).length,
        completed: res.rows.filter((followUp) => ['completed', 'done'].includes(followUp.status.toLowerCase())).length,
        overdue: res.rows.filter((followUp) => (
          followUp.due_date < today
          && ['pending', 'open'].includes(followUp.status.toLowerCase())
        )).length,
      },
      followUpsList: res.rows,
    };
  }

  async createFollowUp(dto: any) {
    const tenantId = this.requireTenantId();
    const schoolId = await this.requireCanonicalSchoolId(dto);
    const actorUserId = this.requireUserId();
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const reason = this.operations.requiredText(dto?.reason ?? dto?.summary, 'Follow-up reason');
    const dueDate = this.requireDate(dto?.due_date ?? dto?.dueDate ?? dto?.follow_up_date, 'Follow-up date');
    const priority = String(dto?.priority ?? 'normal').trim().toLowerCase();
    if (!['low', 'normal', 'medium', 'high', 'critical'].includes(priority)) {
      throw new BadRequestException('Follow-up priority must be low, normal, medium, high, or critical');
    }

    const result = await this.operations.writeSql(
      `
        INSERT INTO counselling_followups (
          tenant_id, school_id, student_id, reason, due_date, priority, assigned_to, status, created_at, updated_at
        )
        SELECT $1::uuid, $2::text, student.id, $4, $5::date, $6, $7::uuid, 'Pending', NOW(), NOW()
        FROM students student
        WHERE student.tenant_id = $1::text
          AND student.id = $3::uuid
          AND student.deleted_at IS NULL
        RETURNING *
      `,
      [tenantId, schoolId, studentId, reason, dueDate, priority, actorUserId],
    );
    const followUp = result.rows[0];
    if (!followUp) {
      throw new BadRequestException('Student was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor'],
      eventType: 'counselling.follow_up.created',
      entityType: 'counselling_followup',
      entityId: followUp.id,
      title: 'Counselling follow-up scheduled',
      message: reason,
      priority: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'normal',
      payload: {
        student_id: studentId,
        due_date: dueDate,
        priority,
        source_dashboard: 'guidance-counselling',
      },
    });
    return { followUp, workflow };
  }

  async completeFollowUp(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const followUpId = this.requireUuid(id, 'Counselling follow-up');
    const notes = this.optionalText(dto?.notes ?? dto?.summary, 4000);
    const result = await this.operations.writeSql(
      `
        UPDATE counselling_followups
        SET status = 'Completed',
            completed_at = NOW(),
            notes = COALESCE($3, notes),
            updated_at = NOW()
        WHERE tenant_id::text = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, followUpId, notes],
    );
    const followUp = result.rows[0];
    if (!followUp) {
      throw new BadRequestException('Counselling follow-up was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor'],
      eventType: 'counselling.follow_up.completed',
      entityType: 'counselling_followup',
      entityId: followUpId,
      title: 'Counselling follow-up completed',
      message: notes,
      priority: 'normal',
      payload: {
        follow_up_id: followUpId,
        source_dashboard: 'guidance-counselling',
      },
    });
    return { followUp, workflow };
  }

  async getParentEngagement() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql<{
      id: string;
      student_name: string;
      parent_name: string;
      date: string;
      type: string;
      reason: string;
      counsellor: string;
      guardian_status: string;
      status: string;
    }>(
      `
        SELECT
          engagement.id::text,
          TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
          COALESCE(NULLIF(guardian.display_name, ''), 'Linked guardian') AS parent_name,
          engagement.created_at::date::text AS date,
          INITCAP(REPLACE(COALESCE(engagement.contact_method, 'contact'), '_', ' ')) AS type,
          engagement.reason,
          COALESCE(NULLIF(counsellor.full_name, ''), 'School counsellor') AS counsellor,
          guardian.status AS guardian_status,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM notifications notification
              WHERE notification.tenant_id = engagement.tenant_id::text
                AND notification.source_module = 'guidance-counselling'
                AND notification.source_record_id = engagement.id::text
            ) THEN 'Queued'
            ELSE 'Logged'
          END AS status
        FROM parent_contact_logs engagement
        INNER JOIN students student
          ON student.tenant_id = engagement.tenant_id::text
         AND student.id = engagement.student_id
         AND student.deleted_at IS NULL
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = student.tenant_id
         AND guardian.student_id = student.id
         AND guardian.id = engagement.guardian_id
         AND guardian.status <> 'revoked'
        LEFT JOIN users counsellor
          ON counsellor.id = engagement.contacted_by
         AND EXISTS (
           SELECT 1
           FROM tenant_memberships membership
           WHERE membership.tenant_id = student.tenant_id
             AND membership.user_id = counsellor.id
         )
        WHERE engagement.tenant_id::text = $1
        ORDER BY engagement.created_at DESC
        LIMIT 200
      `,
      [tenantId],
    );
    return {
      metrics: {
        parent_sessions: res.rows.length,
        pending_invitations: res.rows.filter((engagement) => engagement.guardian_status === 'invited').length,
        notifications_queued: res.rows.filter((engagement) => engagement.status === 'Queued').length,
      },
      parentEngagementList: res.rows,
    };
  }

  async createParentEngagement(dto: any) {
    const tenantId = this.requireTenantId();
    const schoolId = await this.requireCanonicalSchoolId(dto);
    const actorUserId = this.requireUserId();
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const guardianId = this.requireUuid(dto?.guardian_id ?? dto?.guardianId, 'Parent or guardian');
    const method = String(dto?.contact_method ?? dto?.contactMethod ?? dto?.type ?? 'phone').trim().toLowerCase();
    if (!['phone', 'sms', 'email', 'in_person', 'portal'].includes(method)) {
      throw new BadRequestException('Contact method must be phone, SMS, email, in person, or portal');
    }
    const reason = this.operations.requiredText(dto?.reason, 'Engagement reason');
    const summary = this.optionalText(dto?.summary ?? dto?.notes, 4000);
    const agreedAction = this.optionalText(dto?.agreed_action ?? dto?.agreedAction, 2000);
    const followUpDate = dto?.follow_up_date ?? dto?.followUpDate
      ? this.requireDate(dto?.follow_up_date ?? dto?.followUpDate, 'Follow-up date')
      : null;

    const result = await this.operations.writeSql(
      `
        INSERT INTO parent_contact_logs (
          tenant_id, school_id, student_id, guardian_id, contact_method, reason, summary,
          agreed_action, follow_up_date, contacted_by, created_at
        )
        SELECT
          $1::uuid, $2::text, student.id, guardian.id, $5, $6, $7, $8, $9::date, $10::uuid, NOW()
        FROM students student
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = student.tenant_id
         AND guardian.student_id = student.id
         AND guardian.id = $4::uuid
         AND guardian.status <> 'revoked'
        WHERE student.tenant_id = $1::text
          AND student.id = $3::uuid
          AND student.deleted_at IS NULL
        RETURNING *
      `,
      [tenantId, schoolId, studentId, guardianId, method, reason, summary, agreedAction, followUpDate, actorUserId],
    );
    const engagement = result.rows[0];
    if (!engagement) {
      throw new BadRequestException('The learner and guardian link was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      targetRoles: ['counsellor'],
      eventType: 'counselling.parent_engagement.created',
      entityType: 'parent_contact_log',
      entityId: engagement.id,
      title: 'Parent counselling engagement logged',
      message: reason,
      priority: 'normal',
      payload: {
        student_id: studentId,
        guardian_id: guardianId,
        contact_method: method,
        follow_up_date: followUpDate,
        source_dashboard: 'guidance-counselling',
      },
    });
    return { engagement, workflow };
  }

  async notifyParentEngagement(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const engagementId = this.requireUuid(id, 'Parent engagement');
    const message = this.optionalText(dto?.message, 1200);
    const result = await this.operations.writeSql(
      `
        WITH target AS (
          SELECT
            engagement.id,
            engagement.reason,
            guardian.id AS guardian_id,
            guardian.user_id
          FROM parent_contact_logs engagement
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = engagement.tenant_id::text
           AND guardian.student_id = engagement.student_id
           AND guardian.id = engagement.guardian_id
           AND guardian.status <> 'revoked'
          WHERE engagement.tenant_id::text = $1
            AND engagement.id = $2::uuid
        )
        INSERT INTO notifications (
          tenant_id, notification_key, recipient_user_id, recipient_guardian_id, recipient_role,
          type, title, body, status, priority, source_module, source_record_id, metadata
        )
        SELECT
          $1,
          'counselling-parent-engagement-' || target.id::text,
          target.user_id,
          target.guardian_id,
          'parent',
          'counselling.parent_engagement',
          'School counselling follow-up',
          COALESCE($3, target.reason),
          'unread',
          'normal',
          'guidance-counselling',
          target.id::text,
          jsonb_build_object('engagement_id', target.id::text, 'queued_by', $4::text)
        FROM target
        ON CONFLICT (tenant_id, notification_key)
        DO UPDATE SET
          body = EXCLUDED.body,
          status = 'unread',
          read_at = NULL,
          updated_at = NOW(),
          metadata = EXCLUDED.metadata
        RETURNING *
      `,
      [tenantId, engagementId, message, actorUserId],
    );
    const notification = result.rows[0];
    if (!notification) {
      throw new BadRequestException('Parent engagement was not found in this school');
    }

    const workflow = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId,
      sourceRole: 'guidance_counselling',
      // The parent delivery above is bound to one guardian. Keep the shared
      // workflow feed staff-only so other parents cannot see engagement data.
      targetRoles: ['counsellor'],
      eventType: 'counselling.parent_engagement.notification_queued',
      entityType: 'parent_contact_log',
      entityId: engagementId,
      title: 'Parent counselling notification queued',
      message,
      priority: 'normal',
      payload: {
        engagement_id: engagementId,
        notification_id: notification.id,
        delivery_state: 'queued',
        source_dashboard: 'guidance-counselling',
      },
    });
    return { notification, workflow, delivery_state: 'queued' };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const reports = await this.operations.listReportSnapshots(tenantId, 'guidance-counselling-command');
    return {
      metrics: { reports_generated: reports.length },
      reportsList: reports.map((report: any) => ({
        id: report.snapshotId ?? report.id,
        title: report.reportName ?? 'Counselling operations report',
        generated_at: report.generatedDate,
        type: report.type,
        status: report.status,
      })),
    };
  }

  async getReportDownload(snapshotIdValue: string) {
    const tenantId = this.requireTenantId();
    const snapshotId = this.operations.requiredText(snapshotIdValue, 'Report snapshot');
    const result = await this.executeSql<{ artifact: unknown }>(
      `
        SELECT artifact
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = 'guidance-counselling-command'
          AND snapshot_id = $2
        LIMIT 1
      `,
      [tenantId, snapshotId],
    );
    const rawArtifact = result.rows[0]?.artifact;
    if (!rawArtifact) {
      throw new BadRequestException('Counselling report was not found in this school');
    }
    const artifact = typeof rawArtifact === 'string' ? JSON.parse(rawArtifact) : rawArtifact;
    if (!artifact || typeof artifact !== 'object' || !('content_base64' in artifact)) {
      throw new BadRequestException('Counselling report artifact is unavailable');
    }
    return artifact;
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

  async getSettings() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{ payload: unknown; saved_at: string; saved_by_user_id: string | null }>(
      `
        SELECT payload, created_at::text AS saved_at, source_user_id::text AS saved_by_user_id
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'counselling.settings.saved'
          AND entity_type = 'counselling_settings'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId],
    );
    const saved = result.rows[0];
    const rawPayload = saved?.payload;
    const payload = typeof rawPayload === 'string'
      ? JSON.parse(rawPayload)
      : (rawPayload && typeof rawPayload === 'object' ? rawPayload : {});
    const settings = payload as Record<string, unknown>;
    return {
      settings: {
        notify_referrer_on_acceptance: settings.notify_referrer_on_acceptance === undefined
          ? true
          : Boolean(settings.notify_referrer_on_acceptance),
        require_audit_reason: settings.require_audit_reason === undefined
          ? true
          : Boolean(settings.require_audit_reason),
        default_case_visibility: ['restricted', 'private', 'team'].includes(String(settings.default_case_visibility))
          ? String(settings.default_case_visibility)
          : 'restricted',
      },
      saved_at: saved?.saved_at ?? null,
      saved_by_user_id: saved?.saved_by_user_id ?? null,
    };
  }

  async saveSettings(dto: any) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
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
      actorUserId,
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
    return {
      success: true,
      settings: payload,
      saved_at: event?.created_at ?? new Date().toISOString(),
      event,
    };
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
