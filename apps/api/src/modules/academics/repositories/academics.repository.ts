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
}
