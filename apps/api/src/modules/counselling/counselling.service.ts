import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CounsellingService {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    if ((this.prisma as any).executeWithTenant && typeof params[0] === 'string') {
      return (this.prisma as any).executeWithTenant(params[0], null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const rows = Array.isArray(result) ? result : [result];
        return { rows, rowCount: rows.length };
      });
    }

    const result = await (this.prisma as any).$queryRawUnsafe(query, ...params);
    const rows = Array.isArray(result) ? result : [result];
    return { rows, rowCount: rows.length };
  }

  async getOverview(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          (SELECT COUNT(*)::int FROM counselling_referrals WHERE tenant_id = $1 AND status IN ('open', 'accepted')) AS open_cases,
          (SELECT COUNT(*)::int FROM counselling_referrals WHERE tenant_id = $1 AND created_at >= CURRENT_DATE) AS new_referrals,
          (SELECT COUNT(*)::int FROM counselling_sessions WHERE tenant_id = $1 AND scheduled_for::date = CURRENT_DATE AND status = 'scheduled') AS appointments_today,
          (SELECT COUNT(*)::int FROM counselling_followups WHERE tenant_id = $1 AND due_date <= CURRENT_DATE AND status IN ('pending', 'open')) AS follow_ups_due,
          (SELECT COUNT(*)::int FROM counselling_referrals WHERE tenant_id = $1 AND risk_level IN ('high', 'critical') AND status IN ('open', 'accepted')) AS high_priority,
          (SELECT COUNT(*)::int FROM parent_contact_logs WHERE tenant_id = $1 AND COALESCE(status, 'pending') IN ('pending', 'open')) AS parent_contacts_pending
      `,
      [tenantId],
    );
    const row = rows[0] ?? {};
    return {
      openCases: Number(row.open_cases ?? 0),
      newReferrals: Number(row.new_referrals ?? 0),
      appointmentsToday: Number(row.appointments_today ?? 0),
      followUpsDue: Number(row.follow_ups_due ?? 0),
      highPriority: Number(row.high_priority ?? 0),
      parentContactsPending: Number(row.parent_contacts_pending ?? 0),
    };
  }

  async getDashboard(tenantId: string) {
    const overview = await this.getOverview(tenantId);
    const [referrals, sessions, followups] = await Promise.all([
      this.getReferrals(tenantId),
      this.getSessions(tenantId),
      this.getFollowups(tenantId),
    ]);
    return { overview, referrals: referrals.slice(0, 10), sessions: sessions.slice(0, 10), followups: followups.slice(0, 10) };
  }

  async getReferrals(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          referral.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          student.admission_number,
          referral.status,
          referral.reason,
          referral.risk_level,
          referral.created_at::text
        FROM counselling_referrals referral
        JOIN students student
          ON student.tenant_id = referral.tenant_id
         AND student.id = referral.student_id
        WHERE referral.tenant_id = $1
        ORDER BY referral.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getCases(tenantId: string) {
    return this.getReferrals(tenantId);
  }

  async getSessions(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          session.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          student.admission_number,
          session.status,
          session.scheduled_for::text,
          session.location,
          session.agenda,
          session.outcome_summary
        FROM counselling_sessions session
        JOIN students student
          ON student.tenant_id = session.tenant_id
         AND student.id = session.student_id
        WHERE session.tenant_id = $1
        ORDER BY session.scheduled_for DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getAppointments(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          appointment.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          appointment.appointment_type,
          appointment.date::text,
          appointment.start_time::text,
          appointment.status
        FROM counselling_appointments appointment
        JOIN students student
          ON student.tenant_id = appointment.tenant_id::text
         AND student.id = appointment.student_id
        WHERE appointment.tenant_id::text = $1
        ORDER BY appointment.date DESC, appointment.start_time DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getFollowups(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          followup.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          followup.reason,
          followup.due_date::text,
          followup.status
        FROM counselling_followups followup
        JOIN students student
          ON student.tenant_id = followup.tenant_id::text
         AND student.id = followup.student_id
        WHERE followup.tenant_id::text = $1
        ORDER BY followup.due_date ASC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getWelfareConcerns(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          welfare.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          welfare.category,
          welfare.description,
          welfare.status,
          welfare.created_at::text
        FROM student_welfare_cases welfare
        JOIN students student
          ON student.tenant_id = welfare.tenant_id
         AND student.id = welfare.student_id
        WHERE welfare.tenant_id = $1
        ORDER BY welfare.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getGroupGuidance(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT id::text, title, message, priority, status, created_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type LIKE 'counselling.group_guidance%'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getParents(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          guardian.id::text,
          guardian.display_name,
          guardian.email,
          guardian.phone,
          guardian.relationship,
          guardian.status,
          trim(student.first_name || ' ' || student.last_name) AS learner
        FROM student_guardians guardian
        JOIN students student
          ON student.tenant_id = guardian.tenant_id
         AND student.id = guardian.student_id
        WHERE guardian.tenant_id = $1
        ORDER BY guardian.display_name ASC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getTeachers(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT user_id::text, display_name, email, status
        FROM staff_profiles
        WHERE tenant_id = $1
          AND status = 'active'
        ORDER BY display_name ASC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getDiscipline(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          incident.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          incident.category,
          incident.severity,
          incident.status,
          incident.created_at::text
        FROM discipline_incidents incident
        JOIN students student
          ON student.tenant_id = incident.tenant_id::text
         AND student.id = incident.student_id
        WHERE incident.tenant_id::text = $1
        ORDER BY incident.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getHealth(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          visit.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          visit.symptoms_summary,
          visit.status,
          visit.visit_date::text
        FROM clinic_visits visit
        JOIN students student
          ON student.tenant_id = visit.tenant_id
         AND student.id = visit.student_id
        WHERE visit.tenant_id = $1
        ORDER BY visit.visit_date DESC
        LIMIT 100
      `,
      [tenantId],
    ).catch(() => ({ rows: [] as any[], rowCount: 0 }));
    return rows;
  }

  async getEscalations(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT
          escalation.id::text,
          trim(student.first_name || ' ' || student.last_name) AS learner,
          escalation.priority,
          escalation.reason,
          escalation.status,
          escalation.created_at::text
        FROM counselling_escalations escalation
        JOIN students student
          ON student.tenant_id = escalation.tenant_id::text
         AND student.id = escalation.student_id
        WHERE escalation.tenant_id::text = $1
        ORDER BY escalation.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return rows;
  }

  async getReports(tenantId: string) {
    const { rows } = await this.executeSql(
      `
        SELECT id::text, snapshot_id, title, format, created_at::text, 'Ready' AS status
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module IN ('guidance-counselling-command', 'counselling')
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [tenantId],
    );
    return rows.map((row: any) => ({
      ...row,
      download_url: `/api/admin-command/guidance-counselling/reports/${encodeURIComponent(String(row.snapshot_id || row.id))}/download`,
    }));
  }

  async getTemplates() {
    return [
      { id: 'initial-assessment', title: 'Initial assessment', category: 'intake' },
      { id: 'parent-follow-up', title: 'Parent follow-up', category: 'guardian' },
      { id: 'teacher-feedback', title: 'Teacher feedback request', category: 'staff' },
    ];
  }
}
