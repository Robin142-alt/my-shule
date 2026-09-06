import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ACADEMIC_TEACHING_ROLE_CODES } from '../../../auth/auth.constants';
import { PrismaService } from '../../../database/prisma.service';

const ACADEMIC_TEACHING_ROLE_SQL = ACADEMIC_TEACHING_ROLE_CODES
  .map((roleCode) => `'${roleCode}'`)
  .join(', ');

const ACADEMIC_STAFF_ROLE_CODES_SQL = `
  ARRAY(
    SELECT role_metadata.role_code
    FROM (
      SELECT linked_role.code AS role_code
      FROM tenant_memberships linked_membership
      JOIN roles linked_role
        ON linked_role.id = linked_membership.role_id
       AND linked_role.tenant_id = linked_membership.tenant_id
      WHERE linked_membership.tenant_id = membership.tenant_id
        AND linked_membership.user_id = membership.user_id
        AND linked_membership.status = 'active'
      UNION
      SELECT assigned_role.code AS role_code
      FROM user_roles assigned_user_role
      JOIN roles assigned_role
        ON assigned_role.id = assigned_user_role.role_id
       AND assigned_role.tenant_id = assigned_user_role.tenant_id
      WHERE assigned_user_role.tenant_id = membership.tenant_id
        AND assigned_user_role.user_id = membership.user_id
        AND upper(assigned_user_role.status::text) = 'ACTIVE'
        AND assigned_user_role.deleted_at IS NULL
      UNION
      SELECT appointment.role_type AS role_code
      FROM academics_role_appointments appointment
      WHERE appointment.tenant_id = membership.tenant_id
        AND appointment.teacher_user_id = membership.user_id
        AND appointment.status = 'active'
        AND appointment.effective_from <= CURRENT_DATE
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
    ) role_metadata
    WHERE NULLIF(btrim(role_metadata.role_code), '') IS NOT NULL
    ORDER BY role_metadata.role_code
  )
`;

const ACADEMIC_STAFF_ROLE_NAMES_SQL = `
  ARRAY(
    SELECT role_metadata.role_name
    FROM (
      SELECT linked_role.name AS role_name
      FROM tenant_memberships linked_membership
      JOIN roles linked_role
        ON linked_role.id = linked_membership.role_id
       AND linked_role.tenant_id = linked_membership.tenant_id
      WHERE linked_membership.tenant_id = membership.tenant_id
        AND linked_membership.user_id = membership.user_id
        AND linked_membership.status = 'active'
      UNION
      SELECT assigned_role.name AS role_name
      FROM user_roles assigned_user_role
      JOIN roles assigned_role
        ON assigned_role.id = assigned_user_role.role_id
       AND assigned_role.tenant_id = assigned_user_role.tenant_id
      WHERE assigned_user_role.tenant_id = membership.tenant_id
        AND assigned_user_role.user_id = membership.user_id
        AND upper(assigned_user_role.status::text) = 'ACTIVE'
        AND assigned_user_role.deleted_at IS NULL
    ) role_metadata
    WHERE NULLIF(btrim(role_metadata.role_name), '') IS NOT NULL
    ORDER BY role_metadata.role_name
  )
`;

const ACADEMIC_STAFF_TEACHING_SUBJECTS_SQL = `
  ARRAY(
    SELECT DISTINCT subject.name
    FROM teacher_subject_assignments subject_assignment
    JOIN subjects subject
      ON subject.tenant_id = subject_assignment.tenant_id
     AND subject.id::text = subject_assignment.subject_id::text
    WHERE subject_assignment.tenant_id = membership.tenant_id
      AND subject_assignment.teacher_user_id::text = membership.user_id::text
      AND subject_assignment.status = 'active'
      AND subject_assignment.effective_from <= CURRENT_DATE
      AND (subject_assignment.effective_to IS NULL OR subject_assignment.effective_to >= CURRENT_DATE)
      AND COALESCE(subject.status, 'active') = 'active'
    ORDER BY subject.name
  )
`;

const ACADEMIC_STAFF_HOD_DEPARTMENTS_SQL = `
  ARRAY(
    WITH canonical_hod AS (
      SELECT DISTINCT ON (appointment.department_id)
        appointment.department_id,
        appointment.teacher_user_id
      FROM academics_department_hod_appointments appointment
      WHERE appointment.tenant_id = membership.tenant_id
        AND appointment.status = 'active'
        AND (appointment.effective_from IS NULL OR appointment.effective_from <= CURRENT_DATE)
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
      ORDER BY appointment.department_id, appointment.effective_from DESC NULLS LAST,
               appointment.updated_at DESC, appointment.id DESC
    ), legacy_role_hod AS (
      SELECT DISTINCT ON (appointment.department_id)
        appointment.department_id,
        appointment.teacher_user_id
      FROM academics_role_appointments appointment
      WHERE appointment.tenant_id = membership.tenant_id
        AND appointment.department_id IS NOT NULL
        AND regexp_replace(lower(btrim(appointment.role_type)), '[ -]+', '_', 'g')
            IN ('hod', 'head_of_department')
        AND appointment.status = 'active'
        AND (appointment.effective_from IS NULL OR appointment.effective_from <= CURRENT_DATE)
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1
          FROM academics_department_hod_appointments canonical
          WHERE canonical.tenant_id = appointment.tenant_id
            AND canonical.department_id = appointment.department_id
        )
      ORDER BY appointment.department_id, appointment.effective_from DESC NULLS LAST,
               appointment.updated_at DESC, appointment.id DESC
    ), legacy_pointer_hod AS (
      SELECT department.id AS department_id,
             department.head_of_department_user_id AS teacher_user_id
      FROM academics_departments department
      WHERE department.tenant_id = membership.tenant_id
        AND department.head_of_department_user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM academics_department_hod_appointments canonical
          WHERE canonical.tenant_id = department.tenant_id
            AND canonical.department_id = department.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM academics_role_appointments appointment
          WHERE appointment.tenant_id = department.tenant_id
            AND appointment.department_id = department.id
            AND regexp_replace(lower(btrim(appointment.role_type)), '[ -]+', '_', 'g')
                IN ('hod', 'head_of_department')
        )
    ), resolved_hod AS (
      SELECT * FROM canonical_hod
      UNION ALL
      SELECT * FROM legacy_role_hod
      UNION ALL
      SELECT * FROM legacy_pointer_hod
    )
    SELECT DISTINCT department.name
    FROM resolved_hod resolved
    JOIN academics_departments department
      ON department.tenant_id = membership.tenant_id
     AND department.id = resolved.department_id
    WHERE resolved.teacher_user_id::text = membership.user_id::text
      AND COALESCE(department.is_active, true) = true
      AND COALESCE(department.status, 'active') = 'active'
      AND department.archived_at IS NULL
    ORDER BY department.name
  )
`;

function normalizeAcademicSystemType(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'cbc') return 'CBC';
  if (normalized === 'cbe') return 'CBE';
  if (normalized === '8-4-4' || normalized === '844') return '8-4-4';
  if (normalized === 'international') return 'International';
  if (normalized === 'hybrid') return 'Hybrid';
  return 'Custom';
}

type SetupDependencyDefinition = { table: string; column: string; label: string };

export type SetupDependencyResult = {
  entity_type: string;
  entity_id: string;
  dependencies: Array<{ table: string; label: string; count: number }>;
  total: number;
  can_permanently_delete: boolean;
  recommendation: string;
  outcome: 'safe_to_proceed' | 'proceed_with_warnings';
  reversible: boolean;
};

export type BulkClassSubjectAssignmentsInput = {
  academic_term_id: string;
  class_section_id: string;
  subject_ids: string[];
  is_compulsory?: boolean;
  is_examinable?: boolean;
  effective_from?: string;
  effective_to?: string;
  reason?: string;
  actor_user_id: string | null;
  actor_role: string | null;
  correlation_id: string | null;
};

export type BulkClassSubjectAssignmentsTransactionHook = (input: {
  tx: any;
  assignments: Array<Record<string, any>>;
  changes: Array<{
    assignment: Record<string, any>;
    previous: Record<string, any> | null;
    action: 'assigned' | 'updated' | 'restored';
  }>;
}) => Promise<void>;

function academicBulkOfferingError(code: string) {
  const error = new Error(code) as Error & { code?: string };
  error.code = code;
  return error;
}

@Injectable()
export class AcademicsRepository {

  public async executeSqlGlobal<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  public async executeSql(tenantId: string, sql: string, params: any[] = []): Promise<{rows: any[]}> {
    return this.prisma.executeWithTenant<any>(tenantId, null, async (tx: any) => {
      const rows = await tx.$queryRawUnsafe(sql, ...params);
      return { rows: Array.isArray(rows) ? rows : [rows] } as any;
    });
  }

  private async executeSqlTx(tx: any, sql: string, params: any[] = []): Promise<{rows: any[]}> {
    const rows = await tx.$queryRawUnsafe(sql, ...params);
    return { rows: Array.isArray(rows) ? rows : [rows] } as any;
  }

  private getTenantId(params: any[]): string {
    for (const p of params) {
      if (Array.isArray(p)) {
        try {
          return this.getTenantId(p);
        } catch {
          continue;
        }
      }

      if (typeof p === 'string' && /^[a-z0-9][a-z0-9_-]{1,127}$/i.test(p)) {
        return p;
      }
    }

    throw new Error('Tenant ID missing for raw query');
  }

  async getAcademicFoundation(tenantId: string) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const rows = await tx.$queryRawUnsafe(
        `
          SELECT
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.starts_on DESC)
              FROM (
                SELECT id::text, name, starts_on, ends_on, status, is_current,
                       display_order, version, archived_at
                FROM academic_years
                WHERE tenant_id = $1
              ) item
            ), '[]'::jsonb) AS years,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.starts_on DESC)
              FROM (
                SELECT id::text, academic_year_id::text, name, starts_on, ends_on,
                       status, is_current, display_order, version, archived_at
                FROM academic_terms
                WHERE tenant_id = $1
              ) item
            ), '[]'::jsonb) AS terms,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.starts_on ASC, item.name ASC)
              FROM (
                SELECT period.id::text, period.academic_year_id::text,
                       period.academic_term_id::text, period.name, period.period_type,
                       period.starts_on, period.ends_on, period.description,
                       period.status, period.version, period.archived_at
                FROM academics_calendar_periods period
                WHERE period.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS calendar_periods,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.grade_level ASC, item.name ASC)
              FROM (
                SELECT section.id::text, section.academic_year_id::text, section.name, section.code,
                       section.grade_level, section.stream, section.capacity,
                       section.curriculum_model, section.enrolment_open, section.is_active,
                       section.status, section.version, section.archived_at,
                       (SELECT COUNT(*)::integer FROM student_class_assignments placement
                        WHERE placement.tenant_id = section.tenant_id
                          AND placement.class_section_id::text = section.id::text
                          AND placement.status = 'active') AS active_student_count
                FROM class_sections section
                WHERE section.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS classes,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.class_section_name ASC, item.name ASC)
              FROM (
                SELECT stream.id::text, stream.class_section_id::text, section.name AS class_section_name,
                       stream.name, stream.code, stream.capacity,
                       stream.stream_teacher_user_id::text,
                       COALESCE(staff.display_name, staff.staff_number) AS stream_teacher_name,
                       stream.is_active, stream.status,
                       stream.version, stream.archived_at,
                       (SELECT COUNT(*)::integer FROM student_class_assignments placement
                        WHERE placement.tenant_id = stream.tenant_id
                          AND placement.stream_id::text = stream.id::text
                          AND placement.status = 'active') AS active_student_count
                FROM class_streams stream
                JOIN class_sections section
                  ON section.tenant_id = stream.tenant_id AND section.id = stream.class_section_id
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = stream.tenant_id
                 AND staff.user_id = stream.stream_teacher_user_id
                WHERE stream.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS streams,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name ASC)
              FROM (
                SELECT id::text, code, name, abbreviation, department_id::text,
                       curriculum_model, subject_type, is_compulsory, is_examinable,
                       is_practical, is_co_curricular, status, version, archived_at
                FROM subjects
                WHERE tenant_id = $1
              ) item
            ), '[]'::jsonb) AS subjects,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at DESC)
              FROM (
                SELECT assignment.id::text, assignment.academic_term_id::text,
                       term.name AS academic_term_name,
                       assignment.class_section_id::text,
                       section.name AS class_section_name,
                       assignment.subject_id::text, subject.name AS subject_name,
                       assignment.is_compulsory, assignment.is_examinable,
                       assignment.effective_from, assignment.effective_to,
                       assignment.status, assignment.reason, assignment.version,
                       assignment.created_at
                FROM class_subject_assignments assignment
                LEFT JOIN academic_terms term
                  ON term.tenant_id = assignment.tenant_id
                 AND term.id::text = assignment.academic_term_id::text
                LEFT JOIN class_sections section
                  ON section.tenant_id = assignment.tenant_id
                 AND section.id::text = assignment.class_section_id::text
                LEFT JOIN subjects subject
                  ON subject.tenant_id = assignment.tenant_id
                 AND subject.id::text = assignment.subject_id::text
                WHERE assignment.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS class_subject_assignments,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name ASC)
              FROM (
                SELECT department.id::text, department.name, department.code, department.description,
                       department.head_of_department_user_id::text, department.is_active,
                       department.status, department.version, department.archived_at,
                       COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name
                FROM academics_departments department
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = department.tenant_id
                 AND staff.user_id = department.head_of_department_user_id
                WHERE department.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS departments,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.label ASC)
              FROM (
                SELECT DISTINCT ON (membership.user_id)
                       COALESCE(staff.id, membership.user_id)::text AS id,
                       membership.user_id::text,
                       COALESCE(
                         NULLIF(staff.display_name, ''),
                         NULLIF(user_account.display_name, ''),
                         NULLIF(user_account.full_name, ''),
                         user_account.email,
                         membership.user_id::text
                       ) AS label,
                       staff.staff_number,
                       COALESCE(staff.status, 'active') AS status,
                       role.code AS role_code,
                       ${ACADEMIC_STAFF_ROLE_CODES_SQL} AS role_codes,
                       ${ACADEMIC_STAFF_ROLE_NAMES_SQL} AS role_names,
                       ${ACADEMIC_STAFF_TEACHING_SUBJECTS_SQL} AS teaching_subjects,
                       ${ACADEMIC_STAFF_HOD_DEPARTMENTS_SQL} AS hod_departments
                FROM tenant_memberships membership
                JOIN users user_account
                  ON user_account.id = membership.user_id
                JOIN roles role
                  ON role.id = membership.role_id
                 AND role.tenant_id = membership.tenant_id
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = membership.tenant_id
                 AND staff.user_id = membership.user_id
                WHERE membership.tenant_id = $1
                  AND membership.status = 'active'
                  AND user_account.status = 'active'
                  AND COALESCE(staff.status, 'active') IN ('active', 'reactivated')
                  AND role.code = ANY (ARRAY[${ACADEMIC_TEACHING_ROLE_SQL}]::text[])
                ORDER BY membership.user_id, role.code ASC
                LIMIT 300
              ) item
            ), '[]'::jsonb) AS teachers,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.class_section_name ASC, item.teacher_name ASC)
              FROM (
                SELECT class_teacher.id::text, class_teacher.academic_year_id::text,
                       year.name AS academic_year_name, class_teacher.class_section_id::text,
                       section.name AS class_section_name, class_teacher.teacher_user_id::text,
                       COALESCE(staff.display_name, staff.staff_number, 'Unlinked teacher') AS teacher_name,
                       class_teacher.status, class_teacher.is_active, class_teacher.assignment_type,
                       class_teacher.effective_from, class_teacher.effective_to, class_teacher.reason,
                       class_teacher.version
                FROM academics_class_teachers class_teacher
                LEFT JOIN academic_years year
                  ON year.tenant_id = class_teacher.tenant_id AND year.id::text = class_teacher.academic_year_id::text
                LEFT JOIN class_sections section
                  ON section.tenant_id = class_teacher.tenant_id AND section.id::text = class_teacher.class_section_id::text
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = class_teacher.tenant_id AND staff.user_id = class_teacher.teacher_user_id
                WHERE class_teacher.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS class_teachers,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at DESC)
              FROM (
                SELECT assignment.id::text, assignment.academic_term_id::text,
                       term.name AS academic_term_name, assignment.class_section_id::text,
                       section.name AS class_section_name, assignment.subject_id::text,
                       subject.name AS subject_name, assignment.teacher_user_id::text,
                       COALESCE(staff.display_name, staff.staff_number, 'Unlinked teacher') AS teacher_name,
                       assignment.status, assignment.assignment_type, assignment.is_primary,
                       assignment.mark_entry_allowed, assignment.lesson_record_allowed,
                       assignment.report_comment_allowed, assignment.effective_from,
                       assignment.effective_to, assignment.reason, assignment.stream_id::text,
                       assignment.department_id::text, assignment.curriculum_model, assignment.version,
                       assignment.created_at
                FROM teacher_subject_assignments assignment
                LEFT JOIN academic_terms term
                  ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
                LEFT JOIN class_sections section
                  ON section.tenant_id = assignment.tenant_id AND section.id = assignment.class_section_id
                LEFT JOIN subjects subject
                  ON subject.tenant_id = assignment.tenant_id AND subject.id = assignment.subject_id
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = assignment.tenant_id AND staff.user_id::text = assignment.teacher_user_id
                WHERE assignment.tenant_id = $1
                ORDER BY assignment.created_at DESC
                LIMIT 300
              ) item
            ), '[]'::jsonb) AS teacher_assignments,
            COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name)
              FROM (SELECT id::text, name, description, rules, effective_from, effective_to,
                           status, based_on_id, is_active, version, archived_at
                    FROM academics_grading_systems WHERE tenant_id = $1) item), '[]'::jsonb) AS grading_systems,
            COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name)
              FROM (SELECT id::text, name, description, configuration, is_active, version, archived_at
                    FROM academics_attendance_settings WHERE tenant_id = $1) item), '[]'::jsonb) AS attendance_settings,
            COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name)
              FROM (SELECT id::text, name, grading_system_id::text, show_rank, show_attendance,
                           configuration, is_active, version, archived_at
                    FROM academics_report_card_settings WHERE tenant_id = $1) item), '[]'::jsonb) AS report_card_settings
            ,COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at DESC)
              FROM (SELECT appointment.id::text, appointment.role_type,
                           appointment.teacher_user_id::text,
                           COALESCE(staff.display_name, staff.staff_number) AS teacher_name,
                           appointment.department_id::text, appointment.academic_year_id::text,
                           appointment.class_section_id::text, appointment.stream_id::text,
                           appointment.appointment_type, appointment.effective_from,
                           appointment.effective_to, appointment.status, appointment.reason,
                           appointment.version, appointment.created_at
                    FROM academics_role_appointments appointment
                    LEFT JOIN staff_profiles staff ON staff.tenant_id = appointment.tenant_id
                      AND staff.user_id = appointment.teacher_user_id
                    WHERE appointment.tenant_id = $1) item), '[]'::jsonb) AS role_appointments
            ,COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.effective_from DESC)
              FROM (SELECT id::text, name, curriculum_model, configuration,
                           effective_from, effective_to, status, based_on_id,
                           version, archived_at
                    FROM academics_curriculum_configurations WHERE tenant_id = $1) item), '[]'::jsonb)
              AS curriculum_configurations
        `,
        tenantId,
      );
      const result = (Array.isArray(rows) ? rows[0] : null) ?? {};

