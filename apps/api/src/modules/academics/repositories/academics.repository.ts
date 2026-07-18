import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';

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
                SELECT id::text, name, starts_on, ends_on, status
                FROM academic_years
                WHERE tenant_id = $1 AND COALESCE(status, 'active') <> 'archived'
              ) item
            ), '[]'::jsonb) AS years,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.starts_on DESC)
              FROM (
                SELECT id::text, academic_year_id::text, name, starts_on, ends_on, status
                FROM academic_terms
                WHERE tenant_id = $1 AND COALESCE(status, 'active') <> 'archived'
              ) item
            ), '[]'::jsonb) AS terms,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.grade_level ASC, item.name ASC)
              FROM (
                SELECT id::text, academic_year_id::text, name, grade_level, stream, capacity
                FROM class_sections
                WHERE tenant_id = $1
              ) item
            ), '[]'::jsonb) AS classes,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.class_section_name ASC, item.name ASC)
              FROM (
                SELECT stream.id::text, stream.class_section_id::text, section.name AS class_section_name,
                       stream.name, stream.capacity
                FROM class_streams stream
                JOIN class_sections section
                  ON section.tenant_id = stream.tenant_id AND section.id = stream.class_section_id
                WHERE stream.tenant_id = $1
              ) item
            ), '[]'::jsonb) AS streams,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name ASC)
              FROM (
                SELECT id::text, code, name, department_id::text
                FROM subjects
                WHERE tenant_id = $1 AND COALESCE(status, 'active') <> 'archived'
              ) item
            ), '[]'::jsonb) AS subjects,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.name ASC)
              FROM (
                SELECT department.id::text, department.name,
                       department.head_of_department_user_id::text,
                       COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name
                FROM academics_departments department
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = department.tenant_id
                 AND staff.user_id = department.head_of_department_user_id
                WHERE department.tenant_id = $1 AND department.is_active = true
              ) item
            ), '[]'::jsonb) AS departments,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.label ASC)
              FROM (
                SELECT id::text, user_id::text,
                       COALESCE(display_name, staff_number, id::text) AS label,
                       staff_number, COALESCE(status, 'active') AS status
                FROM staff_profiles
                WHERE tenant_id = $1 AND user_id IS NOT NULL
                  AND COALESCE(status, 'active') = 'active'
                LIMIT 300
              ) item
            ), '[]'::jsonb) AS teachers,
            COALESCE((
              SELECT jsonb_agg(to_jsonb(item) ORDER BY item.class_section_name ASC, item.teacher_name ASC)
              FROM (
                SELECT class_teacher.id::text, class_teacher.academic_year_id::text,
                       year.name AS academic_year_name, class_teacher.class_section_id::text,
                       section.name AS class_section_name, class_teacher.teacher_user_id::text,
                       COALESCE(staff.display_name, staff.staff_number, 'Unlinked teacher') AS teacher_name
                FROM academics_class_teachers class_teacher
                LEFT JOIN academic_years year
                  ON year.tenant_id = class_teacher.tenant_id AND year.id::text = class_teacher.academic_year_id::text
                LEFT JOIN class_sections section
                  ON section.tenant_id = class_teacher.tenant_id AND section.id::text = class_teacher.class_section_id::text
                LEFT JOIN staff_profiles staff
                  ON staff.tenant_id = class_teacher.tenant_id AND staff.user_id = class_teacher.teacher_user_id
                WHERE class_teacher.tenant_id = $1 AND class_teacher.is_active = true
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
                WHERE assignment.tenant_id = $1 AND assignment.status = 'active'
                ORDER BY assignment.created_at DESC
                LIMIT 300
              ) item
            ), '[]'::jsonb) AS teacher_assignments
        `,
        tenantId,
      );
      const result = (Array.isArray(rows) ? rows[0] : null) ?? {};

      return {
        years: Array.isArray(result.years) ? result.years : [],
        terms: Array.isArray(result.terms) ? result.terms : [],
        classes: Array.isArray(result.classes) ? result.classes : [],
        streams: Array.isArray(result.streams) ? result.streams : [],
        subjects: Array.isArray(result.subjects) ? result.subjects : [],
        departments: Array.isArray(result.departments) ? result.departments : [],
        teachers: Array.isArray(result.teachers) ? result.teachers : [],
        classTeachers: Array.isArray(result.class_teachers) ? result.class_teachers : [],
        teacherAssignments: Array.isArray(result.teacher_assignments) ? result.teacher_assignments : [],
      };
    });
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
          created_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $4::date, $5::date, 'draft', $6::uuid, NOW())
        ON CONFLICT (tenant_id, name)
        DO UPDATE SET
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          updated_at = NOW()
        RETURNING *
      `,
      [
        tenantId,
        academicYearId,
        input.name,
        input.starts_on,
        input.ends_on,
        input.created_by_user_id,
      ]);

    return result.rows[0];
  }

  async createAcademicTerm(input: Record<string, unknown>) {
    const academicTermId = randomUUID();
    const tenantId = String(input.tenant_id);
    const result = await this.executeSql(tenantId, `
        INSERT INTO academic_terms (
          tenant_id, id, academic_year_id, name, starts_on, ends_on, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5::date, $6::date, $7::uuid)
        ON CONFLICT (tenant_id, academic_year_id, name)
        DO UPDATE SET
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          updated_at = NOW()
        RETURNING *
      `,
      [
        tenantId,
        academicTermId,
        input.academic_year_id,
        input.name,
        input.starts_on,
        input.ends_on,
        input.created_by_user_id,
      ]);

    return result.rows[0];
  }

  async createClassSection(input: Record<string, unknown>) {
    const tenantId = String(input.tenant_id);
    const result = await this.executeSql(tenantId, `
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid)
        ON CONFLICT (tenant_id, academic_year_id, name)
        DO UPDATE SET
          academic_level_id = EXCLUDED.academic_level_id,
          grade_level = EXCLUDED.grade_level,
          stream = EXCLUDED.stream,
          custom_label = EXCLUDED.custom_label,
          capacity = EXCLUDED.capacity,
          is_active = true,
          status = 'active',
          updated_at = NOW()
        RETURNING *
      `,
      [
        tenantId,
        input.academic_year_id,
        input.academic_level_id ?? null,
        input.name,
        input.grade_level,
        input.stream ?? null,
        input.custom_label ?? null,
        input.capacity ?? null,
        input.created_by_user_id,
      ]);

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
              level.name,
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
              level.name,
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
        INSERT INTO subjects (tenant_id, code, name, created_by_user_id, department_id)
        VALUES ($1, $2, $3, $4::uuid, $5)
        ON CONFLICT (tenant_id, code)
        DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id, updated_at = NOW()
        RETURNING *
      `,
      [input.tenant_id, input.code, input.name, input.created_by_user_id, input.department_id],]), `
        INSERT INTO subjects (tenant_id, code, name, created_by_user_id, department_id)
        VALUES ($1, $2, $3, $4::uuid, $5)
        ON CONFLICT (tenant_id, code)
        DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id, updated_at = NOW()
        RETURNING *
      `,
      [input.tenant_id, input.code, input.name, input.created_by_user_id, input.department_id],);

    return result.rows[0];
  }

  async createTeacherAssignment(input: Record<string, unknown>) {
    const result = await this.executeSql(this.getTenantId([`
        INSERT INTO teacher_subject_assignments (
          tenant_id,
          academic_term_id,
          class_section_id,
          subject_id,
          teacher_user_id,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid)
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
      ],]), `
        INSERT INTO teacher_subject_assignments (
          tenant_id,
          academic_term_id,
          class_section_id,
          subject_id,
          teacher_user_id,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid)
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
      ],);

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

  async archiveTeacherAssignment(tenantId: string, id: string) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE teacher_subject_assignments
       SET status = 'archived', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND status = 'active'
       RETURNING *`,
      [tenantId, id],
    );
    return result.rows[0] ?? null;
  }

  async listTeacherOptions(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT
          id::text,
          user_id::text,
          COALESCE(display_name, staff_number, id::text) AS label,
          staff_number,
          COALESCE(status, 'active') AS status
        FROM staff_profiles
        WHERE tenant_id = $1
          AND user_id IS NOT NULL
          AND COALESCE(status, 'active') = 'active'
        ORDER BY label ASC
        LIMIT 300
      `,
      [tenantId],]), `
        SELECT
          id::text,
          user_id::text,
          COALESCE(display_name, staff_number, id::text) AS label,
          staff_number,
          COALESCE(status, 'active') AS status
        FROM staff_profiles
        WHERE tenant_id = $1
          AND user_id IS NOT NULL
          AND COALESCE(status, 'active') = 'active'
        ORDER BY label ASC
        LIMIT 300
      `,
      [tenantId],);

    return result.rows;
  }

  async findTeacherOptionByUserId(tenantId: string, teacherUserId: string) {
    const result = await this.executeSql(this.getTenantId([`
        SELECT
          id::text,
          user_id::text,
          COALESCE(display_name, staff_number, id::text) AS label,
          staff_number,
          COALESCE(status, 'active') AS status
        FROM staff_profiles
        WHERE tenant_id = $1
          AND user_id = $2::uuid
          AND COALESCE(status, 'active') = 'active'
        LIMIT 1
      `,
      [tenantId, teacherUserId],]), `
        SELECT
          id::text,
          user_id::text,
          COALESCE(display_name, staff_number, id::text) AS label,
          staff_number,
          COALESCE(status, 'active') AS status
        FROM staff_profiles
        WHERE tenant_id = $1
          AND user_id = $2::uuid
          AND COALESCE(status, 'active') = 'active'
        LIMIT 1
      `,
      [tenantId, teacherUserId],);

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

  async appendAuditLog(input: Record<string, unknown>) {
    const tenantId = String(input.tenant_id);
    await this.executeSql(tenantId, `
        INSERT INTO academic_audit_logs (
          school_id, tenant_id, entity_type, entity_id, action, actor_user_id, metadata
        )
        VALUES ($1, $1, $2, $3::uuid, $4, $5::uuid, $6::jsonb)
      `,
      [
        tenantId,
        input.entity_type,
        input.entity_id ?? null,
        input.action,
        input.actor_user_id ?? null,
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
    const result = await this.executeSql(this.getTenantId([`SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]]), `SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]);
    return result.rows;
  }

  async listAcademicTerms(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`SELECT id, academic_year_id, name, starts_on, ends_on FROM academic_terms WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]]), `SELECT id, academic_year_id, name, starts_on, ends_on FROM academic_terms WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]);
    return result.rows;
  }

  async listClassSections(tenantId: string) {
    const result = await this.executeSql(this.getTenantId([`SELECT id, academic_year_id, name, grade_level, stream, capacity FROM class_sections WHERE tenant_id = $1 ORDER BY grade_level ASC, name ASC`,
      [tenantId]]), `SELECT id, academic_year_id, name, grade_level, stream, capacity FROM class_sections WHERE tenant_id = $1 ORDER BY grade_level ASC, name ASC`,
      [tenantId]);
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
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.executeSql(this.getTenantId([`UPDATE academic_years SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      values]), `UPDATE academic_years SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
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
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.executeSql(this.getTenantId([`UPDATE academic_terms SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      values]), `UPDATE academic_terms SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
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
    if (input.name) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.grade_level) { fields.push(`grade_level = $${i++}`); values.push(input.grade_level); }
    if (input.stream) { fields.push(`stream = $${i++}`); values.push(input.stream); }
    if (input.custom_label) { fields.push(`custom_label = $${i++}`); values.push(input.custom_label); }
    if (input.capacity !== undefined) { fields.push(`capacity = $${i++}`); values.push(input.capacity); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.executeSql(this.getTenantId([`UPDATE class_sections SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      values]), `UPDATE class_sections SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
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
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await this.executeSql(this.getTenantId([`UPDATE subjects SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      values]), `UPDATE subjects SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      values);
    return result.rows[0];
  }

  async archiveSubject(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE subjects SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE subjects SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
  }

  async createClassStream(tenantId: string, classSectionId: string, name: string, capacity?: number) {
    const streamResult = await this.executeSql(tenantId, `
        INSERT INTO class_streams (
          tenant_id, class_section_id, name, capacity
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, class_section_id, name)
        DO UPDATE SET capacity = EXCLUDED.capacity, is_active = true, updated_at = NOW()
        RETURNING *
      `,
      [tenantId, classSectionId, name, capacity ?? null]);
    return streamResult.rows[0];
  }

  async listClassStreams(tenantId: string) {
    const result = await this.executeSql(
      tenantId,
      `SELECT stream.id::text, stream.tenant_id, stream.class_section_id::text,
              class_section.name AS class_section_name, stream.name, stream.capacity,
              stream.created_at::text, stream.updated_at::text
       FROM class_streams stream
       JOIN class_sections class_section
         ON class_section.tenant_id = stream.tenant_id AND class_section.id = stream.class_section_id
       WHERE stream.tenant_id = $1
       ORDER BY class_section.name ASC, stream.name ASC`,
      [tenantId],
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
          department.head_of_department_user_id::text,
          COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name,
          staff.staff_number AS head_of_department_staff_number,
          department.is_active,
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
          department.head_of_department_user_id::text,
          COALESCE(staff.display_name, staff.staff_number) AS head_of_department_name,
          staff.staff_number AS head_of_department_staff_number,
          department.is_active,
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

  async createDepartment(tenantId: string, name: string, headUserId: string | null) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_departments (tenant_id, name, head_of_department_user_id)
      VALUES ($1, $2, $3::uuid)
      ON CONFLICT (tenant_id, name)
      DO UPDATE SET
        head_of_department_user_id = COALESCE(EXCLUDED.head_of_department_user_id, academics_departments.head_of_department_user_id),
        is_active = true,
        updated_at = NOW()
      RETURNING *
    `, [tenantId, name, headUserId]);
    return result.rows[0];
  }

  async updateDepartment(tenantId: string, id: string, name: string | null, headUserId: string | null) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_departments
       SET name = COALESCE($3, name), head_of_department_user_id = $4::uuid, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid AND is_active = true
       RETURNING *`,
      [tenantId, id, name, headUserId],
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

  async assignClassTeacher(tenantId: string, academicYearId: string, classSectionId: string, teacherUserId: string) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_class_teachers (
        school_id, tenant_id, academic_year_id, class_section_id, teacher_user_id, updated_at
      )
      VALUES ($1, $1, $2::text, $3::text, $4::uuid, NOW())
      ON CONFLICT (tenant_id, academic_year_id, class_section_id) WHERE is_active = true
      DO UPDATE SET teacher_user_id = EXCLUDED.teacher_user_id, updated_at = NOW()
      RETURNING *
    `, [tenantId, academicYearId, classSectionId, teacherUserId]);
    return result.rows[0];
  }

  async archiveClassTeacher(tenantId: string, id: string) {
    const result = await this.executeSql(this.getTenantId([`UPDATE academics_class_teachers SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]]), `UPDATE academics_class_teachers SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::text RETURNING *`,
      [tenantId, id]);
    return result.rows[0];
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

  async createGradingSystem(tenantId: string, name: string, description: string | null) {
    const result = await this.executeSql(
      tenantId,
      `INSERT INTO academics_grading_systems (school_id, tenant_id, name, description)
       VALUES ($1, $1, $2, $3)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET description = EXCLUDED.description, is_active = true, updated_at = NOW()
       RETURNING *`,
      [tenantId, name, description],
    );
    return result.rows[0];
  }

  async updateGradingSystem(tenantId: string, id: string, name: string | null, description: string | null) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_grading_systems
       SET name = COALESCE($3, name), description = COALESCE($4, description), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND is_active = true
       RETURNING *`,
      [tenantId, id, name, description],
    );
    return result.rows[0] ?? null;
  }

  async archiveGradingSystem(tenantId: string, id: string) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_grading_systems
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND is_active = true
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

  async createAttendanceSetting(tenantId: string, name: string, description: string | null) {
    const result = await this.executeSql(
      tenantId,
      `INSERT INTO academics_attendance_settings (school_id, tenant_id, name, description)
       VALUES ($1, $1, $2, $3)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET description = EXCLUDED.description, is_active = true, updated_at = NOW()
       RETURNING *`,
      [tenantId, name, description],
    );
    return result.rows[0];
  }

  async updateAttendanceSetting(tenantId: string, id: string, name: string | null, description: string | null) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_attendance_settings
       SET name = COALESCE($3, name), description = COALESCE($4, description), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND is_active = true
       RETURNING *`,
      [tenantId, id, name, description],
    );
    return result.rows[0] ?? null;
  }

  async archiveAttendanceSetting(tenantId: string, id: string) {
    const result = await this.executeSql(
      tenantId,
      `UPDATE academics_attendance_settings
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::text AND is_active = true
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

  async createReportCardSetting(tenantId: string, name: string, gradingSystemId: string | null, showRank: boolean, showAttendance: boolean) {
    const result = await this.executeSql(tenantId, `
      INSERT INTO academics_report_card_settings (
        school_id, tenant_id, name, grading_system_id, show_rank, show_attendance
      )
      VALUES ($1, $1, $2, $3::uuid, $4, $5)
      ON CONFLICT (tenant_id, name)
      DO UPDATE SET
        grading_system_id = EXCLUDED.grading_system_id,
        show_rank = EXCLUDED.show_rank,
        show_attendance = EXCLUDED.show_attendance,
        is_active = true,
        updated_at = NOW()
      RETURNING *
    `, [tenantId, name, gradingSystemId, showRank, showAttendance]);
    return result.rows[0];
  }

  async archiveReportCardSetting(tenantId: string, id: string) {
    const result = await this.executeSql(tenantId, `
      UPDATE academics_report_card_settings
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2::text
      RETURNING *
    `, [tenantId, id]);
    return result.rows[0];
  }
}
