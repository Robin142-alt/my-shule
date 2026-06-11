import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class DeputyCommandRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getOverview(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND status = 'active') AS total_students,
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS total_staff,
          (SELECT COUNT(*)::int FROM admin_incidents WHERE tenant_id = $1 AND status IN ('reported', 'escalated')) AS pending_incidents,
          (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND is_active = TRUE) AS active_classes
      `,
      [tenantId],
      { total_students: 0, total_staff: 0, pending_incidents: 0, active_classes: 0 }
    );
  }

  async getDailyOperations(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS absent_teachers,
          (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'late') AS late_teachers
      `,
      [tenantId],
      { absent_teachers: 0, late_teachers: 0 }
    );
  }

  async getAttendance(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS absent_students,
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'late') AS late_students
      `,
      [tenantId],
      { absent_students: 0, late_students: 0 }
    );
  }

  async getDiscipline(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM admin_incidents WHERE tenant_id = $1 AND status = 'reported') AS new_incidents,
          (SELECT COUNT(*)::int FROM admin_incidents WHERE tenant_id = $1 AND status = 'resolved') AS resolved_incidents
      `,
      [tenantId],
      { new_incidents: 0, resolved_incidents: 0 }
    );
  }

  async getWelfare(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) AS clinic_visits_today
      `,
      [tenantId],
      { clinic_visits_today: 0 }
    );
  }

  async getStaffDuty(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS total_staff
      `,
      [tenantId],
      { total_staff: 0 }
    );
  }

  async getTimetable(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM timetable_periods WHERE tenant_id = $1) AS total_periods
      `,
      [tenantId],
      { total_periods: 0 }
    );
  }

  async getAcademics(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1 AND status = 'active') AS active_subjects
      `,
      [tenantId],
      { active_subjects: 0 }
    );
  }

  async getExams(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND status = 'draft') AS draft_marks
      `,
      [tenantId],
      { draft_marks: 0 }
    );
  }

  async getClasses(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND is_active = TRUE) AS active_classes
      `,
      [tenantId],
      { active_classes: 0 }
    );
  }

  async getApprovals(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          0::int AS pending_approvals
      `,
      [tenantId],
      { pending_approvals: 0 }
    );
  }

  async getCommunication(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM announcements WHERE tenant_id = $1) AS total_announcements
      `,
      [tenantId],
      { total_announcements: 0 }
    );
  }

  async getReports(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          0::int AS generated_reports
      `,
      [tenantId],
      { generated_reports: 0 }
    );
  }

  async getStaff(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS active_staff
      `,
      [tenantId],
      { active_staff: 0 }
    );
  }

  private async safeQuery<T>(
    sql: string,
    values: unknown[],
    fallback: T
  ): Promise<T> {
    try {
      const result = await this.databaseService.query(sql, values);
      return (result.rows[0] as T) || fallback;
    } catch (error) {
      const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined;
      if (code === '42P01' || code === '42703') {
        return fallback;
      }
      throw error;
    }
  }
}