      return {
        years: Array.isArray(result.years) ? result.years : [],
        terms: Array.isArray(result.terms) ? result.terms : [],
        calendarPeriods: Array.isArray(result.calendar_periods) ? result.calendar_periods : [],
        classes: Array.isArray(result.classes) ? result.classes : [],
        streams: Array.isArray(result.streams) ? result.streams : [],
        subjects: Array.isArray(result.subjects) ? result.subjects : [],
        classSubjectAssignments: Array.isArray(result.class_subject_assignments) ? result.class_subject_assignments : [],
        departments: Array.isArray(result.departments) ? result.departments : [],
        teachers: Array.isArray(result.teachers) ? result.teachers : [],
        classTeachers: Array.isArray(result.class_teachers) ? result.class_teachers : [],
        teacherAssignments: Array.isArray(result.teacher_assignments) ? result.teacher_assignments : [],
        gradingSystems: Array.isArray(result.grading_systems) ? result.grading_systems : [],
        attendanceSettings: Array.isArray(result.attendance_settings) ? result.attendance_settings : [],
        reportCardSettings: Array.isArray(result.report_card_settings) ? result.report_card_settings : [],
        roleAppointments: Array.isArray(result.role_appointments) ? result.role_appointments : [],
        curriculumConfigurations: Array.isArray(result.curriculum_configurations) ? result.curriculum_configurations : [],
      };
    });
  }

  async listCommunications(tenantId: string, actorUserId: string | null) {
    return this.prisma.executeWithTenant(tenantId, actorUserId, (tx) =>
      tx.communicationBroadcast.findMany({
        where: { schoolId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  }


  async createAcademicYear(input: Record<string, unknown>) {
    const academicYearId = randomUUID();
    const tenantId = String(input.tenant_id);
    const result = await this.executeSql(tenantId, `
        INSERT INTO academic_years (
          tenant_id,
          id,
          name,
          start_date,
          end_date,
          starts_on,
          ends_on,
          status,
          is_current,
          display_order,
          created_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $4::date, $5::date, 'draft', $6, $7, $8::uuid, NOW())
        ON CONFLICT (tenant_id, name)
        DO NOTHING
        RETURNING *
      `,
      [
        tenantId,
        academicYearId,
        input.name,
        input.starts_on,
        input.ends_on,
        input.is_current ?? false,
        input.display_order ?? 0,
        input.created_by_user_id,
      ]);

    return result.rows[0];
  }

  async createAcademicTerm(input: Record<string, unknown>) {
    const academicTermId = randomUUID();
    const tenantId = String(input.tenant_id);
    const result = await this.executeSql(tenantId, `
        INSERT INTO academic_terms (
          tenant_id, id, academic_year_id, name, starts_on, ends_on,
          is_current, display_order, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9::uuid)
        ON CONFLICT (tenant_id, academic_year_id, name)
        DO NOTHING
        RETURNING *
      `,
      [
        tenantId,
        academicTermId,
        input.academic_year_id,
        input.name,
        input.starts_on,
        input.ends_on,
        input.is_current ?? false,
        input.display_order ?? 0,
        input.created_by_user_id,
      ]);

    return result.rows[0];
  }

  async createAcademicCalendarPeriod(tenantId: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_calendar_periods (
        tenant_id, academic_year_id, academic_term_id, name, period_type,
        starts_on, ends_on, description, created_by_user_id, updated_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9::uuid, $9::uuid)
      ON CONFLICT (tenant_id, academic_year_id, name, starts_on) DO NOTHING
      RETURNING *
    `, [tenantId, input.academic_year_id, input.academic_term_id ?? null,
      input.name, input.period_type, input.starts_on, input.ends_on,
      input.description ?? null, input.actor_user_id ?? null]);
    return result.rows[0];
  }

  async updateAcademicCalendarPeriod(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    for (const field of ['academic_year_id', 'academic_term_id', 'name', 'period_type', 'description']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(input[field] || null);
      }
    }
    for (const field of ['starts_on', 'ends_on']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${i++}::date`);
        values.push(input[field]);
      }
    }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'calendar-period', id);
    fields.push(`updated_by_user_id = $${i++}::uuid`, 'version = version + 1', 'updated_at = NOW()');
    values.push(input.actor_user_id ?? null, input.expected_version ?? null);
    const result = await this.executeSql(tenantId, `
      UPDATE academics_calendar_periods SET ${fields.join(', ')}
      WHERE tenant_id = $1 AND id::text = $2
        AND ($${i}::integer IS NULL OR version = $${i}::integer)
      RETURNING *
    `, values);
    return result.rows[0];
  }

  async createClassSubjectAssignment(tenantId: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO class_subject_assignments (
        tenant_id, academic_term_id, class_section_id, subject_id,
        is_compulsory, is_examinable, effective_from, effective_to,
        reason, created_by_user_id, updated_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10::uuid, $10::uuid)
      ON CONFLICT (tenant_id, academic_term_id, class_section_id, subject_id)
      DO UPDATE SET is_compulsory = EXCLUDED.is_compulsory,
        is_examinable = EXCLUDED.is_examinable,
        effective_from = EXCLUDED.effective_from,
        effective_to = EXCLUDED.effective_to,
        status = 'active', archived_at = NULL, archived_by_user_id = NULL,
        reason = EXCLUDED.reason, updated_by_user_id = EXCLUDED.updated_by_user_id,
        version = class_subject_assignments.version + 1, updated_at = NOW()
      RETURNING *
    `, [tenantId, input.academic_term_id, input.class_section_id, input.subject_id,
      input.is_compulsory ?? true, input.is_examinable ?? true,
      input.effective_from ?? null, input.effective_to ?? null,
      input.reason ?? null, input.actor_user_id ?? null]);
    return result.rows[0];
  }

  async createClassSubjectAssignmentsBulk(
    tenantId: string,
    input: BulkClassSubjectAssignmentsInput,
    persistGovernance?: BulkClassSubjectAssignmentsTransactionHook,
  ) {
    return this.prisma.executeWithTenant<Array<Record<string, any>>>(
      tenantId,
      input.actor_user_id,
      async (tx: any) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          `academic-class-subjects:${tenantId}:${input.academic_term_id}:${input.class_section_id}`,
        );

        const termResult = await this.executeSqlTx(tx, `
          SELECT id::text, academic_year_id::text, status
          FROM academic_terms
          WHERE tenant_id = $1 AND id::text = $2
            AND COALESCE(status, 'draft') NOT IN ('archived', 'closed', 'inactive')
          LIMIT 1
          FOR SHARE
        `, [tenantId, input.academic_term_id]);
        if (!termResult.rows[0]) {
          throw academicBulkOfferingError('ACADEMIC_CLASS_SUBJECT_TERM_UNAVAILABLE');
        }

        const classResult = await this.executeSqlTx(tx, `
          SELECT id::text, academic_year_id::text, status, is_active
          FROM class_sections
          WHERE tenant_id = $1 AND id::text = $2
            AND COALESCE(status, 'active') NOT IN ('archived', 'closed', 'inactive')
            AND COALESCE(is_active, true) = true
          LIMIT 1
          FOR SHARE
        `, [tenantId, input.class_section_id]);
        if (!classResult.rows[0]) {
          throw academicBulkOfferingError('ACADEMIC_CLASS_SUBJECT_CLASS_UNAVAILABLE');
        }
        if (String(termResult.rows[0].academic_year_id) !== String(classResult.rows[0].academic_year_id)) {
          throw academicBulkOfferingError('ACADEMIC_CLASS_SUBJECT_YEAR_MISMATCH');
        }

        const subjectResult = await this.executeSqlTx(tx, `
          SELECT id::text
          FROM subjects
          WHERE tenant_id = $1
            AND id::text = ANY($2::text[])
            AND COALESCE(status, 'active') NOT IN ('archived', 'inactive')
          FOR SHARE
        `, [tenantId, input.subject_ids]);
        const availableSubjectIds = new Set(subjectResult.rows.map((row) => String(row.id)));
        if (input.subject_ids.some((subjectId) => !availableSubjectIds.has(subjectId))) {
          throw academicBulkOfferingError('ACADEMIC_CLASS_SUBJECT_SUBJECTS_UNAVAILABLE');
        }

        const existingResult = await this.executeSqlTx(tx, `
          SELECT *
          FROM class_subject_assignments
          WHERE tenant_id = $1
            AND academic_term_id::text = $2
            AND class_section_id::text = $3
            AND subject_id::text = ANY($4::text[])
          FOR UPDATE
        `, [tenantId, input.academic_term_id, input.class_section_id, input.subject_ids]);
        const previousBySubjectId = new Map(
          existingResult.rows.map((row) => [String(row.subject_id), row as Record<string, any>]),
        );

        const assignments: Array<Record<string, any>> = [];
        const changes: Array<{
          assignment: Record<string, any>;
          previous: Record<string, any> | null;
          action: 'assigned' | 'updated' | 'restored';
        }> = [];
        for (const subjectId of input.subject_ids) {
          const assignmentResult = await this.executeSqlTx(tx, `
            INSERT INTO class_subject_assignments (
              tenant_id, academic_term_id, class_section_id, subject_id,
              is_compulsory, is_examinable, effective_from, effective_to,
              reason, created_by_user_id, updated_by_user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10::uuid, $10::uuid)
            ON CONFLICT (tenant_id, academic_term_id, class_section_id, subject_id)
            DO UPDATE SET is_compulsory = EXCLUDED.is_compulsory,
              is_examinable = EXCLUDED.is_examinable,
              effective_from = EXCLUDED.effective_from,
              effective_to = EXCLUDED.effective_to,
              status = 'active', archived_at = NULL, archived_by_user_id = NULL,
              reason = EXCLUDED.reason, updated_by_user_id = EXCLUDED.updated_by_user_id,
              version = class_subject_assignments.version + 1, updated_at = NOW()
            RETURNING *
          `, [tenantId, input.academic_term_id, input.class_section_id, subjectId,
            input.is_compulsory ?? true, input.is_examinable ?? true,
            input.effective_from ?? null, input.effective_to ?? null,
            input.reason ?? null, input.actor_user_id]);
          const assignment = assignmentResult.rows[0];
          if (!assignment) {
            throw academicBulkOfferingError('ACADEMIC_CLASS_SUBJECT_WRITE_FAILED');
          }
          assignments.push(assignment);
          const previous = previousBySubjectId.get(subjectId) ?? null;
          const action = previous
            ? ['archived', 'inactive'].includes(String(previous.status ?? '').toLowerCase())
              ? 'restored' as const
              : 'updated' as const
            : 'assigned' as const;
          changes.push({ assignment, previous, action });

          await tx.$executeRawUnsafe(`
            INSERT INTO academic_audit_logs (
              school_id, tenant_id, entity_type, entity_id, action, actor_user_id,
              actor_role, previous_values, new_values, reason, effective_at,
              correlation_id, metadata
            ) VALUES (
              $1, $1, 'class_subject_assignment', $2::text,
              $3, $4::uuid, $5, $6::jsonb, $7::jsonb, $8,
              $9::timestamptz, $10, $11::jsonb
            )
          `,
          tenantId,
          assignment.id,
          `academics.class_subject_assignment_${action}`,
          input.actor_user_id,
          input.actor_role,
          previous == null ? null : JSON.stringify(previous),
          JSON.stringify(assignment),
          input.reason ?? null,
          input.effective_from ?? null,
          input.correlation_id,
          JSON.stringify({
            bulk_assignment: true,
            requested_count: input.subject_ids.length,
            academic_term_id: input.academic_term_id,
            class_section_id: input.class_section_id,
            subject_id: subjectId,
          }));
        }

        await persistGovernance?.({ tx, assignments, changes });
        return assignments;
      },
    );
  }

  async updateClassSubjectAssignment(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    for (const field of ['academic_term_id', 'class_section_id', 'subject_id', 'reason']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(input[field] || null);
      }
    }
    for (const field of ['is_compulsory', 'is_examinable']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(input[field]);
      }
    }
    for (const field of ['effective_from', 'effective_to']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${i++}::date`);
        values.push(input[field] || null);
      }
    }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'class-subject', id);
    fields.push(`updated_by_user_id = $${i++}::uuid`, 'version = version + 1', 'updated_at = NOW()');
    values.push(input.actor_user_id ?? null, input.expected_version ?? null);
    const result = await this.executeSql(tenantId, `
      UPDATE class_subject_assignments SET ${fields.join(', ')}
      WHERE tenant_id = $1 AND id::text = $2
        AND ($${i}::integer IS NULL OR version = $${i}::integer)
      RETURNING *
    `, values);
    return result.rows[0];
  }

  async createClassSection(input: Record<string, unknown>) {
    const tenantId = String(input.tenant_id);
    const actorUserId = input.created_by_user_id ? String(input.created_by_user_id) : null;

    return this.prisma.executeWithTenant<any>(tenantId, actorUserId, async (tx: any) => {
      let academicLevelId = input.academic_level_id
        ? String(input.academic_level_id)
        : null;

      if (!academicLevelId) {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          `academic-level:${tenantId}`,
        );

        const classFormGradeName = String(input.name);
        const existingLevel = await this.executeSqlTx(tx, `
          SELECT id, is_active
          FROM academic_levels
          WHERE tenant_id = $1
            AND lower(btrim(name)) = lower(btrim($2))
          ORDER BY is_active DESC, order_index ASC, id ASC
          LIMIT 1
          FOR UPDATE
        `, [tenantId, classFormGradeName]);

        if (existingLevel.rows[0]) {
          academicLevelId = String(existingLevel.rows[0].id);
          if (!existingLevel.rows[0].is_active) {
            await this.executeSqlTx(tx, `
              UPDATE academic_levels
              SET is_active = TRUE, updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2
            `, [tenantId, academicLevelId]);
          }
        } else {
          const createdLevel = await this.executeSqlTx(tx, `
            INSERT INTO academic_levels (
              tenant_id, system_type, name, order_index, is_active
            )
            SELECT
              $1,
              $2,
              $3,
              COALESCE(MAX(order_index), 0) + 1,
              TRUE
            FROM academic_levels
            WHERE tenant_id = $1
            RETURNING id
          `, [
            tenantId,
            normalizeAcademicSystemType(input.curriculum_model),
            classFormGradeName,
          ]);
          academicLevelId = createdLevel.rows[0]?.id
            ? String(createdLevel.rows[0].id)
            : null;
        }
      }

      if (!academicLevelId) {
        throw new Error('ACADEMIC_LEVEL_BINDING_FAILED');
      }

      const result = await this.executeSqlTx(tx, `
        INSERT INTO class_sections (
          tenant_id,
          academic_year_id,
          academic_level_id,
          name,
          grade_level,
          stream,
          custom_label,
          capacity,
          code,
          curriculum_model,
          enrolment_open,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::uuid)
        ON CONFLICT (tenant_id, academic_year_id, name)
        DO NOTHING
        RETURNING *
      `,
      [
        tenantId,
        input.academic_year_id,
        academicLevelId,
        input.name,
        input.grade_level,
        input.stream ?? null,
        input.custom_label ?? null,
        input.capacity ?? null,
        input.code ?? null,
        input.curriculum_model ?? 'Custom',
        input.enrolment_open ?? true,
        input.created_by_user_id,
      ]);

      return result.rows[0];
    });
  }

  async createClassStructure(input: {
    tenant_id: string;
    created_by_user_id: string | null;
    system_type: string;
    levels: Array<{
      name: string;
      order_index: number;
      classes: Array<{
        name: string;
        custom_label?: string;
        capacity?: number;
        streams?: Array<{
          name: string;
          capacity?: number;
          class_teacher_id?: string;
        }>;
      }>;
    }>;
  }) {
    return this.prisma.executeWithTenant<any>(input.tenant_id || (input as any).tenant_id, (input as any).created_by_user_id || null, async (tx: any) => {
      const createdLevels = [];
      const createdClasses = [];
      const createdStreams = [];

      for (const level of input.levels) {
        const levelResult = await this.executeSqlTx(tx, `
            INSERT INTO academic_levels (
              tenant_id, system_type, name, order_index
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id, order_index)
            DO UPDATE SET
              system_type = EXCLUDED.system_type,
              name = EXCLUDED.name,
              is_active = true,
              updated_at = NOW()
            RETURNING *
          `,
          [input.tenant_id, input.system_type, level.name, level.order_index]);
        const createdLevel = levelResult.rows[0];
        createdLevels.push(createdLevel);

        for (const classSection of level.classes) {
          const classResult = await this.executeSql(this.getTenantId([`
              INSERT INTO class_sections (
                tenant_id,
                academic_year_id,
                academic_level_id,
                name,
                grade_level,
                custom_label,
                capacity,
                created_by_user_id
              )
              SELECT $1, ay.id, $2, $3, $4, $5, $6, $7::uuid
              FROM academic_years ay
              WHERE ay.tenant_id = $1
              ORDER BY ay.starts_on DESC
              LIMIT 1
              ON CONFLICT (tenant_id, academic_year_id, name)
              DO UPDATE SET
                academic_level_id = EXCLUDED.academic_level_id,
                grade_level = EXCLUDED.grade_level,
                custom_label = EXCLUDED.custom_label,
                capacity = EXCLUDED.capacity,
                is_active = true,
                updated_at = NOW()
              RETURNING *
            `,
            [
              input.tenant_id,
              createdLevel.id,
              classSection.name,
              classSection.name,
              classSection.custom_label ?? null,
              classSection.capacity ?? null,
              input.created_by_user_id,
            ],]), `
              INSERT INTO class_sections (
                tenant_id,
                academic_year_id,
                academic_level_id,
                name,
                grade_level,
                custom_label,
                capacity,
                created_by_user_id
              )
              SELECT $1, ay.id, $2, $3, $4, $5, $6, $7::uuid
              FROM academic_years ay
              WHERE ay.tenant_id = $1
              ORDER BY ay.starts_on DESC
              LIMIT 1
              ON CONFLICT (tenant_id, academic_year_id, name)
              DO UPDATE SET
                academic_level_id = EXCLUDED.academic_level_id,
                grade_level = EXCLUDED.grade_level,
                custom_label = EXCLUDED.custom_label,
                capacity = EXCLUDED.capacity,
                is_active = true,
                updated_at = NOW()
              RETURNING *
            `,
            [
              input.tenant_id,
              createdLevel.id,
              classSection.name,
              classSection.name,
              classSection.custom_label ?? null,
              classSection.capacity ?? null,
              input.created_by_user_id,
            ],);
          const createdClass = classResult.rows[0];
          createdClasses.push(createdClass);

          for (const stream of classSection.streams ?? []) {
            const streamResult = await this.executeSql(this.getTenantId([`
                INSERT INTO class_streams (
                  tenant_id, class_section_id, name, capacity, class_teacher_id
                )
                VALUES ($1, $2, $3, $4, $5::uuid)
                ON CONFLICT (tenant_id, class_section_id, name)
                DO UPDATE SET
                  capacity = EXCLUDED.capacity,
                  class_teacher_id = EXCLUDED.class_teacher_id,
                  is_active = true,
                  updated_at = NOW()
                RETURNING *
              `,
              [
                input.tenant_id,
                createdClass.id,
                stream.name,
                stream.capacity ?? null,
                stream.class_teacher_id ?? null,
              ],]), `
                INSERT INTO class_streams (
                  tenant_id, class_section_id, name, capacity, class_teacher_id
                )
                VALUES ($1, $2, $3, $4, $5::uuid)
                ON CONFLICT (tenant_id, class_section_id, name)
                DO UPDATE SET
                  capacity = EXCLUDED.capacity,
                  class_teacher_id = EXCLUDED.class_teacher_id,
                  is_active = true,
                  updated_at = NOW()
                RETURNING *
              `,
              [
                input.tenant_id,
                createdClass.id,
                stream.name,
                stream.capacity ?? null,
                stream.class_teacher_id ?? null,
              ],);
            createdStreams.push(streamResult.rows[0]);
          }
        }
      }

      return {
        tenant_id: input.tenant_id,
        system_type: input.system_type,
        levels: createdLevels,
        classes: createdClasses,
        streams: createdStreams,
      };
    });
  }

  async createSubject(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO subjects (
          tenant_id, code, name, created_by_user_id, department_id,
          abbreviation, curriculum_model, subject_type,
          is_compulsory, is_examinable, is_practical, is_co_curricular
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tenant_id, code)
        DO NOTHING
        RETURNING *
      `,
      [input.tenant_id, input.code, input.name, input.created_by_user_id, input.department_id,
        input.abbreviation ?? null, input.curriculum_model ?? 'Custom', input.subject_type ?? 'academic',
        input.is_compulsory ?? true, input.is_examinable ?? true,
        input.is_practical ?? false, input.is_co_curricular ?? false],]), `
        INSERT INTO subjects (
          tenant_id, code, name, created_by_user_id, department_id,
          abbreviation, curriculum_model, subject_type,
          is_compulsory, is_examinable, is_practical, is_co_curricular
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tenant_id, code)
        DO NOTHING
        RETURNING *
      `,
      [input.tenant_id, input.code, input.name, input.created_by_user_id, input.department_id,
        input.abbreviation ?? null, input.curriculum_model ?? 'Custom', input.subject_type ?? 'academic',
        input.is_compulsory ?? true, input.is_examinable ?? true,
        input.is_practical ?? false, input.is_co_curricular ?? false],);

    return result.rows[0];
  }

  async createTeacherAssignment(input: Record<string, unknown>, persistGovernance?: (change: {
    tx: any; assignment: Record<string, any>; previous: Record<string, any>[];
  }) => Promise<void>) {
    const tenantId = String(input.tenant_id);
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      await this.executeSqlTx(tx,
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))::text`,
        [`subject-teacher-continuity:${tenantId}:${input.class_section_id}`]);
      const previous = await this.executeSqlTx(tx, `
        SELECT *, ($6::date > CURRENT_DATE AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)) AS replacing_current_in_future
        FROM teacher_subject_assignments
        WHERE tenant_id = $1 AND class_section_id::text = $2 AND subject_id::text = $3
          AND stream_id IS NOT DISTINCT FROM $4::text AND status = 'active'
          AND ($5::text IS NULL OR academic_term_id IS NULL OR academic_term_id::text = $5::text)
        FOR UPDATE
      `, [tenantId, input.class_section_id, input.subject_id, input.stream_id ?? null,
        input.academic_term_id ?? null, input.effective_from ?? null]);
      if (previous.rows.some((row) => row.replacing_current_in_future
        && String(row.teacher_user_id) === String(input.teacher_user_id))) {
        throw new BadRequestException('This teacher is already assigned. Use today for changes to the current assignment, or select a different teacher to schedule a replacement.');
      }
      if (input.is_primary !== false) {
        await this.executeSqlTx(tx, `
          UPDATE teacher_subject_assignments
          SET status = CASE WHEN $7::date > CURRENT_DATE AND effective_from < $7::date
                THEN 'active' ELSE 'ended' END,
              effective_to = CASE WHEN $7::date > CURRENT_DATE THEN $7::date - 1
                ELSE COALESCE($7::date, CURRENT_DATE) END,
              ended_by_user_id = $6::uuid, reason = COALESCE($8, reason),
              version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1
            AND ($2::text IS NULL OR academic_term_id IS NULL OR academic_term_id::text = $2::text)
            AND class_section_id::text = $3 AND subject_id::text = $4
            AND teacher_user_id::text <> $5 AND status = 'active' AND is_primary = true
            AND stream_id IS NOT DISTINCT FROM $9::text
        `, [tenantId, input.academic_term_id ?? null, input.class_section_id, input.subject_id,
          input.teacher_user_id, input.created_by_user_id, input.effective_from ?? null,
          input.reason ?? 'Reassigned', input.stream_id ?? null]);
      }
      if (!input.academic_term_id) {
        // Replace this teacher's former term allocation without leaving duplicate
        // active teaching permissions alongside the continuing assignment.
        await this.executeSqlTx(tx, `
          UPDATE teacher_subject_assignments
          SET status = 'ended', effective_to = COALESCE($7::date, CURRENT_DATE),
              ended_by_user_id = $6::uuid, version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1 AND class_section_id::text = $2 AND subject_id::text = $3
            AND teacher_user_id::text = $4 AND stream_id IS NOT DISTINCT FROM $5::text
            AND academic_term_id IS NOT NULL AND status = 'active'
        `, [tenantId, input.class_section_id, input.subject_id, input.teacher_user_id,
          input.stream_id ?? null, input.created_by_user_id, input.effective_from ?? null]);
      }

      const result = await this.executeSqlTx(tx, `
        INSERT INTO teacher_subject_assignments (
          tenant_id, academic_term_id, class_section_id, subject_id,
          teacher_user_id, created_by_user_id, assignment_type, is_primary,
          mark_entry_allowed, lesson_record_allowed, report_comment_allowed,
          effective_from, effective_to, reason, status,
          stream_id, department_id, curriculum_model
        ) VALUES (
          $1, $2, $3, $4, $5, $6::uuid, $7, $8, $9, $10, $11,
          COALESCE($12::date, CURRENT_DATE), $13::date, $14, 'active',
          $15::text, $16::uuid, $17
        )
        ON CONFLICT (tenant_id, (COALESCE(academic_term_id, '')), class_section_id,
          subject_id, (COALESCE(stream_id, '')), teacher_user_id) WHERE status = 'active'
        DO UPDATE SET assignment_type = EXCLUDED.assignment_type,
          is_primary = EXCLUDED.is_primary, mark_entry_allowed = EXCLUDED.mark_entry_allowed,
          lesson_record_allowed = EXCLUDED.lesson_record_allowed,
          report_comment_allowed = EXCLUDED.report_comment_allowed,
          effective_from = EXCLUDED.effective_from, effective_to = EXCLUDED.effective_to,
          stream_id = EXCLUDED.stream_id, department_id = EXCLUDED.department_id,
          curriculum_model = EXCLUDED.curriculum_model,
          reason = EXCLUDED.reason, status = 'active', ended_by_user_id = NULL,
          continued_from_assignment_id = NULL,
          version = teacher_subject_assignments.version + 1, updated_at = NOW()
        RETURNING *
      `, [tenantId, input.academic_term_id ?? null, input.class_section_id, input.subject_id,
        input.teacher_user_id, input.created_by_user_id, input.assignment_type ?? 'primary',
        input.is_primary !== false, input.mark_entry_allowed !== false,
        input.lesson_record_allowed !== false, input.report_comment_allowed !== false,
        input.effective_from ?? null, input.effective_to ?? null, input.reason ?? null,
        input.stream_id ?? null, input.department_id ?? null, input.curriculum_model ?? null]);
      if (result.rows[0]) {
        await persistGovernance?.({ tx, assignment: result.rows[0], previous: previous.rows });
      }
      return result.rows[0];
    });
  }

  async listTeacherAssignments(input: {
    tenantId: string;
    teacherUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    const values: unknown[] = [input.tenantId, input.teacherUserId ?? null, limit, offset];
    const result = await this.executeSql(this.getTenantId([`
        SELECT
          assignment.id::text,
          assignment.tenant_id,
          assignment.academic_term_id::text,
          term.name AS academic_term_name,
          assignment.class_section_id::text,
          class_section.name AS class_section_name,
          assignment.subject_id::text,
          subject.name AS subject_name,
          assignment.teacher_user_id::text,
          COALESCE(staff.display_name, staff.staff_number, 'Unlinked teacher') AS teacher_name,
          assignment.status,
          assignment.created_by_user_id::text,
          assignment.created_at::text,
          assignment.updated_at::text
        FROM teacher_subject_assignments assignment
        LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
        LEFT JOIN class_sections class_section ON class_section.tenant_id = assignment.tenant_id AND class_section.id = assignment.class_section_id
        LEFT JOIN subjects subject ON subject.tenant_id = assignment.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = assignment.tenant_id AND staff.user_id::text = assignment.teacher_user_id
        WHERE assignment.tenant_id = $1
          AND ($2::text IS NULL OR assignment.teacher_user_id = $2::text)
          AND assignment.status = 'active'
        ORDER BY assignment.created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      values,]), `
        SELECT assignment.id::text, assignment.tenant_id, assignment.academic_term_id::text,
          term.name AS academic_term_name, assignment.class_section_id::text,
          class_section.name AS class_section_name, assignment.subject_id::text,
          subject.name AS subject_name, assignment.teacher_user_id::text,
          COALESCE(staff.display_name, staff.staff_number, 'Unlinked teacher') AS teacher_name,
          assignment.status, assignment.created_by_user_id::text, assignment.created_at::text, assignment.updated_at::text
        FROM teacher_subject_assignments assignment
        LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
        LEFT JOIN class_sections class_section ON class_section.tenant_id = assignment.tenant_id AND class_section.id = assignment.class_section_id
        LEFT JOIN subjects subject ON subject.tenant_id = assignment.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = assignment.tenant_id AND staff.user_id::text = assignment.teacher_user_id
        WHERE assignment.tenant_id = $1
          AND ($2::text IS NULL OR assignment.teacher_user_id = $2::text)
          AND assignment.status = 'active'
        ORDER BY assignment.created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      values,);

    return result.rows;
  }

  async archiveTeacherAssignment(tenantId: string, id: string, options: Record<string, unknown> = {}) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE teacher_subject_assignments
       SET status = 'ended',
           effective_to = COALESCE($3::date, CURRENT_DATE),
           ended_by_user_id = $4::uuid,
           reason = COALESCE($5, reason),
           version = version + 1,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND status = 'active'
       RETURNING *`,
      [tenantId, id, options.effective_to ?? null, options.actor_user_id ?? null, options.reason ?? null],
    );
    return result.rows[0] ?? null;
  }

  async listTeacherOptions(tenantId: string) {
    const result = await this.executeSql(tenantId, `
        SELECT teacher_option.*
        FROM (
          SELECT DISTINCT ON (membership.user_id)
            COALESCE(staff.id, membership.user_id)::text AS id,
            membership.user_id::text,
            COALESCE(
              NULLIF(staff.display_name, ''),
              NULLIF(user_account.display_name, ''),
              NULLIF(user_account.full_name, ''),
              user_account.email,
              membership.user_id::text
            ) AS label,
            staff.staff_number,
            COALESCE(staff.status, 'active') AS status,
            role.code AS role_code,
            ${ACADEMIC_STAFF_ROLE_CODES_SQL} AS role_codes,
            ${ACADEMIC_STAFF_ROLE_NAMES_SQL} AS role_names,
            ${ACADEMIC_STAFF_TEACHING_SUBJECTS_SQL} AS teaching_subjects,
            ${ACADEMIC_STAFF_HOD_DEPARTMENTS_SQL} AS hod_departments
          FROM tenant_memberships membership
          JOIN users user_account
            ON user_account.id = membership.user_id
          JOIN roles role
            ON role.id = membership.role_id
           AND role.tenant_id = membership.tenant_id
          LEFT JOIN staff_profiles staff
            ON staff.tenant_id = membership.tenant_id
           AND staff.user_id = membership.user_id
          WHERE membership.tenant_id = $1
            AND membership.status = 'active'
            AND user_account.status = 'active'
            AND COALESCE(staff.status, 'active') IN ('active', 'reactivated')
            AND role.code = ANY (ARRAY[${ACADEMIC_TEACHING_ROLE_SQL}]::text[])
          ORDER BY membership.user_id, role.code ASC
        ) teacher_option
        ORDER BY teacher_option.label ASC
        LIMIT 300
      `,
      [tenantId]);

    return result.rows;
  }

  async findTeacherOptionByUserId(tenantId: string, teacherUserId: string) {
    const result = await this.executeSql(tenantId, `
        SELECT
          COALESCE(staff.id, membership.user_id)::text AS id,
          membership.user_id::text,
          COALESCE(
            NULLIF(staff.display_name, ''),
            NULLIF(user_account.display_name, ''),
            NULLIF(user_account.full_name, ''),
            user_account.email,
            membership.user_id::text
          ) AS label,
          staff.staff_number,
          COALESCE(staff.status, 'active') AS status,
          role.code AS role_code,
          ${ACADEMIC_STAFF_ROLE_CODES_SQL} AS role_codes,
          ${ACADEMIC_STAFF_ROLE_NAMES_SQL} AS role_names,
          ${ACADEMIC_STAFF_TEACHING_SUBJECTS_SQL} AS teaching_subjects,
          ${ACADEMIC_STAFF_HOD_DEPARTMENTS_SQL} AS hod_departments
        FROM tenant_memberships membership
        JOIN users user_account
          ON user_account.id = membership.user_id
        JOIN roles role
          ON role.id = membership.role_id
         AND role.tenant_id = membership.tenant_id
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = membership.tenant_id
         AND staff.user_id = membership.user_id
        WHERE membership.tenant_id = $1
          AND membership.user_id = $2::uuid
          AND membership.status = 'active'
          AND user_account.status = 'active'
          AND COALESCE(staff.status, 'active') IN ('active', 'reactivated')
          AND role.code = ANY (ARRAY[${ACADEMIC_TEACHING_ROLE_SQL}]::text[])
        ORDER BY role.code ASC
        LIMIT 1
      `,
      [tenantId, teacherUserId]);

    return result.rows[0] ?? null;
  }

  async assignStudentToClass(input: Record<string, unknown>) {
    return this.prisma.executeWithTenant<any>(input.tenant_id || (input as any).tenant_id, (input as any).created_by_user_id || null, async (tx: any) => {
      if (input.stream_id) {
        const streamResult = await this.executeSqlTx(tx, `
            SELECT id
            FROM class_streams
            WHERE tenant_id = $1
              AND id = $2::uuid
              AND class_section_id = $3::uuid
            LIMIT 1
          `,
          [input.tenant_id, input.stream_id, input.class_section_id]);

        if (!streamResult.rows[0]) {
          throw new Error('Selected stream does not belong to the selected class');
        }
      }

      await this.executeSql(this.getTenantId([`
          UPDATE student_class_assignments
          SET status = 'transferred', updated_at = NOW()
          WHERE tenant_id = $1
            AND student_id = $2::uuid
            AND academic_year_id = $3::uuid
            AND status = 'active'
        `,
        [input.tenant_id, input.student_id, input.academic_year_id],]), `
          UPDATE student_class_assignments
          SET status = 'transferred', updated_at = NOW()
          WHERE tenant_id = $1
            AND student_id = $2::uuid
            AND academic_year_id = $3::uuid
            AND status = 'active'
        `,
        [input.tenant_id, input.student_id, input.academic_year_id],);

      const result = await this.executeSql(this.getTenantId([`
          INSERT INTO student_class_assignments (
            tenant_id,
            student_id,
            class_section_id,
            stream_id,
            academic_level_id,
            academic_year_id,
            assigned_by_user_id
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.student_id,
          input.class_section_id,
          input.stream_id ?? null,
          input.academic_level_id,
          input.academic_year_id,
          input.assigned_by_user_id,
        ],]), `
          INSERT INTO student_class_assignments (
            tenant_id,
            student_id,
            class_section_id,
            stream_id,
            academic_level_id,
            academic_year_id,
            assigned_by_user_id
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.student_id,
          input.class_section_id,
          input.stream_id ?? null,
          input.academic_level_id,
          input.academic_year_id,
          input.assigned_by_user_id,
        ],);

      return result.rows[0];
    });
  }

  async appendAuditLog(input: Record<string, unknown>, tx?: any) {
    const tenantId = String(input.tenant_id);
    const execute = (sql: string, values: unknown[]) => tx
      ? this.executeSqlTx(tx, sql, values)
      : this.executeSql(tenantId, sql, values);
    await execute(`
        INSERT INTO academic_audit_logs (
          school_id, tenant_id, entity_type, entity_id, action, actor_user_id,
          actor_role, previous_values, new_values, reason, effective_at,
          correlation_id, metadata
        )
        VALUES (
          $1, $1, $2, $3::text, $4, $5::uuid, $6,
          $7::jsonb, $8::jsonb, $9, $10::timestamptz, $11, $12::jsonb
        )
      `,
      [
        tenantId,
        input.entity_type,
        input.entity_id ?? null,
        input.action,
        input.actor_user_id ?? null,
        input.actor_role ?? null,
        input.previous_values == null ? null : JSON.stringify(input.previous_values),
        input.new_values == null ? null : JSON.stringify(input.new_values),
        input.reason ?? null,
        input.effective_at ?? null,
        input.correlation_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]);
  }

  private normalizeLimit(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 1) {
      return 25;
    }

    return Math.min(candidate, 50);
  }

  private normalizeOffset(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 0) {
      return 0;
    }

    return candidate;
  }

  async createAttendance(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO academics_attendance (
          tenant_id, class_id, attendance_date, student_id, status, submitted_by
        )
        VALUES ($1, $2, $3::date, $4::uuid, $5, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.class_id,
        input.attendance_date,
        input.student_id,
        input.status,
        input.submitted_by,
      ]]), `
        INSERT INTO academics_attendance (
          tenant_id, class_id, attendance_date, student_id, status, submitted_by
        )
        VALUES ($1, $2, $3::date, $4::uuid, $5, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.class_id,
        input.attendance_date,
        input.student_id,
        input.status,
        input.submitted_by,
      ]);
    return result.rows[0];
  }

  async createAssignment(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO academics_assignments (
          tenant_id, title, description, class_id, subject_id, due_date, teacher_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::uuid, $8)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.description ?? null,
        input.class_id,
        input.subject_id,
        input.due_date,
        input.teacher_id,
        input.status ?? 'Draft',
      ]]), `
        INSERT INTO academics_assignments (
          tenant_id, title, description, class_id, subject_id, due_date, teacher_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::uuid, $8)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.description ?? null,
        input.class_id,
        input.subject_id,
        input.due_date,
        input.teacher_id,
        input.status ?? 'Draft',
      ]);
    return result.rows[0];
  }

  async createResource(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO academics_resources (
          tenant_id, title, type, url, class_id, subject_id, teacher_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.type,
        input.url ?? null,
        input.class_id,
        input.subject_id,
        input.teacher_id,
        input.status ?? 'Draft',
      ]]), `
        INSERT INTO academics_resources (
          tenant_id, title, type, url, class_id, subject_id, teacher_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.type,
        input.url ?? null,
        input.class_id,
        input.subject_id,
        input.teacher_id,
        input.status ?? 'Draft',
      ]);
    return result.rows[0];
  }

  async listMyAssignments(tenant_id: string, teacher_id: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT * FROM academics_assignments
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY due_date ASC
      `,
      [tenant_id, teacher_id]]), `
        SELECT * FROM academics_assignments
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY due_date ASC
      `,
      [tenant_id, teacher_id]);
    return result.rows;
  }

  async listMyResources(tenant_id: string, teacher_id: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT * FROM academics_resources
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
      `,
      [tenant_id, teacher_id]]), `
        SELECT * FROM academics_resources
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
      `,
      [tenant_id, teacher_id]);
    return result.rows;
  }

  async createLessonLog(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO academics_lesson_logs (
          tenant_id, class_id, subject_id, teacher_id, topic, notes, date
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::date)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.class_id,
        input.subject_id,
        input.teacher_id,
        input.topic,
        input.notes ?? null,
        input.date,
      ]]), `
        INSERT INTO academics_lesson_logs (
          tenant_id, class_id, subject_id, teacher_id, topic, notes, date
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::date)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.class_id,
        input.subject_id,
        input.teacher_id,
        input.topic,
        input.notes ?? null,
        input.date,
      ]);
    return result.rows[0];
  }

  async listMyLessonLogs(tenant_id: string, teacher_id: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT * FROM academics_lesson_logs
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY date DESC
      `,
      [tenant_id, teacher_id]]), `
        SELECT * FROM academics_lesson_logs
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY date DESC
      `,
      [tenant_id, teacher_id]);
    return result.rows;
  }

  async listMyAttendance(tenant_id: string, teacher_id: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT * FROM academics_attendance
        WHERE tenant_id = $1 AND submitted_by = $2::uuid
        ORDER BY attendance_date DESC
      `,
      [tenant_id, teacher_id]]), `
        SELECT * FROM academics_attendance
        WHERE tenant_id = $1 AND submitted_by = $2::uuid
        ORDER BY attendance_date DESC
      `,
      [tenant_id, teacher_id]);
    return result.rows;
  }

  async getSummary(tenant_id: string) {
    const [
      assignmentsRes,
      marksRes
    ] = await Promise.all([
      this.executeSql(
        tenant_id,
        `SELECT COUNT(*) as count FROM academics_assignments WHERE tenant_id = $1 AND status != 'Completed'`,
        [tenant_id]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      this.executeSql(
        tenant_id,
        `SELECT 
           subject_id, 
           AVG(score) as avg_score 
         FROM exam_marks 
         WHERE tenant_id = $1 AND status IN ('reviewed', 'locked', 'published')
         GROUP BY subject_id`,
        [tenant_id]
      ).catch(() => ({ rows: [] }))
    ]);

    const gradingQueue = parseInt(assignmentsRes.rows[0]?.count || '0', 10);
    
    let totalScore = 0;
    const subjects = marksRes.rows.map((r: any) => {
      const avg = parseFloat(r.avg_score);
      totalScore += avg;
      return { subject: r.subject_id, value: Math.round(avg) };
    });
    
    const overallAvg = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

    return {
      nextExam: 'Not scheduled', // Could be queried from exams table
      gradingQueue: `${gradingQueue} pending`,
      performanceTrend: overallAvg > 0 ? `Stable average ${overallAvg}%` : 'No data available',
      subjects: subjects.length > 0 ? subjects : [],
    };
  }

  async listAcademicYears(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT id::text, name, starts_on, ends_on, status, is_current, archived_at::text
       FROM academic_years
       WHERE tenant_id = $1
         AND lower(COALESCE(status, 'active')) = 'active'
         AND archived_at IS NULL
       ORDER BY is_current DESC, starts_on DESC, name DESC`,
      [tenantId],
    );
    return result.rows;
  }

  async listAcademicTerms(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT term.id::text, term.academic_year_id::text, term.name,
              term.starts_on, term.ends_on, term.status, term.is_current,
              term.archived_at::text
       FROM academic_terms term
       JOIN academic_years year
         ON year.tenant_id = term.tenant_id
        AND year.id::text = term.academic_year_id::text
       WHERE term.tenant_id = $1
         AND lower(COALESCE(year.status, 'active')) = 'active'
         AND year.archived_at IS NULL
         AND lower(COALESCE(term.status, 'active')) = 'active'
         AND term.archived_at IS NULL
       ORDER BY year.is_current DESC, term.is_current DESC, term.starts_on DESC, term.name DESC`,
      [tenantId],
    );
    return result.rows;
  }

  async listClassSections(
    tenantId: string,
    options: { academicYearId?: string; includeArchived?: boolean } = {},
  ) {
    const result = await this.executeSql(
      tenantId,
      `SELECT section.id::text, section.tenant_id, section.academic_year_id::text,
              section.academic_level_id::text, section.name, section.grade_level,
              section.stream, section.custom_label, section.capacity, section.is_active,
              section.status, section.version, section.archived_at::text,
              section.created_at::text, section.updated_at::text
       FROM class_sections section
       WHERE section.tenant_id = $1
         AND ($2::text IS NULL OR section.academic_year_id::text = $2)
         AND (
           $3::boolean
           OR (
             COALESCE(section.is_active, TRUE) = TRUE
             AND COALESCE(section.status, 'active') = 'active'
             AND section.archived_at IS NULL
           )
         )
       ORDER BY section.grade_level ASC, section.name ASC`,
      [tenantId, options.academicYearId ?? null, options.includeArchived === true],
    );
    return result.rows;
  }

  async listSubjects(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`SELECT id, code, name FROM subjects WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]]), `SELECT id, code, name FROM subjects WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]);
    return result.rows;
  }
  async updateAcademicYear(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.starts_on) { fields.push(`starts_on = $${i++}::date`); values.push(input.starts_on); }
    if (input.ends_on) { fields.push(`ends_on = $${i++}::date`); values.push(input.ends_on); }
    if (input.is_current !== undefined) { fields.push(`is_current = $${i++}`); values.push(input.is_current); }
    if (input.display_order !== undefined) { fields.push(`display_order = $${i++}`); values.push(input.display_order); }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'academic-year', id);
    fields.push(`version = version + 1`, `updated_at = NOW()`);
    values.push(input.expected_version ?? null);

    const result = await this.executeSql(this.getTenantId([`UPDATE academic_years SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values]), `UPDATE academic_years SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values);
    return result.rows[0];
  }

  async archiveAcademicYear(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE academic_years SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE academic_years SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  async updateAcademicTerm(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.starts_on) { fields.push(`starts_on = $${i++}::date`); values.push(input.starts_on); }
    if (input.ends_on) { fields.push(`ends_on = $${i++}::date`); values.push(input.ends_on); }
    if (input.is_current !== undefined) { fields.push(`is_current = $${i++}`); values.push(input.is_current); }
    if (input.display_order !== undefined) { fields.push(`display_order = $${i++}`); values.push(input.display_order); }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'academic-term', id);
    fields.push(`version = version + 1`, `updated_at = NOW()`);
    values.push(input.expected_version ?? null);

    const result = await this.executeSql(this.getTenantId([`UPDATE academic_terms SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values]), `UPDATE academic_terms SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values);
    return result.rows[0];
  }

  async archiveAcademicTerm(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE academic_terms SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE academic_terms SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  async updateClassSection(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.academic_year_id) { fields.push(`academic_year_id = $${i++}`); values.push(input.academic_year_id); }
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.grade_level) { fields.push(`grade_level = $${i++}`); values.push(input.grade_level); }
    if (input.stream) { fields.push(`stream = $${i++}`); values.push(input.stream); }
    if (input.custom_label) { fields.push(`custom_label = $${i++}`); values.push(input.custom_label); }
    if (input.capacity !== undefined) { fields.push(`capacity = $${i++}`); values.push(input.capacity); }
    if (input.code !== undefined) { fields.push(`code = $${i++}`); values.push(input.code || null); }
    if (input.curriculum_model !== undefined) { fields.push(`curriculum_model = $${i++}`); values.push(input.curriculum_model); }
    if (input.enrolment_open !== undefined) { fields.push(`enrolment_open = $${i++}`); values.push(input.enrolment_open); }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'class-section', id);
    fields.push(`version = version + 1`, `updated_at = NOW()`);
    values.push(input.expected_version ?? null);

    const result = await this.executeSql(this.getTenantId([`UPDATE class_sections SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values]), `UPDATE class_sections SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values);
    return result.rows[0];
  }

  async archiveClassSection(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE class_sections SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE class_sections SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  async updateSubject(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.code) { fields.push(`code = $${i++}`); values.push(input.code); }
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    // Let PostgreSQL infer the assignment type from the live column. Older
    // school schemas store subjects.department_id as text, while newer schemas
    // use uuid; an explicit uuid cast makes valid edits fail on the legacy form.
    if (input.department_id !== undefined) { fields.push(`department_id = $${i++}`); values.push(input.department_id || null); }
    if (input.abbreviation !== undefined) { fields.push(`abbreviation = $${i++}`); values.push(input.abbreviation || null); }
    if (input.curriculum_model !== undefined) { fields.push(`curriculum_model = $${i++}`); values.push(input.curriculum_model); }
    if (input.subject_type !== undefined) { fields.push(`subject_type = $${i++}`); values.push(input.subject_type); }
    if (input.is_compulsory !== undefined) { fields.push(`is_compulsory = $${i++}`); values.push(input.is_compulsory); }
    if (input.is_examinable !== undefined) { fields.push(`is_examinable = $${i++}`); values.push(input.is_examinable); }
    if (input.is_practical !== undefined) { fields.push(`is_practical = $${i++}`); values.push(input.is_practical); }
    if (input.is_co_curricular !== undefined) { fields.push(`is_co_curricular = $${i++}`); values.push(input.is_co_curricular); }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'subject', id);
    fields.push(`version = version + 1`, `updated_at = NOW()`);
    values.push(input.expected_version ?? null);

    const result = await this.executeSql(this.getTenantId([`UPDATE subjects SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values]), `UPDATE subjects SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text AND ($${i}::integer IS NULL OR version = $${i}::integer) RETURNING *`,
      values);
    return result.rows[0];
  }

  async archiveSubject(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE subjects SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE subjects SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  async createClassStream(
    tenantId: string,
    classSectionId: string,
    name: string,
    capacity?: number,
    options: Record<string, unknown> = {},
  ) {
    const streamResult = await this.executeSql(tenantId, `
        INSERT INTO class_streams (
          tenant_id, class_section_id, name, capacity, code, stream_teacher_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid)
        ON CONFLICT (tenant_id, class_section_id, name)
        DO NOTHING
        RETURNING *
      `,
      [tenantId, classSectionId, name, capacity ?? null,
        options.code ?? null, options.stream_teacher_user_id ?? null]);
    return streamResult.rows[0];
  }

  async listClassStreams(
    tenantId: string,
    options: { academicYearId?: string; includeArchived?: boolean } = {},
  ) {
    const result = await this.executeSql(
      tenantId,
      `SELECT stream.id::text, stream.tenant_id, stream.class_section_id::text,
              class_section.academic_year_id::text, class_section.name AS class_section_name,
              stream.name, stream.code, stream.capacity,
              stream.stream_teacher_user_id::text, stream.status, stream.is_active, stream.version,
              stream.archived_at::text, stream.created_at::text, stream.updated_at::text
       FROM class_streams stream
       JOIN class_sections class_section
         ON class_section.tenant_id = stream.tenant_id AND class_section.id = stream.class_section_id
       WHERE stream.tenant_id = $1
         AND ($2::text IS NULL OR class_section.academic_year_id::text = $2)
         AND (
           $3::boolean
           OR (
             COALESCE(stream.is_active, TRUE) = TRUE
             AND COALESCE(stream.status, 'active') = 'active'
             AND stream.archived_at IS NULL
             AND COALESCE(class_section.is_active, TRUE) = TRUE
             AND COALESCE(class_section.status, 'active') = 'active'
             AND class_section.archived_at IS NULL
           )
         )
       ORDER BY class_section.name ASC, stream.name ASC`,
      [tenantId, options.academicYearId ?? null, options.includeArchived === true],
    );
    return result.rows;
  }

  // --- Departments ---
  async getDepartments(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT
          department.id::text,
          department.tenant_id,
          department.name,
          department.code,
          department.description,
          department.head_of_department_user_id::text,
          COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name,
          staff.staff_number AS head_of_department_staff_number,
          department.is_active,
          department.status,
          department.version,
          department.created_at::text,
          department.updated_at::text
        FROM academics_departments department
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = department.tenant_id
         AND staff.user_id = department.head_of_department_user_id
        WHERE department.tenant_id = $1
          AND department.is_active = true
        ORDER BY department.name ASC
      `,
      [tenantId]]), `
        SELECT
          department.id::text,
          department.tenant_id,
          department.name,
          department.code,
          department.description,
          department.head_of_department_user_id::text,
          COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name,
          staff.staff_number AS head_of_department_staff_number,
          department.is_active,
          department.status,
          department.version,
          department.created_at::text,
          department.updated_at::text
        FROM academics_departments department
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = department.tenant_id
         AND staff.user_id = department.head_of_department_user_id
        WHERE department.tenant_id = $1
          AND department.is_active = true
        ORDER BY department.name ASC
      `,
      [tenantId]);
    return result.rows;
  }

  async createDepartment(
    tenantId: string,
    name: string,
    headUserId: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_departments (tenant_id, name, head_of_department_user_id, code, description)
      VALUES ($1, $2, $3::uuid, $4, $5)
      ON CONFLICT (tenant_id, name)
      DO NOTHING
      RETURNING *
    `, [tenantId, name, headUserId, options.code ?? null, options.description ?? null]);
    return result.rows[0];
  }

  async updateDepartment(
    tenantId: string,
    id: string,
    name: string | null,
    headUserId: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_departments
       SET name = COALESCE($3, name), head_of_department_user_id = $4::uuid,
           code = COALESCE($5, code), description = COALESCE($6, description),
           version = version + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid
         AND ($7::integer IS NULL OR version = $7::integer)
       RETURNING *`,
      [tenantId, id, name, headUserId, options.code ?? null,
        options.description ?? null, options.expected_version ?? null],
    );
    return result.rows[0] ?? null;
  }

  async archiveDepartment(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE academics_departments SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]]), `UPDATE academics_departments SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  // --- Class Teachers ---
  async getClassTeachers(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT
          ct.id::text,
          ct.tenant_id,
          ct.academic_year_id::text,
          ay.name AS academic_year_name,
          ct.class_section_id::text,
          cs.name AS class_section_name,
          ct.teacher_user_id::text,
          COALESCE(sp.display_name, sp.staff_number, 'Unlinked teacher') AS teacher_name,
          sp.staff_number,
          ct.is_active,
          ct.created_at::text,
          ct.updated_at::text
        FROM academics_class_teachers ct
        LEFT JOIN academic_years ay
          ON ay.tenant_id = ct.tenant_id
         AND ay.id = ct.academic_year_id
        LEFT JOIN class_sections cs
          ON cs.tenant_id = ct.tenant_id
         AND cs.id = ct.class_section_id
        LEFT JOIN staff_profiles sp
          ON sp.tenant_id = ct.tenant_id
         AND sp.user_id = ct.teacher_user_id
        WHERE ct.tenant_id = $1
          AND ct.is_active = true
        ORDER BY cs.name ASC NULLS LAST, teacher_name ASC
      `,
      [tenantId]]), `
        SELECT
          ct.id::text,
          ct.tenant_id,
          ct.academic_year_id::text,
          ay.name AS academic_year_name,
          ct.class_section_id::text,
          cs.name AS class_section_name,
          ct.teacher_user_id::text,
          COALESCE(sp.display_name, sp.staff_number, 'Unlinked teacher') AS teacher_name,
          sp.staff_number,
          ct.is_active,
          ct.created_at::text,
          ct.updated_at::text
        FROM academics_class_teachers ct
        LEFT JOIN academic_years ay
          ON ay.tenant_id = ct.tenant_id
         AND ay.id = ct.academic_year_id
        LEFT JOIN class_sections cs
          ON cs.tenant_id = ct.tenant_id
         AND cs.id = ct.class_section_id
        LEFT JOIN staff_profiles sp
          ON sp.tenant_id = ct.tenant_id
         AND sp.user_id = ct.teacher_user_id
        WHERE ct.tenant_id = $1
          AND ct.is_active = true
        ORDER BY cs.name ASC NULLS LAST, teacher_name ASC
      `,
      [tenantId]);
    return result.rows;
  }

  async assignClassTeacher(
    tenantId: string,
    academicYearId: string,
    classSectionId: string,
    teacherUserId: string,
    options: Record<string, unknown> = {},
  ) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      await this.executeSqlTx(tx, `
        UPDATE academics_class_teachers
        SET is_active = false, status = 'ended',
            effective_to = COALESCE($6::date, CURRENT_DATE),
            ended_by_user_id = $5::uuid, reason = COALESCE($7, reason),
            version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND academic_year_id::text = $2
          AND class_section_id::text = $3 AND teacher_user_id::text <> $4
          AND is_active = true
      `, [tenantId, academicYearId, classSectionId, teacherUserId,
        options.actor_user_id ?? null, options.effective_from ?? null,
        options.reason ?? 'Reassigned']);

      const result = await this.executeSqlTx(tx, `
        INSERT INTO academics_class_teachers (
          school_id, tenant_id, academic_year_id, class_section_id,
          teacher_user_id, is_active, status, assignment_type,
          effective_from, effective_to, reason, created_by_user_id, updated_at
        ) VALUES (
          $1, $1, $2::text, $3::text, $4::uuid, true, 'active', $5,
          COALESCE($6::date, CURRENT_DATE), $7::date, $8, $9::uuid, NOW()
        )
        ON CONFLICT (tenant_id, academic_year_id, class_section_id) WHERE is_active = true
        DO UPDATE SET teacher_user_id = EXCLUDED.teacher_user_id,
          assignment_type = EXCLUDED.assignment_type,
          effective_from = EXCLUDED.effective_from, effective_to = EXCLUDED.effective_to,
          reason = EXCLUDED.reason, status = 'active',
          version = academics_class_teachers.version + 1, updated_at = NOW()
        RETURNING *
      `, [tenantId, academicYearId, classSectionId, teacherUserId,
        options.assignment_type ?? 'permanent', options.effective_from ?? null,
        options.effective_to ?? null, options.reason ?? null, options.actor_user_id ?? null]);
      return result.rows[0];
    });
  }

  async archiveClassTeacher(tenantId: string, id: string, options: Record<string, unknown> = {}) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_class_teachers
       SET is_active = false,
           status = 'ended',
           effective_to = COALESCE($3::date, CURRENT_DATE),
           ended_by_user_id = $4::uuid,
           reason = COALESCE($5, reason),
           version = version + 1,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND is_active = true
       RETURNING *`,
      [tenantId, id, options.effective_to ?? null, options.actor_user_id ?? null, options.reason ?? null],
    );
    return result.rows[0] ?? null;
  }

  async listGradingSystems(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT * FROM academics_grading_systems
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [tenantId],
    );
    return result.rows;
  }

  async createGradingSystem(
    tenantId: string,
    name: string,
    description: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(
      tenantId,
       `INSERT INTO academics_grading_systems (
          school_id, tenant_id, name, description, rules,
          effective_from, effective_to, status, based_on_id, updated_at
        )
       VALUES ($1, $1, $2, $3, $4::jsonb, $5::date, $6::date, $7, $8, NOW())
       ON CONFLICT (tenant_id, name)
       DO NOTHING
       RETURNING *`,
      [tenantId, name, description, JSON.stringify(options.rules ?? []),
        options.effective_from ?? null, options.effective_to ?? null,
        options.status ?? 'draft', options.based_on_id ?? null],
    );
    return result.rows[0];
  }

  async updateGradingSystem(
    tenantId: string,
    id: string,
    name: string | null,
    description: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_grading_systems
       SET name = COALESCE($3, name), description = COALESCE($4, description),
           rules = COALESCE($5::jsonb, rules), effective_from = COALESCE($6::date, effective_from),
           effective_to = COALESCE($7::date, effective_to),
           version = version + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND id::text = $2
         AND ($8::integer IS NULL OR version = $8::integer)
       RETURNING *`,
      [tenantId, id, name, description,
        options.rules === undefined ? null : JSON.stringify(options.rules),
        options.effective_from ?? null, options.effective_to ?? null,
        options.expected_version ?? null],
    );
    return result.rows[0] ?? null;
  }

  async archiveGradingSystem(tenantId: string, id: string) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_grading_systems
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id::text = $2 AND is_active = true
       RETURNING *`,
      [tenantId, id],
    );
    return result.rows[0] ?? null;
  }

  async listAttendanceSettings(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT * FROM academics_attendance_settings
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [tenantId],
    );
    return result.rows;
  }

  async createAttendanceSetting(
    tenantId: string,
    name: string,
    description: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(
      tenantId,
       `INSERT INTO academics_attendance_settings (school_id, tenant_id, name, description, configuration, updated_at)
       VALUES ($1, $1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (tenant_id, name)
       DO NOTHING
       RETURNING *`,
      [tenantId, name, description, JSON.stringify(options.configuration ?? {})],
    );
    return result.rows[0];
  }

  async updateAttendanceSetting(
    tenantId: string,
    id: string,
    name: string | null,
    description: string | null,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_attendance_settings
       SET name = COALESCE($3, name), description = COALESCE($4, description),
           configuration = COALESCE($5::jsonb, configuration),
           version = version + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND id::text = $2
         AND ($6::integer IS NULL OR version = $6::integer)
       RETURNING *`,
      [tenantId, id, name, description,
        options.configuration === undefined ? null : JSON.stringify(options.configuration),
        options.expected_version ?? null],
    );
    return result.rows[0] ?? null;
  }

  async archiveAttendanceSetting(tenantId: string, id: string) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_attendance_settings
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id::text = $2 AND is_active = true
       RETURNING *`,
      [tenantId, id],
    );
    return result.rows[0] ?? null;
  }

  // --- Report Card Settings ---
  async getReportCardSettings(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT * FROM academics_report_card_settings WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]);
    return result.rows;
  }

  async createReportCardSetting(
    tenantId: string,
    name: string,
    gradingSystemId: string | null,
    showRank: boolean,
    showAttendance: boolean,
    options: Record<string, unknown> = {},
  ) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_report_card_settings (
        school_id, tenant_id, name, grading_system_id, show_rank, show_attendance, configuration, updated_at
      )
      VALUES ($1, $1, $2, $3::uuid, $4, $5, $6::jsonb, NOW())
      ON CONFLICT (tenant_id, name)
      DO NOTHING
      RETURNING *
    `, [tenantId, name, gradingSystemId, showRank, showAttendance,
      JSON.stringify(options.configuration ?? {})]);
    return result.rows[0];
  }

  async archiveReportCardSetting(tenantId: string, id: string) {
    const result = await this.executeSql(tenantId, `
      UPDATE academics_report_card_settings
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = $1 AND id::text = $2
      RETURNING *
    `, [tenantId, id]);
    return result.rows[0];
  }

  async updateClassStream(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];
    let parameter = 3;
    if (input.name !== undefined) { fields.push(`name = $${parameter++}`); values.push(input.name); }
    if (input.capacity !== undefined) { fields.push(`capacity = $${parameter++}`); values.push(input.capacity); }
    if (input.class_section_id !== undefined) { fields.push(`class_section_id = $${parameter++}::text`); values.push(input.class_section_id); }
    if (input.code !== undefined) { fields.push(`code = $${parameter++}`); values.push(input.code || null); }
    if (input.stream_teacher_user_id !== undefined) { fields.push(`stream_teacher_user_id = $${parameter++}::uuid`); values.push(input.stream_teacher_user_id || null); }
    if (fields.length === 0) return this.getSetupRecord(tenantId, 'class-stream', id);
    fields.push('version = version + 1', 'updated_at = NOW()');
    values.push(input.expected_version ?? null);
    const expectedParameter = parameter;
    const result = await this.executeSql(tenantId,
      `UPDATE class_streams SET ${fields.join(', ')}
       WHERE tenant_id = $1 AND id::text = $2
         AND ($${expectedParameter}::integer IS NULL OR version = $${expectedParameter}::integer)
       RETURNING *`, values);
    return result.rows[0] ?? null;
  }

  async updateReportCardSetting(tenantId: string, id: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      UPDATE academics_report_card_settings
      SET name = COALESCE($3, name), grading_system_id = COALESCE($4::uuid, grading_system_id),
          show_rank = COALESCE($5::boolean, show_rank),
          show_attendance = COALESCE($6::boolean, show_attendance),
          configuration = COALESCE($7::jsonb, configuration),
          version = version + 1, updated_at = NOW()
      WHERE tenant_id = $1 AND id::text = $2
        AND ($8::integer IS NULL OR version = $8::integer)
      RETURNING *
    `, [tenantId, id, input.name ?? null, input.grading_system_id ?? null,
      input.show_rank ?? null, input.show_attendance ?? null,
      input.configuration === undefined ? null : JSON.stringify(input.configuration),
      input.expected_version ?? null]);
    return result.rows[0] ?? null;
  }

  async setCurrentAcademicPeriod(tenantId: string, entityType: 'academic-year' | 'academic-term', id: string) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      if (entityType === 'academic-year') {
        await this.executeSqlTx(tx, `
          UPDATE academic_years
          SET is_current = false, version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1 AND id::text <> $2 AND is_current = true
        `, [tenantId, id]);
        const selected = await this.executeSqlTx(tx, `
          UPDATE academic_years
          SET is_current = true, status = 'active', version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1 AND id::text = $2 AND status <> 'archived'
          RETURNING *
        `, [tenantId, id]);
        return selected.rows[0] ?? null;
      }

      const term = await this.executeSqlTx(tx, `
        SELECT academic_year_id::text FROM academic_terms
        WHERE tenant_id = $1 AND id::text = $2 LIMIT 1
      `, [tenantId, id]);
      const academicYearId = term.rows[0]?.academic_year_id;
      if (!academicYearId) return null;
      await this.executeSqlTx(tx, `
        UPDATE academic_terms
        SET is_current = false, version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text <> $2 AND is_current = true
      `, [tenantId, id]);
      const selected = await this.executeSqlTx(tx, `
        UPDATE academic_terms
        SET is_current = true, status = 'active', version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2 AND status <> 'archived'
        RETURNING *
      `, [tenantId, id]);
      await this.executeSqlTx(tx, `
        UPDATE academic_years
        SET is_current = (id::text = $2),
            status = CASE WHEN id::text = $2 THEN 'active' ELSE status END,
            version = CASE WHEN is_current <> (id::text = $2) THEN version + 1 ELSE version END,
            updated_at = CASE WHEN is_current <> (id::text = $2) THEN NOW() ELSE updated_at END
        WHERE tenant_id = $1 AND (is_current = true OR id::text = $2)
      `, [tenantId, academicYearId]);
      return selected.rows[0] ?? null;
    });
  }

  async assignAcademicRole(tenantId: string, input: Record<string, unknown>) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const scopeValues = [
        input.department_id ?? null,
        input.academic_year_id ?? null,
        input.class_section_id ?? null,
        input.stream_id ?? null,
      ];
      const existing = await this.executeSqlTx(tx, `
        SELECT * FROM academics_role_appointments
        WHERE tenant_id = $1 AND role_type = $2 AND status = 'active'
          AND department_id::text IS NOT DISTINCT FROM $3::text
          AND academic_year_id IS NOT DISTINCT FROM $4::text
          AND class_section_id IS NOT DISTINCT FROM $5::text
          AND stream_id IS NOT DISTINCT FROM $6::text
        FOR UPDATE
      `, [tenantId, input.role_type, ...scopeValues]);
      const previous = existing.rows[0] ?? null;

      if (previous && String(previous.teacher_user_id) === String(input.teacher_user_id)) {
        const updated = await this.executeSqlTx(tx, `
          UPDATE academics_role_appointments
          SET appointment_type = $3, effective_from = $4::date,
              effective_to = $5::date, reason = $6,
              approved_by_user_id = $7::uuid, version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1 AND id::text = $2
          RETURNING *
        `, [tenantId, previous.id, input.appointment_type ?? 'permanent', input.effective_from,
          input.effective_to ?? null, input.reason ?? null, input.actor_user_id ?? null]);
        return { previous, appointment: updated.rows[0], changed_holder: false };
      }

      if (previous) {
        await this.executeSqlTx(tx, `
          UPDATE academics_role_appointments
          SET status = 'ended', effective_to = $3::date,
              ended_by_user_id = $4::uuid, reason = COALESCE($5, reason),
              version = version + 1, updated_at = NOW()
          WHERE tenant_id = $1 AND id::text = $2
        `, [tenantId, previous.id, input.effective_from, input.actor_user_id ?? null,
          input.reason ?? 'Academic role transferred']);
      }

      const created = await this.executeSqlTx(tx, `
        INSERT INTO academics_role_appointments (
          tenant_id, school_id, role_type, teacher_user_id, department_id,
          academic_year_id, class_section_id, stream_id, appointment_type,
          effective_from, effective_to, reason, appointed_by_user_id, approved_by_user_id
        ) VALUES ($1, $1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8,
                  $9::date, $10::date, $11, $12::uuid, $12::uuid)
        RETURNING *
      `, [tenantId, input.role_type, input.teacher_user_id, input.department_id ?? null,
        input.academic_year_id ?? null, input.class_section_id ?? null, input.stream_id ?? null,
        input.appointment_type ?? 'permanent', input.effective_from, input.effective_to ?? null,
        input.reason ?? null, input.actor_user_id ?? null]);
      return { previous, appointment: created.rows[0], changed_holder: Boolean(previous) };
    });
  }

  async endAcademicRole(tenantId: string, id: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      UPDATE academics_role_appointments
      SET status = 'ended', effective_to = COALESCE($3::date, CURRENT_DATE),
          ended_by_user_id = $4::uuid, reason = COALESCE($5, reason),
          version = version + 1, updated_at = NOW()
      WHERE tenant_id = $1 AND id::text = $2 AND status = 'active'
      RETURNING *
    `, [tenantId, id, input.effective_to ?? null, input.actor_user_id ?? null, input.reason ?? null]);
    return result.rows[0] ?? null;
  }

  async createCurriculumConfiguration(tenantId: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_curriculum_configurations (
        tenant_id, school_id, name, curriculum_model, configuration,
        effective_from, effective_to, status, based_on_id, created_by_user_id
      ) VALUES ($1, $1, $2, $3, $4::jsonb, $5::date, $6::date, $7, $8, $9::uuid)
      ON CONFLICT (tenant_id, name, effective_from) DO NOTHING
      RETURNING *
    `, [tenantId, input.name, input.curriculum_model, JSON.stringify(input.configuration ?? {}),
      input.effective_from, input.effective_to ?? null, input.status ?? 'draft',
      input.based_on_id ?? null, input.actor_user_id ?? null]);
    return result.rows[0] ?? null;
  }

  async updateCurriculumConfiguration(tenantId: string, id: string, input: Record<string, unknown>) {
    const result = await this.executeSql(tenantId, `
      UPDATE academics_curriculum_configurations
      SET name = COALESCE($3, name), curriculum_model = COALESCE($4, curriculum_model),
          configuration = COALESCE($5::jsonb, configuration),
          effective_from = COALESCE($6::date, effective_from),
          effective_to = COALESCE($7::date, effective_to), status = COALESCE($8, status),
          version = version + 1, updated_at = NOW()
      WHERE tenant_id = $1 AND id::text = $2
        AND ($9::integer IS NULL OR version = $9::integer)
      RETURNING *
    `, [tenantId, id, input.name ?? null, input.curriculum_model ?? null,
      input.configuration === undefined ? null : JSON.stringify(input.configuration),
      input.effective_from ?? null, input.effective_to ?? null, input.status ?? null,
      input.expected_version ?? null]);
    return result.rows[0] ?? null;
  }

  async getTeacherReassignmentPreview(tenantId: string, assignment: Record<string, any>) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const count = async (table: string, columns: string[], sql: string, params: unknown[]) => {
        if (!(await this.tableHasColumnsTx(tx, table, columns))) return 0;
        const result = await this.executeSqlTx(tx, sql, params);
        return Number(result.rows[0]?.count ?? 0);
      };
      const scope = [tenantId, assignment.teacher_user_id, assignment.class_section_id,
        assignment.subject_id, assignment.academic_term_id];
      const draftMarks = await count('exam_marks', [
        'tenant_id', 'entered_by_user_id', 'class_section_id', 'subject_id', 'academic_term_id', 'status',
      ], `
        SELECT COUNT(*)::integer AS count FROM exam_marks
        WHERE tenant_id::text = $1 AND entered_by_user_id::text = $2
          AND class_section_id::text = $3 AND subject_id::text = $4
          AND ($5::text IS NULL OR academic_term_id::text = $5::text) AND status = 'draft'
      `, scope);
      const draftTimetable = await count('timetable_slots', [
        'tenant_id', 'teacher_id', 'class_section_id', 'subject_id', 'status',
      ], `
        SELECT COUNT(*)::integer AS count FROM timetable_slots
        WHERE tenant_id::text = $1 AND teacher_id::text = $2
          AND class_section_id::text = $3 AND subject_id::text = $4 AND status = 'draft'
      `, scope.slice(0, 4));
      const publishedTimetable = await count('timetable_slots', [
        'tenant_id', 'teacher_id', 'class_section_id', 'subject_id', 'status',
      ], `
        SELECT COUNT(*)::integer AS count FROM timetable_slots
        WHERE tenant_id::text = $1 AND teacher_id::text = $2
          AND class_section_id::text = $3 AND subject_id::text = $4 AND status = 'published'
      `, scope.slice(0, 4));
      const assignments = await count('academics_assignments', [
        'tenant_id', 'teacher_id', 'class_id', 'subject_id', 'due_date', 'status',
      ], `
        SELECT COUNT(*)::integer AS count FROM academics_assignments
        WHERE tenant_id::text = $1 AND teacher_id::text = $2
          AND class_id::text = $3 AND subject_id::text = $4
          AND due_date::date >= CURRENT_DATE AND lower(status) NOT IN ('completed', 'closed', 'archived')
      `, scope.slice(0, 4));
      const lessonPlans = await count('academics_lesson_plans', [
        'tenant_id', 'teacher_id', 'class_id', 'subject_id', 'term_id', 'status',
      ], `
        SELECT COUNT(*)::integer AS count FROM academics_lesson_plans
        WHERE tenant_id::text = $1 AND teacher_id::text = $2
          AND class_id::text = $3 AND subject_id::text = $4
          AND ($5::text IS NULL OR term_id::text = $5::text) AND upper(status) = 'DRAFT'
      `, scope);
      return {
        draft_marks: draftMarks,
        draft_timetable_slots: draftTimetable,
        published_timetable_slots: publishedTimetable,
        future_assignments: assignments,
        draft_lesson_plans: lessonPlans,
        comments: 0,
        pending_approvals: 0,
      };
    });
  }

  async reassignTeacherAssignment(tenantId: string, id: string, input: Record<string, unknown>) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const scope = await this.executeSqlTx(tx, `
        SELECT class_section_id FROM teacher_subject_assignments
        WHERE tenant_id = $1 AND id::text = $2 AND status = 'active'
      `, [tenantId, id]);
      if (!scope.rows[0]) return null;
      await this.executeSqlTx(tx,
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))::text`,
        [`subject-teacher-continuity:${tenantId}:${scope.rows[0].class_section_id}`]);
      const selected = await this.executeSqlTx(tx, `
        SELECT * FROM teacher_subject_assignments
        WHERE tenant_id = $1 AND id::text = $2 AND status = 'active'
        FOR UPDATE
      `, [tenantId, id]);
      const previous = selected.rows[0];
      if (!previous) return null;
      if (String(previous.teacher_user_id) === String(input.teacher_user_id)) {
        throw new BadRequestException('Select a different teacher when reassigning this responsibility.');
      }
      await this.executeSqlTx(tx, `
        UPDATE teacher_subject_assignments
        SET status = CASE WHEN $3::date > CURRENT_DATE AND effective_from < $3::date
              THEN 'active' ELSE 'ended' END,
            effective_to = CASE WHEN $3::date > CURRENT_DATE THEN $3::date - 1 ELSE $3::date END,
            ended_by_user_id = $4::uuid,
            reason = $5, version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2
      `, [tenantId, id, input.effective_from, input.actor_user_id ?? null, input.reason]);
      const created = await this.executeSqlTx(tx, `
        INSERT INTO teacher_subject_assignments (
          tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id,
          created_by_user_id, assignment_type, is_primary, mark_entry_allowed,
          lesson_record_allowed, report_comment_allowed, effective_from, effective_to,
          reason, status, stream_id, department_id, curriculum_model
        ) VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8, $9, $10, $11,
                  $12::date, $13::date, $14, 'active', $15, $16::uuid, $17)
        RETURNING *
      `, [tenantId, previous.academic_term_id, previous.class_section_id, previous.subject_id,
        input.teacher_user_id, input.actor_user_id ?? null, previous.assignment_type,
        previous.is_primary, previous.mark_entry_allowed, previous.lesson_record_allowed,
        previous.report_comment_allowed, input.effective_from, previous.effective_to,
        input.reason, previous.stream_id, previous.department_id, previous.curriculum_model]);
      const transferred: Record<string, number> = {};
      const manualReview: string[] = [];
      if (input.transfer_future_timetable && await this.tableHasColumnsTx(tx, 'timetable_slots', [
        'tenant_id', 'teacher_id', 'class_section_id', 'subject_id', 'status',
      ])) {
        const moved = await this.executeSqlTx(tx, `
          UPDATE timetable_slots SET teacher_id = $5, updated_at = NOW()
          WHERE tenant_id::text = $1 AND teacher_id::text = $2
            AND class_section_id::text = $3 AND subject_id::text = $4
            AND status IN ('draft', 'published') RETURNING 1
        `, [tenantId, previous.teacher_user_id, previous.class_section_id, previous.subject_id,
          input.teacher_user_id]);
        transferred.timetable_slots = moved.rows.length;
      }
      if (input.transfer_pending_marks) {
        if (await this.tableHasColumnsTx(tx, 'exam_marks', [
          'tenant_id', 'entered_by_user_id', 'class_section_id', 'subject_id', 'academic_term_id', 'status',
        ])) {
          const marks = await this.executeSqlTx(tx, `
            SELECT COUNT(*)::integer AS count FROM exam_marks
            WHERE tenant_id::text = $1 AND entered_by_user_id::text = $2
              AND class_section_id::text = $3 AND subject_id::text = $4
              AND ($5::text IS NULL OR academic_term_id::text = $5::text) AND status = 'draft'
          `, [tenantId, previous.teacher_user_id, previous.class_section_id, previous.subject_id,
            previous.academic_term_id]);
          transferred.pending_mark_responsibilities = Number(marks.rows[0]?.count ?? 0);
        }
        manualReview.push('Draft mark authorship remains with the original teacher; the new active allocation grants completion access.');
      }
      if (input.transfer_assignments && await this.tableHasColumnsTx(tx, 'academics_assignments', [
        'tenant_id', 'teacher_id', 'class_id', 'subject_id', 'due_date', 'status',
      ])) {
        const moved = await this.executeSqlTx(tx, `
          UPDATE academics_assignments SET teacher_id = $5::uuid, updated_at = NOW()
          WHERE tenant_id::text = $1 AND teacher_id::text = $2
            AND class_id::text = $3 AND subject_id::text = $4
            AND due_date::date >= $6::date
            AND lower(status) NOT IN ('completed', 'closed', 'archived') RETURNING 1
        `, [tenantId, previous.teacher_user_id, previous.class_section_id, previous.subject_id,
          input.teacher_user_id, input.effective_from]);
        transferred.assignments = moved.rows.length;
      }
      if (input.transfer_lesson_plans && await this.tableHasColumnsTx(tx, 'academics_lesson_plans', [
        'tenant_id', 'teacher_id', 'class_id', 'subject_id', 'term_id', 'status',
      ])) {
        const moved = await this.executeSqlTx(tx, `
          UPDATE academics_lesson_plans SET teacher_id = $6::uuid, updated_at = NOW()
          WHERE tenant_id::text = $1 AND teacher_id::text = $2
            AND class_id::text = $3 AND subject_id::text = $4
            AND ($5::text IS NULL OR term_id::text = $5::text) AND upper(status) = 'DRAFT' RETURNING 1
        `, [tenantId, previous.teacher_user_id, previous.class_section_id, previous.subject_id,
          previous.academic_term_id, input.teacher_user_id]);
        transferred.lesson_plans = moved.rows.length;
      }
      if (input.transfer_comments) manualReview.push('Class and report comments require record-by-record review because no transferable owner field is defined.');
      if (input.transfer_pending_approvals) manualReview.push('Pending approvals retain their original requester and must be reassigned from the approval queue.');
      return { previous, assignment: created.rows[0], transferred, manual_review: manualReview };
    });
  }

  async mergeSetupRecords(tenantId: string, entityType: string, sourceId: string, targetId: string) {
    const relations: Record<string, Array<{ table: string; column: string }>> = {
      'class-section': [
        { table: 'class_streams', column: 'class_section_id' },
        { table: 'student_class_assignments', column: 'class_section_id' },
        { table: 'teacher_subject_assignments', column: 'class_section_id' },
        { table: 'academics_class_teachers', column: 'class_section_id' },
        { table: 'timetable_slots', column: 'class_section_id' },
      ],
      'class-stream': [
        { table: 'student_class_assignments', column: 'stream_id' },
        { table: 'teacher_subject_assignments', column: 'stream_id' },
        { table: 'timetable_slots', column: 'stream_id' },
        { table: 'academics_attendance', column: 'stream_id' },
        { table: 'exam_marks', column: 'stream_id' },
      ],
      department: [
        { table: 'subjects', column: 'department_id' },
        { table: 'staff_departments', column: 'department_id' },
        { table: 'teacher_subject_assignments', column: 'department_id' },
        { table: 'timetable_slots', column: 'department_id' },
      ],
      subject: [
        { table: 'class_subject_assignments', column: 'subject_id' },
        { table: 'teacher_subject_assignments', column: 'subject_id' },
        { table: 'timetable_slots', column: 'subject_id' },
        { table: 'exam_assessments', column: 'subject_id' },
        { table: 'student_subject_enrollments', column: 'subject_id' },
      ],
      'grading-system': [
        { table: 'academics_report_card_settings', column: 'grading_system_id' },
      ],
    };
    const lifecycleTables: Record<string, string> = {
      'class-section': 'class_sections', 'class-stream': 'class_streams',
      department: 'academics_departments', subject: 'subjects',
      'grading-system': 'academics_grading_systems',
    };
    const table = lifecycleTables[entityType];
    if (!table || !relations[entityType]) return null;
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const records = await this.executeSqlTx(tx, `
        SELECT * FROM ${table} WHERE tenant_id = $1 AND id::text = ANY($2::text[]) FOR UPDATE
      `, [tenantId, [sourceId, targetId]]);
      const source = records.rows.find((item) => String(item.id) === sourceId);
      const target = records.rows.find((item) => String(item.id) === targetId);
      if (!source || !target) return null;
      const migrated: Array<{ table: string; column: string; count: number }> = [];
      for (const relation of relations[entityType]) {
        const metadata = await this.executeSqlTx(tx, `
          SELECT udt_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
            AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id')
          LIMIT 1
        `, [relation.table, relation.column]);
        const type = metadata.rows[0]?.udt_name;
        if (!type) continue;
        const cast = type === 'uuid' ? 'uuid' : 'text';
        const moved = await this.executeSqlTx(tx, `
          UPDATE ${relation.table} SET ${relation.column} = $3::${cast}
          WHERE tenant_id = $1 AND ${relation.column}::text = $2
          RETURNING 1
        `, [tenantId, sourceId, targetId]);
        if (moved.rows.length) migrated.push({ ...relation, count: moved.rows.length });
      }
      const archived = await this.executeSqlTx(tx, `
        UPDATE ${table}
        SET status = 'archived', ${entityType === 'subject' ? '' : 'is_active = false,'}
            archived_at = NOW(), version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2 RETURNING *
      `, [tenantId, sourceId]);
      return { source, target, archived_source: archived.rows[0], migrated };
    });
  }

  async assignDepartmentHead(tenantId: string, departmentId: string, teacherUserId: string | null, input: Record<string, unknown>) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      await this.executeSqlTx(tx, `
        UPDATE academics_department_hod_appointments
        SET status = 'ended', effective_to = COALESCE($4::date, CURRENT_DATE),
            ended_by_user_id = $3::uuid, reason = COALESCE($5, reason),
            version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND department_id::text = $2 AND status = 'active'
          AND ($6::text IS NULL OR teacher_user_id::text <> $6)
      `, [tenantId, departmentId, input.actor_user_id ?? null,
        input.effective_from ?? null, input.reason ?? 'HOD reassigned', teacherUserId]);

      let appointment: any = null;
      if (teacherUserId) {
        const created = await this.executeSqlTx(tx, `
          INSERT INTO academics_department_hod_appointments (
            tenant_id, school_id, department_id, teacher_user_id,
            appointment_type, effective_from, effective_to, reason, appointed_by_user_id
          ) VALUES ($1, $1, $2::uuid, $3::uuid, $4,
                    COALESCE($5::date, CURRENT_DATE), $6::date, $7, $8::uuid)
          ON CONFLICT (tenant_id, department_id) WHERE status = 'active'
          DO UPDATE SET teacher_user_id = EXCLUDED.teacher_user_id,
            appointment_type = EXCLUDED.appointment_type,
            effective_from = EXCLUDED.effective_from,
            effective_to = EXCLUDED.effective_to, reason = EXCLUDED.reason,
            appointed_by_user_id = EXCLUDED.appointed_by_user_id,
            version = academics_department_hod_appointments.version + 1,
            updated_at = NOW()
          RETURNING *
        `, [tenantId, departmentId, teacherUserId, input.appointment_type ?? 'permanent',
          input.effective_from ?? null, input.effective_to ?? null,
          input.reason ?? null, input.actor_user_id ?? null]);
        appointment = created.rows[0];
      }

      const department = await this.executeSqlTx(tx, `
        UPDATE academics_departments
        SET head_of_department_user_id = $3::uuid,
            name = COALESCE($4, name),
            code = COALESCE($5, code),
            description = COALESCE($6, description),
            version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2
          AND ($7::integer IS NULL OR version = $7::integer)
        RETURNING *
      `, [tenantId, departmentId, teacherUserId, input.name ?? null,
        input.code ?? null, input.description ?? null, input.expected_version ?? null]);
      if (!department.rows[0]) {
        const conflict = new Error('ACADEMIC_DEPARTMENT_VERSION_CONFLICT');
        (conflict as Error & { code?: string }).code = 'ACADEMIC_DEPARTMENT_VERSION_CONFLICT';
        throw conflict;
      }
      return { department: department.rows[0], appointment };
    });
  }

  async getSetupRecord(tenantId: string, entityType: string, id: string) {
    const tables: Record<string, string> = {
      'academic-year': 'academic_years',
      'academic-term': 'academic_terms',
      'calendar-period': 'academics_calendar_periods',
      'class-section': 'class_sections',
      'class-stream': 'class_streams',
      department: 'academics_departments',
      subject: 'subjects',
      'class-subject': 'class_subject_assignments',
      'class-teacher': 'academics_class_teachers',
      'teacher-assignment': 'teacher_subject_assignments',
      'grading-system': 'academics_grading_systems',
      'attendance-setting': 'academics_attendance_settings',
      'report-card-setting': 'academics_report_card_settings',
      'academic-role': 'academics_role_appointments',
      'curriculum-configuration': 'academics_curriculum_configurations',
    };
    const table = tables[entityType];
    if (!table) return null;
    const result = await this.executeSql(tenantId,
      `SELECT to_jsonb(record) AS record FROM ${table} record
       WHERE tenant_id = $1 AND id::text = $2 LIMIT 1`, [tenantId, id]);
    return result.rows[0]?.record ?? null;
  }

  async getSetupHistory(tenantId: string, entityType: string, id: string) {
    const auditTypes: Record<string, string[]> = {
      'academic-year': ['academic_year'],
      'academic-term': ['academic_term'],
      'calendar-period': ['academic_calendar_period'],
      'class-section': ['class_section'],
      'class-stream': ['class_stream'],
      department: ['academic_department'],
      subject: ['subject'],
      'class-subject': ['class_subject_assignment'],
      'class-teacher': ['class_teacher_assignment'],
      'teacher-assignment': ['teacher_assignment'],
      'grading-system': ['grading_system'],
      'attendance-setting': ['attendance_setting'],
      'report-card-setting': ['report_card_setting'],
      'academic-role': ['academic_role_appointment'],
      'curriculum-configuration': ['curriculum_configuration'],
    };
    const types = auditTypes[entityType] ?? [entityType];
    const result = await this.executeSql(tenantId, `
      SELECT id::text, entity_type, entity_id::text, action, actor_user_id::text,
             actor_role, previous_values, new_values, reason, effective_at,
             correlation_id, metadata, created_at
      FROM academic_audit_logs
      WHERE tenant_id = $1 AND entity_id::text = $2 AND entity_type = ANY($3::text[])
      ORDER BY created_at DESC LIMIT 100
    `, [tenantId, id, types]);
    return result.rows;
  }

  private setupDependencyDefinitions(entityType: string): SetupDependencyDefinition[] {
    const dependencyMap: Record<string, SetupDependencyDefinition[]> = {
      'academic-year': [
        { table: 'academic_terms', column: 'academic_year_id', label: 'terms' },
        { table: 'class_sections', column: 'academic_year_id', label: 'classes' },
        { table: 'student_class_assignments', column: 'academic_year_id', label: 'student placements' },
        { table: 'academics_class_teachers', column: 'academic_year_id', label: 'class-teacher assignments' },
        { table: 'student_academic_enrollments', column: 'academic_year_id', label: 'academic enrolments' },
        { table: 'exam_series', column: 'academic_year_id', label: 'exam series' },
        { table: 'student_fee_structures', column: 'academic_year_id', label: 'fee structures' },
        { table: 'timetable_versions', column: 'academic_year_id', label: 'timetables' },
      ],
      'academic-term': [
        { table: 'class_subject_assignments', column: 'academic_term_id', label: 'class subjects' },
        { table: 'teacher_subject_assignments', column: 'academic_term_id', label: 'teacher assignments' },
        { table: 'exam_series', column: 'academic_term_id', label: 'exam series' },
        { table: 'exam_marks', column: 'academic_term_id', label: 'exam marks' },
        { table: 'academics_attendance', column: 'academic_term_id', label: 'attendance registers' },
        { table: 'academics_lesson_logs', column: 'academic_term_id', label: 'lesson records' },
        { table: 'student_fee_invoices', column: 'academic_term_id', label: 'fee invoices' },
        { table: 'report_card_artifacts', column: 'academic_term_id', label: 'report cards' },
        { table: 'exam_timetable_slots', column: 'academic_term_id', label: 'exam timetable slots' },
      ],
      'calendar-period': [],
      'class-section': [
        { table: 'class_streams', column: 'class_section_id', label: 'streams' },
        { table: 'student_class_assignments', column: 'class_section_id', label: 'student placements' },
        { table: 'teacher_subject_assignments', column: 'class_section_id', label: 'teacher assignments' },
        { table: 'academics_class_teachers', column: 'class_section_id', label: 'class teachers' },
        { table: 'timetable_slots', column: 'class_section_id', label: 'timetable slots' },
        { table: 'exam_marks', column: 'class_section_id', label: 'exam marks' },
        { table: 'student_academic_enrollments', column: 'class_section_id', label: 'academic enrolments' },
        { table: 'academics_attendance', column: 'class_section_id', label: 'attendance registers' },
        { table: 'academics_lesson_logs', column: 'class_section_id', label: 'lesson records' },
        { table: 'student_fee_invoices', column: 'class_section_id', label: 'fee invoices' },
        { table: 'student_report_cards', column: 'class_section_id', label: 'report cards' },
        { table: 'assignments', column: 'class_section_id', label: 'assignments' },
      ],
      'class-stream': [
        { table: 'student_class_assignments', column: 'stream_id', label: 'student placements' },
        { table: 'teacher_subject_assignments', column: 'stream_id', label: 'teacher assignments' },
        { table: 'timetable_slots', column: 'stream_id', label: 'timetable slots' },
        { table: 'academics_attendance', column: 'stream_id', label: 'attendance registers' },
        { table: 'exam_marks', column: 'stream_id', label: 'exam marks' },
        { table: 'student_report_cards', column: 'stream_id', label: 'report cards' },
      ],
      department: [
        { table: 'subjects', column: 'department_id', label: 'subjects' },
        { table: 'academics_department_hod_appointments', column: 'department_id', label: 'HOD appointments' },
        { table: 'staff_departments', column: 'department_id', label: 'department staff' },
        { table: 'timetable_slots', column: 'department_id', label: 'timetable slots' },
        { table: 'academics_lesson_logs', column: 'department_id', label: 'lesson coverage' },
      ],
      subject: [
        { table: 'class_subject_assignments', column: 'subject_id', label: 'class subject allocations' },
        { table: 'teacher_subject_assignments', column: 'subject_id', label: 'teacher assignments' },
        { table: 'timetable_slots', column: 'subject_id', label: 'timetable slots' },
        { table: 'exam_assessments', column: 'subject_id', label: 'exam assessments' },
        { table: 'exam_marks', column: 'subject_id', label: 'exam marks' },
        { table: 'academics_lesson_logs', column: 'subject_id', label: 'lesson records' },
        { table: 'academics_assignments', column: 'subject_id', label: 'assignments' },
        { table: 'student_subject_enrollments', column: 'subject_id', label: 'student subject selections' },
        { table: 'student_report_cards', column: 'subject_id', label: 'report-card entries' },
      ],
      'class-subject': [],
      'grading-system': [
        { table: 'academics_report_card_settings', column: 'grading_system_id', label: 'report-card settings' },
      ],
      'academic-role': [],
      'curriculum-configuration': [
        { table: 'academics_curriculum_configurations', column: 'based_on_id', label: 'later curriculum versions' },
      ],
    };
    return dependencyMap[entityType] ?? [];
  }

  async getBulkSetupDependencies(
    tenantId: string,
    entityType: string,
    ids: string[],
  ): Promise<SetupDependencyResult[]> {
    const normalizedIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
    if (normalizedIds.length === 0) return [];

    const definitions = this.setupDependencyDefinitions(entityType);
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const dependenciesById = new Map<string, Array<{ table: string; label: string; count: number }>>(
        normalizedIds.map((id) => [id, []]),
      );
      const metadataTables = [...new Set([
        ...definitions.map((dependency) => dependency.table),
        ...(entityType === 'class-subject' ? ['teacher_subject_assignments', 'class_subject_assignments'] : []),
      ])];
      const availableColumns = new Map<string, Set<string>>();

      if (metadataTables.length > 0) {
        const metadata = await this.executeSqlTx(tx, `
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ANY($1::text[])
        `, [metadataTables]);
        for (const row of metadata.rows) {
          const table = String(row.table_name);
          if (!availableColumns.has(table)) availableColumns.set(table, new Set());
          availableColumns.get(table)!.add(String(row.column_name));
        }
      }

      for (const dependency of definitions) {
        const columns = availableColumns.get(dependency.table);
        if (!columns?.has('tenant_id') || !columns.has(dependency.column)) continue;
        const counted = await this.executeSqlTx(tx, `
          SELECT ${dependency.column}::text AS entity_id, COUNT(*)::integer AS count
          FROM ${dependency.table}
          WHERE tenant_id::text = $1 AND ${dependency.column}::text = ANY($2::text[])
          GROUP BY ${dependency.column}::text
        `, [tenantId, normalizedIds]);
        for (const row of counted.rows) {
          const entityId = String(row.entity_id);
          const count = Number(row.count ?? 0);
          if (count > 0 && dependenciesById.has(entityId)) {
            dependenciesById.get(entityId)!.push({
              table: dependency.table,
              label: dependency.label,
              count,
            });
          }
        }
      }

      if (entityType === 'class-subject') {
        const teacherColumns = availableColumns.get('teacher_subject_assignments');
        const offeringColumns = availableColumns.get('class_subject_assignments');
        const joinColumns = ['tenant_id', 'academic_term_id', 'class_section_id', 'subject_id'];
        const canCount = joinColumns.every((column) => teacherColumns?.has(column))
          && [...joinColumns, 'id'].every((column) => offeringColumns?.has(column));
        if (canCount) {
          const linkedTeachers = await this.executeSqlTx(tx, `
            SELECT offering.id::text AS entity_id, COUNT(*)::integer AS count
            FROM teacher_subject_assignments teacher
            JOIN class_subject_assignments offering
              ON offering.tenant_id = teacher.tenant_id
             AND (teacher.academic_term_id IS NULL OR offering.academic_term_id::text = teacher.academic_term_id::text)
             AND offering.class_section_id::text = teacher.class_section_id::text
             AND offering.subject_id::text = teacher.subject_id::text
            WHERE offering.tenant_id::text = $1 AND offering.id::text = ANY($2::text[])
            GROUP BY offering.id::text
          `, [tenantId, normalizedIds]);
          for (const row of linkedTeachers.rows) {
            const entityId = String(row.entity_id);
            const count = Number(row.count ?? 0);
            if (count > 0 && dependenciesById.has(entityId)) {
              dependenciesById.get(entityId)!.push({
                table: 'teacher_subject_assignments',
                label: 'teacher assignments',
                count,
              });
            }
          }
        }
      }

      return normalizedIds.map((id) => {
        const dependencies = dependenciesById.get(id) ?? [];
        const total = dependencies.reduce((sum, dependency) => sum + dependency.count, 0);
        return {
          entity_type: entityType,
          entity_id: id,
          dependencies,
          total,
          can_permanently_delete: total === 0,
          recommendation: total === 0
            ? 'This unused record can be permanently deleted after confirmation.'
            : 'Archive or deactivate this record to preserve linked school history.',
          outcome: total === 0 ? 'safe_to_proceed' : 'proceed_with_warnings',
          reversible: total > 0,
        } satisfies SetupDependencyResult;
      });
    });
  }

  async getSetupDependencies(tenantId: string, entityType: string, id: string): Promise<SetupDependencyResult> {
    const [result] = await this.getBulkSetupDependencies(tenantId, entityType, [id]);
    return result!;
  }

  async getTermClosureBlockers(tenantId: string, termId: string) {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const blockers: Array<{ key: string; label: string; count: number }> = [];
      const add = async (key: string, label: string, tables: Array<[string, string[]]>, sql: string) => {
        for (const [table, columns] of tables) {
          if (!(await this.tableHasColumnsTx(tx, table, columns))) return;
        }
        const result = await this.executeSqlTx(tx, sql, [tenantId, termId]);
        const count = Number(result.rows[0]?.count ?? 0);
        if (count > 0) blockers.push({ key, label, count });
      };
      await add('exam_series', 'exam series not published or archived', [[
        'exam_series', ['tenant_id', 'academic_term_id', 'status'],
      ]], `SELECT COUNT(*)::integer AS count FROM exam_series
            WHERE tenant_id::text = $1 AND academic_term_id::text = $2
              AND status NOT IN ('published', 'archived')`);
      await add('exam_marks', 'draft or submitted marks', [[
        'exam_marks', ['tenant_id', 'academic_term_id', 'status'],
      ]], `SELECT COUNT(*)::integer AS count FROM exam_marks
            WHERE tenant_id::text = $1 AND academic_term_id::text = $2
              AND status IN ('draft', 'submitted')`);
      await add('mark_windows', 'open mark-entry windows', [
        ['exam_mark_entry_windows', ['tenant_id', 'exam_series_id', 'status']],
        ['exam_series', ['tenant_id', 'id', 'academic_term_id']],
      ], `SELECT COUNT(*)::integer AS count FROM exam_mark_entry_windows window
            JOIN exam_series series ON series.tenant_id = window.tenant_id
             AND series.id = window.exam_series_id
            WHERE window.tenant_id::text = $1 AND series.academic_term_id::text = $2
              AND window.status = 'open'`);
      await add('report_cards', 'report cards not published or withdrawn', [
        ['student_report_cards', ['tenant_id', 'exam_series_id', 'status']],
        ['exam_series', ['tenant_id', 'id', 'academic_term_id']],
      ], `SELECT COUNT(*)::integer AS count FROM student_report_cards card
            JOIN exam_series series ON series.tenant_id = card.tenant_id
             AND series.id = card.exam_series_id
            WHERE card.tenant_id::text = $1 AND series.academic_term_id::text = $2
              AND card.status NOT IN ('published', 'withdrawn')`);
      const total = blockers.reduce((sum, blocker) => sum + blocker.count, 0);
      return { blockers, total, can_close: total === 0 };
    });
  }

  async applySetupLifecycle(
    tenantId: string,
    entityType: string,
    id: string,
    action: string,
    actorUserId: string | null,
    expectedVersion?: number,
  ) {
    const configs: Record<string, { table: string; mode: 'status' | 'status-active' | 'active' }> = {
      'academic-year': { table: 'academic_years', mode: 'status' },
      'academic-term': { table: 'academic_terms', mode: 'status' },
      'calendar-period': { table: 'academics_calendar_periods', mode: 'status' },
      'class-section': { table: 'class_sections', mode: 'status-active' },
      'class-stream': { table: 'class_streams', mode: 'status-active' },
      department: { table: 'academics_departments', mode: 'status-active' },
      subject: { table: 'subjects', mode: 'status' },
      'class-subject': { table: 'class_subject_assignments', mode: 'status' },
      'grading-system': { table: 'academics_grading_systems', mode: 'active' },
      'attendance-setting': { table: 'academics_attendance_settings', mode: 'active' },
      'report-card-setting': { table: 'academics_report_card_settings', mode: 'active' },
      'curriculum-configuration': { table: 'academics_curriculum_configurations', mode: 'status' },
    };
    const config = configs[entityType];
    if (!config) return null;
    const status = action === 'archive' ? 'archived'
      : action === 'close' ? 'closed'
      : action === 'deactivate' ? 'inactive'
      : 'active';
    const active = action === 'activate' || action === 'restore';
    const statusSet = config.mode === 'active' ? '' : 'status = lifecycle.status,';
    const activeSet = config.mode === 'status' ? '' : 'is_active = lifecycle.active,';
    const currentSet = entityType === 'academic-year' || entityType === 'academic-term'
      ? `is_current = CASE WHEN lifecycle.status IN ('closed', 'inactive', 'archived') THEN false ELSE record.is_current END,`
      : '';
    const result = await this.executeSql(tenantId, `
      WITH lifecycle_input AS (
        SELECT $3::text AS status,
               $4::boolean AS active,
               $5::uuid AS actor_user_id,
               $6::integer AS expected_version
      )
      UPDATE ${config.table} AS record
      SET ${statusSet} ${activeSet} ${currentSet}
          archived_at = CASE WHEN lifecycle.status = 'archived' THEN NOW() ELSE NULL END,
          archived_by_user_id = CASE WHEN lifecycle.status = 'archived' THEN lifecycle.actor_user_id ELSE NULL END,
          version = record.version + 1, updated_at = NOW()
      FROM lifecycle_input AS lifecycle
      WHERE record.tenant_id = $1 AND record.id::text = $2
        AND (lifecycle.expected_version IS NULL OR record.version = lifecycle.expected_version)
      RETURNING record.*
    `, [tenantId, id, status, active, actorUserId, expectedVersion ?? null]);
    return result.rows[0] ?? null;
  }

  async permanentlyDeleteSetupRecord(tenantId: string, entityType: string, id: string) {
    const tables: Record<string, string> = {
      'academic-year': 'academic_years', 'academic-term': 'academic_terms',
      'calendar-period': 'academics_calendar_periods',
      'class-section': 'class_sections', 'class-stream': 'class_streams',
      department: 'academics_departments', subject: 'subjects',
      'class-subject': 'class_subject_assignments',
      'grading-system': 'academics_grading_systems',
      'attendance-setting': 'academics_attendance_settings',
      'report-card-setting': 'academics_report_card_settings',
      'curriculum-configuration': 'academics_curriculum_configurations',
    };
    const table = tables[entityType];
    if (!table) return null;
    const result = await this.executeSql(tenantId,
      `DELETE FROM ${table} WHERE tenant_id = $1 AND id::text = $2 RETURNING *`, [tenantId, id]);
    return result.rows[0] ?? null;
  }

  private async tableHasColumnsTx(tx: any, table: string, columns: string[]) {
    const result = await this.executeSqlTx(tx, `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    const available = new Set(result.rows.map((row) => String(row.column_name)));
    return columns.every((column) => available.has(column));
  }
}
