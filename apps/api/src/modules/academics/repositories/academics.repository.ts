import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class AcademicsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createAcademicYear(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO academic_years (
          tenant_id, name, starts_on, ends_on, created_by_user_id
        )
        VALUES ($1, $2, $3::date, $4::date, $5::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.name,
        input.starts_on,
        input.ends_on,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createAcademicTerm(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO academic_terms (
          tenant_id, academic_year_id, name, starts_on, ends_on, created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4::date, $5::date, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.academic_year_id,
        input.name,
        input.starts_on,
        input.ends_on,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createClassSection(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO class_sections (
          tenant_id,
          academic_year_id,
          academic_level_id,
          name,
          grade_level,
          stream,
          custom_label,
          capacity,
          created_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.academic_year_id,
        input.academic_level_id ?? null,
        input.name,
        input.grade_level,
        input.stream ?? null,
        input.custom_label ?? null,
        input.capacity ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
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
    return this.databaseService.withRequestTransaction(async () => {
      const createdLevels = [];
      const createdClasses = [];
      const createdStreams = [];

      for (const level of input.levels) {
        const levelResult = await this.databaseService.query(
          `
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
          [input.tenant_id, input.system_type, level.name, level.order_index],
        );
        const createdLevel = levelResult.rows[0];
        createdLevels.push(createdLevel);

        for (const classSection of level.classes) {
          const classResult = await this.databaseService.query(
            `
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
              SELECT $1, ay.id, $2::uuid, $3, $4, $5, $6, $7::uuid
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
              level.name,
              classSection.custom_label ?? null,
              classSection.capacity ?? null,
              input.created_by_user_id,
            ],
          );
          const createdClass = classResult.rows[0];
          createdClasses.push(createdClass);

          for (const stream of classSection.streams ?? []) {
            const streamResult = await this.databaseService.query(
              `
                INSERT INTO class_streams (
                  tenant_id, class_section_id, name, capacity, class_teacher_id
                )
                VALUES ($1, $2::uuid, $3, $4, $5::uuid)
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
              ],
            );
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
    const result = await this.databaseService.query(
      `
        INSERT INTO subjects (tenant_id, code, name, created_by_user_id)
        VALUES ($1, $2, $3, $4::uuid)
        ON CONFLICT (tenant_id, code)
        DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
        RETURNING *
      `,
      [input.tenant_id, input.code, input.name, input.created_by_user_id],
    );

    return result.rows[0];
  }

  async createTeacherAssignment(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO teacher_subject_assignments (
          tenant_id,
          academic_term_id,
          class_section_id,
          subject_id,
          teacher_user_id,
          created_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid)
        ON CONFLICT (tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id)
        DO UPDATE SET status = 'active', updated_at = NOW()
        RETURNING *
      `,
      [
        input.tenant_id,
        input.academic_term_id,
        input.class_section_id,
        input.subject_id,
        input.teacher_user_id,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
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
    const result = await this.databaseService.query(
      `
        SELECT
          id::text,
          tenant_id,
          academic_term_id::text,
          class_section_id::text,
          subject_id::text,
          teacher_user_id::text,
          status,
          created_by_user_id::text,
          created_at::text,
          updated_at::text
        FROM teacher_subject_assignments
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR teacher_user_id = $2::uuid)
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      values,
    );

    return result.rows;
  }

  async assignStudentToClass(input: Record<string, unknown>) {
    return this.databaseService.withRequestTransaction(async () => {
      if (input.stream_id) {
        const streamResult = await this.databaseService.query(
          `
            SELECT id
            FROM class_streams
            WHERE tenant_id = $1
              AND id = $2::uuid
              AND class_section_id = $3::uuid
            LIMIT 1
          `,
          [input.tenant_id, input.stream_id, input.class_section_id],
        );

        if (!streamResult.rows[0]) {
          throw new Error('Selected stream does not belong to the selected class');
        }
      }

      await this.databaseService.query(
        `
          UPDATE student_class_assignments
          SET status = 'transferred', updated_at = NOW()
          WHERE tenant_id = $1
            AND student_id = $2::uuid
            AND academic_year_id = $3::uuid
            AND status = 'active'
        `,
        [input.tenant_id, input.student_id, input.academic_year_id],
      );

      const result = await this.databaseService.query(
        `
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
        ],
      );

      return result.rows[0];
    });
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.databaseService.query(
      `
        INSERT INTO academic_audit_logs (
          tenant_id, entity_type, entity_id, action, actor_user_id, metadata
        )
        VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.entity_type,
        input.entity_id ?? null,
        input.action,
        input.actor_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
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
    const result = await this.databaseService.query(
      `
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
      ]
    );
    return result.rows[0];
  }

  async createAssignment(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
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
      ]
    );
    return result.rows[0];
  }

  async createResource(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
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
      ]
    );
    return result.rows[0];
  }

  async listMyAssignments(tenant_id: string, teacher_id: string) {
    const result = await this.databaseService.query(
      `
        SELECT * FROM academics_assignments
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY due_date ASC
      `,
      [tenant_id, teacher_id]
    );
    return result.rows;
  }

  async listMyResources(tenant_id: string, teacher_id: string) {
    const result = await this.databaseService.query(
      `
        SELECT * FROM academics_resources
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
      `,
      [tenant_id, teacher_id]
    );
    return result.rows;
  }

  async createLessonLog(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
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
      ]
    );
    return result.rows[0];
  }

  async listMyLessonLogs(tenant_id: string, teacher_id: string) {
    const result = await this.databaseService.query(
      `
        SELECT * FROM academics_lesson_logs
        WHERE tenant_id = $1 AND teacher_id = $2::uuid
        ORDER BY date DESC
      `,
      [tenant_id, teacher_id]
    );
    return result.rows;
  }

  async listMyAttendance(tenant_id: string, teacher_id: string) {
    const result = await this.databaseService.query(
      `
        SELECT * FROM academics_attendance
        WHERE tenant_id = $1 AND submitted_by = $2::uuid
        ORDER BY attendance_date DESC
      `,
      [tenant_id, teacher_id]
    );
    return result.rows;
  }

  async getSummary(tenant_id: string) {
    const [
      assignmentsRes,
    ] = await Promise.all([
      this.databaseService.query(
        'SELECT COUNT(*) as count FROM academics_assignments WHERE tenant_id = $1 AND status != \'Completed\'',
        [tenant_id]
      ).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const gradingQueue = parseInt(assignmentsRes.rows[0]?.count || '0', 10);

    return {
      nextExam: 'Mid-Term (14 days)', // Can be derived from exams table when added
      gradingQueue: `${gradingQueue} pending`,
      performanceTrend: 'Stable average 68%',
      subjects: [
        { subject: 'Mathematics', value: 72 },
        { subject: 'English', value: 65 },
        { subject: 'Science', value: 81 },
      ],
    };
  }

  async listAcademicYears(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async listAcademicTerms(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT id, academic_year_id, name, starts_on, ends_on FROM academic_terms WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async listClassSections(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT id, academic_year_id, name, grade_level, stream, capacity FROM class_sections WHERE tenant_id = $1 ORDER BY grade_level ASC, name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async listSubjects(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT id, code, name FROM subjects WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }
  async updateAcademicYear(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.starts_on) { fields.push(`starts_on = $${i++}::date`); values.push(input.starts_on); }
    if (input.ends_on) { fields.push(`ends_on = $${i++}::date`); values.push(input.ends_on); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.databaseService.query(
      `UPDATE academic_years SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async archiveAcademicYear(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE academic_years SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  async updateAcademicTerm(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.starts_on) { fields.push(`starts_on = $${i++}::date`); values.push(input.starts_on); }
    if (input.ends_on) { fields.push(`ends_on = $${i++}::date`); values.push(input.ends_on); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.databaseService.query(
      `UPDATE academic_terms SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async archiveAcademicTerm(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE academic_terms SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  async updateClassSection(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.grade_level) { fields.push(`grade_level = $${i++}`); values.push(input.grade_level); }
    if (input.stream) { fields.push(`stream = $${i++}`); values.push(input.stream); }
    if (input.custom_label) { fields.push(`custom_label = $${i++}`); values.push(input.custom_label); }
    if (input.capacity !== undefined) { fields.push(`capacity = $${i++}`); values.push(input.capacity); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.databaseService.query(
      `UPDATE class_sections SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async archiveClassSection(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE class_sections SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  async updateSubject(tenantId: string, id: string, input: Record<string, unknown>) {
    const fields = [];
    const values: unknown[] = [tenantId, id];
    let i = 3;
    if (input.code) { fields.push(`code = $${i++}`); values.push(input.code); }
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.databaseService.query(
      `UPDATE subjects SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async archiveSubject(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE subjects SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  async createClassStream(tenantId: string, classSectionId: string, name: string, capacity?: number) {
    const streamResult = await this.databaseService.query(
      `
        INSERT INTO class_streams (
          tenant_id, class_section_id, name, capacity
        )
        VALUES ($1, $2::uuid, $3, $4)
        RETURNING *
      `,
      [tenantId, classSectionId, name, capacity ?? null]
    );
    return streamResult.rows[0];
  }

  // --- Departments ---
  async getDepartments(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM academics_departments WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async createDepartment(tenantId: string, name: string, headUserId: string | null) {
    const result = await this.databaseService.query(
      `INSERT INTO academics_departments (tenant_id, name, head_of_department_user_id)
       VALUES ($1, $2, $3::uuid) RETURNING *`,
      [tenantId, name, headUserId]
    );
    return result.rows[0];
  }

  async archiveDepartment(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE academics_departments SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  // --- Class Teachers ---
  async getClassTeachers(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM academics_class_teachers WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );
    return result.rows;
  }

  async assignClassTeacher(tenantId: string, academicYearId: string, classSectionId: string, teacherUserId: string) {
    const result = await this.databaseService.query(
      `INSERT INTO academics_class_teachers (tenant_id, academic_year_id, class_section_id, teacher_user_id)
       VALUES ($1, $2::uuid, $3::uuid, $4::uuid) RETURNING *`,
      [tenantId, academicYearId, classSectionId, teacherUserId]
    );
    return result.rows[0];
  }

  async archiveClassTeacher(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE academics_class_teachers SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  // --- Report Card Settings ---
  async getReportCardSettings(tenantId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM academics_report_card_settings WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async createReportCardSetting(tenantId: string, name: string, gradingSystemId: string | null, showRank: boolean, showAttendance: boolean) {
    const result = await this.databaseService.query(
      `INSERT INTO academics_report_card_settings (tenant_id, name, grading_system_id, show_rank, show_attendance)
       VALUES ($1, $2, $3::uuid, $4, $5) RETURNING *`,
      [tenantId, name, gradingSystemId, showRank, showAttendance]
    );
    return result.rows[0];
  }

  async archiveReportCardSetting(tenantId: string, id: string) {
    const result = await this.databaseService.query(
      `UPDATE academics_report_card_settings SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }
}
