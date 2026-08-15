import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type {
  CreateTimetableSlotDto,
  PublishTimetableVersionDto,
  UpdateTimetableSlotDto,
} from '../dto/timetable.dto';

export interface TimetableConflict {
  type: 'teacher' | 'class' | 'room';
  slot_id: string;
}

export interface TimetableVersionRecord {
  id: string;
  tenant_id: string;
  academic_year: string;
  term_name: string;
  status: string;
  immutable: boolean;
}

export interface TimetableReferenceValidation {
  academic_year: boolean;
  term: boolean;
  class_section: boolean;
  stream: boolean;
  subject: boolean;
  teacher: boolean;
  teacher_assignment: boolean;
}

@Injectable()
export class TimetableRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
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

  async validateSlotReferences(
    tenantId: string,
    input: CreateTimetableSlotDto,
  ): Promise<TimetableReferenceValidation> {
    const result = await this.executeSql<TimetableReferenceValidation>(
      `
        SELECT
          EXISTS (
            SELECT 1 FROM academic_years year
            WHERE year.tenant_id = $1 AND year.name = $2
              AND COALESCE(year.status, 'active') = 'active'
              AND year.archived_at IS NULL
          ) AS academic_year,
          EXISTS (
            SELECT 1
            FROM academic_terms term
            JOIN academic_years year
              ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
            WHERE term.tenant_id = $1 AND year.name = $2 AND term.name = $3
              AND COALESCE(year.status, 'active') = 'active'
              AND year.archived_at IS NULL
              AND COALESCE(term.status, 'active') = 'active'
              AND term.archived_at IS NULL
          ) AS term,
          EXISTS (
            SELECT 1
            FROM class_sections section
            JOIN academic_years year
              ON year.tenant_id = section.tenant_id
             AND year.id::text = section.academic_year_id::text
            WHERE section.tenant_id = $1 AND section.id::text = $4
              AND year.name = $2
              AND COALESCE(section.is_active, TRUE) = TRUE
              AND COALESCE(section.status, 'active') = 'active'
              AND section.archived_at IS NULL
          ) AS class_section,
          ($7::text IS NULL OR EXISTS (
            SELECT 1
            FROM class_streams stream
            JOIN class_sections section
              ON section.tenant_id = stream.tenant_id
             AND section.id::text = stream.class_section_id::text
            JOIN academic_years year
              ON year.tenant_id = section.tenant_id
             AND year.id::text = section.academic_year_id::text
            WHERE stream.tenant_id = $1
              AND stream.id::text = $7
              AND stream.class_section_id::text = $4
              AND year.name = $2
              AND COALESCE(stream.is_active, TRUE) = TRUE
              AND COALESCE(stream.status, 'active') = 'active'
              AND stream.archived_at IS NULL
              AND COALESCE(section.is_active, TRUE) = TRUE
              AND COALESCE(section.status, 'active') = 'active'
              AND section.archived_at IS NULL
          )) AS stream,
          EXISTS (
            SELECT 1 FROM subjects subject
            WHERE subject.tenant_id = $1 AND subject.id::text = $5
          ) AS subject,
          EXISTS (
            SELECT 1 FROM staff_profiles staff
            WHERE staff.tenant_id = $1
              AND staff.user_id = $6::uuid
              AND COALESCE(staff.status, 'active') = 'active'
          ) AS teacher,
          EXISTS (
            SELECT 1
            FROM teacher_subject_assignments assignment
            JOIN academic_terms term
              ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
            JOIN academic_years year
              ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
            WHERE assignment.tenant_id = $1
              AND year.name = $2
              AND term.name = $3
              AND assignment.class_section_id::text = $4
              AND assignment.subject_id::text = $5
              AND assignment.teacher_user_id::text = $6
              AND assignment.status = 'active'
          ) AS teacher_assignment
      `,
      [
        tenantId,
        input.academic_year,
        input.term_name,
        input.class_section_id,
        input.subject_id,
        input.teacher_id,
        input.stream_id ?? null,
      ],
    );

    return result.rows[0] ?? {
      academic_year: false,
      term: false,
      class_section: false,
      stream: false,
      subject: false,
      teacher: false,
      teacher_assignment: false,
    };
  }

  async getOrCreateDraftVersion(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
  }): Promise<TimetableVersionRecord> {
    const result = await this.executeSql<TimetableVersionRecord>(
      `
        INSERT INTO timetable_versions (
          tenant_id, academic_year, term_name, status, immutable
        )
        VALUES ($1, $2, $3, 'draft', FALSE)
        ON CONFLICT (tenant_id, academic_year, term_name, status)
          WHERE status IN ('draft', 'published')
        DO UPDATE SET updated_at = NOW()
        RETURNING id::text, tenant_id, academic_year, term_name, status, immutable
      `,
      [input.tenant_id, input.academic_year, input.term_name],
    );

    return result.rows[0];
  }

  async findSlotConflicts(
    tenantId: string,
    input: CreateTimetableSlotDto & { exclude_slot_id?: string; version_id: string },
  ): Promise<TimetableConflict[]> {
    const result = await this.executeSql<TimetableConflict>(
      `
        SELECT 'teacher' AS type, id::text AS slot_id
        FROM timetable_slots
        WHERE tenant_id = $1
          AND academic_year = $2
          AND term_name = $3
          AND day_of_week = $4
          AND teacher_id = $5
          AND status <> 'cancelled'
          AND version_id = $11::uuid
          AND ($10::text IS NULL OR id::text <> $10)
          AND starts_at < $7::time
          AND ends_at > $6::time
        UNION ALL
        SELECT 'class' AS type, id::text AS slot_id
        FROM timetable_slots
        WHERE tenant_id = $1
          AND academic_year = $2
          AND term_name = $3
          AND day_of_week = $4
          AND class_section_id = $8
          AND status <> 'cancelled'
          AND version_id = $11::uuid
          AND ($10::text IS NULL OR id::text <> $10)
          AND starts_at < $7::time
          AND ends_at > $6::time
        UNION ALL
        SELECT 'room' AS type, id::text AS slot_id
        FROM timetable_slots
        WHERE tenant_id = $1
          AND academic_year = $2
          AND term_name = $3
          AND day_of_week = $4
          AND room_id IS NOT NULL
          AND room_id = $9
          AND status <> 'cancelled'
          AND version_id = $11::uuid
          AND ($10::text IS NULL OR id::text <> $10)
          AND starts_at < $7::time
          AND ends_at > $6::time
      `,
      [
        tenantId,
        input.academic_year,
        input.term_name,
        input.day_of_week,
        input.teacher_id,
        input.starts_at,
        input.ends_at,
        input.class_section_id,
        input.room_id ?? null,
        input.exclude_slot_id ?? null,
        input.version_id,
      ],
    );

    return result.rows;
  }

  async findVersionConflicts(tenantId: string, input: PublishTimetableVersionDto) {
    const result = await this.executeSql<{ conflict_count: number }>(
      `
        SELECT COUNT(*)::int AS conflict_count
        FROM timetable_slots left_slot
        JOIN timetable_versions version
          ON version.tenant_id = left_slot.tenant_id
         AND version.id = left_slot.version_id
         AND version.status = 'draft'
        JOIN timetable_slots right_slot
          ON right_slot.tenant_id = left_slot.tenant_id
         AND right_slot.version_id = left_slot.version_id
         AND right_slot.id <> left_slot.id
         AND right_slot.academic_year = left_slot.academic_year
         AND right_slot.term_name = left_slot.term_name
         AND right_slot.day_of_week = left_slot.day_of_week
         AND right_slot.starts_at < left_slot.ends_at
         AND right_slot.ends_at > left_slot.starts_at
         AND (
           right_slot.teacher_id = left_slot.teacher_id
           OR right_slot.class_section_id = left_slot.class_section_id
           OR (right_slot.room_id IS NOT NULL AND right_slot.room_id = left_slot.room_id)
         )
        WHERE left_slot.tenant_id = $1
          AND left_slot.academic_year = $2
          AND left_slot.term_name = $3
          AND left_slot.status = 'draft'
          AND right_slot.status = 'draft'
      `,
      [tenantId, input.academic_year, input.term_name],
    );

    return Number(result.rows[0]?.conflict_count ?? 0) > 0
      ? [{ type: 'version', slot_id: 'conflict' }]
      : [];
  }

  async createSlot(input: CreateTimetableSlotDto & {
    tenant_id: string;
    version_id: string;
    created_by_user_id: string | null;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO timetable_slots (
          tenant_id,
          version_id,
          academic_year,
          term_name,
          class_section_id,
          subject_id,
          teacher_id,
          room_id,
          day_of_week,
          starts_at,
          ends_at,
          created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::time, $11::time, $12)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.version_id,
        input.academic_year,
        input.term_name,
        input.class_section_id,
        input.subject_id,
        input.teacher_id,
        input.room_id ?? null,
        input.day_of_week,
        input.starts_at,
        input.ends_at,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async updateSlot(input: UpdateTimetableSlotDto & {
    tenant_id: string;
    slot_id: string;
  }) {
    const result = await this.executeSql(
      `
        UPDATE timetable_slots slot
        SET academic_year = $3,
            term_name = $4,
            class_section_id = $5,
            subject_id = $6,
            teacher_id = $7,
            room_id = $8,
            day_of_week = $9,
            starts_at = $10::time,
            ends_at = $11::time,
            updated_at = NOW()
        FROM timetable_versions version
        WHERE slot.tenant_id = $1
          AND slot.id = $2::uuid
          AND slot.version_id = version.id
          AND version.tenant_id = slot.tenant_id
          AND version.status = 'draft'
          AND version.academic_year = $3
          AND version.term_name = $4
          AND slot.status = 'draft'
        RETURNING slot.*
      `,
      [
        input.tenant_id,
        input.slot_id,
        input.academic_year,
        input.term_name,
        input.class_section_id,
        input.subject_id,
        input.teacher_id,
        input.room_id ?? null,
        input.day_of_week,
        input.starts_at,
        input.ends_at,
      ],
    );

    return result.rows[0] ?? null;
  }

  async cancelSlot(tenantId: string, slotId: string) {
    const result = await this.executeSql(
      `
        UPDATE timetable_slots slot
        SET status = 'cancelled', updated_at = NOW()
        FROM timetable_versions version
        WHERE slot.tenant_id = $1
          AND slot.id = $2::uuid
          AND slot.version_id = version.id
          AND version.tenant_id = slot.tenant_id
          AND version.status = 'draft'
          AND slot.status = 'draft'
        RETURNING slot.*
      `,
      [tenantId, slotId],
    );

    return result.rows[0] ?? null;
  }

  async publishVersion(input: PublishTimetableVersionDto & {
    tenant_id: string;
    published_by_user_id: string | null;
  }): Promise<TimetableVersionRecord> {
    const result = await this.executeSql<TimetableVersionRecord>(
      `
        WITH draft AS (
          SELECT id
          FROM timetable_versions
          WHERE tenant_id = $1
            AND academic_year = $2
            AND term_name = $3
            AND status = 'draft'
          FOR UPDATE
        ), archived AS (
          UPDATE timetable_versions
          SET status = 'archived', immutable = TRUE, updated_at = NOW()
          WHERE tenant_id = $1
            AND academic_year = $2
            AND term_name = $3
            AND status = 'published'
          RETURNING id
        ), published AS (
          UPDATE timetable_versions
          SET status = 'published',
              immutable = TRUE,
              notes = $4,
              published_by_user_id = $5,
              published_at = NOW(),
              updated_at = NOW()
          WHERE id = (SELECT id FROM draft)
            AND (SELECT COUNT(*) FROM archived) >= 0
          RETURNING id, tenant_id, academic_year, term_name, status, immutable
        ), published_slots AS (
          UPDATE timetable_slots
          SET status = 'published', updated_at = NOW()
          WHERE version_id = (SELECT id FROM published)
            AND status = 'draft'
          RETURNING id
        )
        SELECT id::text, tenant_id, academic_year, term_name, status, immutable
        FROM published
      `,
      [
        input.tenant_id,
        input.academic_year,
        input.term_name,
        input.notes ?? null,
        input.published_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createRevision(input: PublishTimetableVersionDto & {
    tenant_id: string;
    created_by_user_id: string | null;
  }): Promise<TimetableVersionRecord> {
    const result = await this.executeSql<TimetableVersionRecord>(
      `
        WITH current_published AS (
          SELECT id
          FROM timetable_versions
          WHERE tenant_id = $1
            AND academic_year = $2
            AND term_name = $3
            AND status = 'published'
          ORDER BY published_at DESC NULLS LAST
          LIMIT 1
        ), created AS (
          INSERT INTO timetable_versions (
            tenant_id, academic_year, term_name, status, immutable, notes
          )
          SELECT $1, $2, $3, 'draft', FALSE, $4
          WHERE EXISTS (SELECT 1 FROM current_published)
          ON CONFLICT (tenant_id, academic_year, term_name, status)
            WHERE status IN ('draft', 'published')
          DO NOTHING
          RETURNING id
        ), draft AS (
          SELECT id FROM created
          UNION ALL
          SELECT id
          FROM timetable_versions
          WHERE tenant_id = $1
            AND academic_year = $2
            AND term_name = $3
            AND status = 'draft'
          LIMIT 1
        ), cloned AS (
          INSERT INTO timetable_slots (
            tenant_id, version_id, academic_year, term_name,
            class_section_id, subject_id, teacher_id, room_id,
            day_of_week, starts_at, ends_at, status, created_by_user_id
          )
          SELECT slot.tenant_id, draft.id, slot.academic_year, slot.term_name,
                 slot.class_section_id, slot.subject_id, slot.teacher_id, slot.room_id,
                 slot.day_of_week, slot.starts_at, slot.ends_at, 'draft', $5
          FROM timetable_slots slot
          CROSS JOIN draft
          WHERE slot.version_id = (SELECT id FROM current_published)
            AND slot.status = 'published'
            AND EXISTS (SELECT 1 FROM created)
          RETURNING id
        )
        SELECT version.id::text, version.tenant_id, version.academic_year,
               version.term_name, version.status, version.immutable
        FROM timetable_versions version
        WHERE version.id = (SELECT id FROM draft)
      `,
      [
        input.tenant_id,
        input.academic_year,
        input.term_name,
        input.notes ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async getPlannerVersion(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
  }): Promise<TimetableVersionRecord | null> {
    const result = await this.executeSql<TimetableVersionRecord>(
      `
        SELECT id::text, tenant_id, academic_year, term_name, status, immutable,
               notes, published_at::text, updated_at::text
        FROM timetable_versions
        WHERE tenant_id = $1
          AND academic_year = $2
          AND term_name = $3
          AND status IN ('draft', 'published')
        ORDER BY CASE status WHEN 'draft' THEN 0 ELSE 1 END,
                 updated_at DESC
        LIMIT 1
      `,
      [input.tenant_id, input.academic_year, input.term_name],
    );
    return result.rows[0] ?? null;
  }

  async listVersionSlots(tenantId: string, versionId: string) {
    const result = await this.executeSql(
      `
        SELECT
          slot.id::text,
          slot.version_id::text,
          slot.academic_year,
          slot.term_name,
          slot.class_section_id,
          COALESCE(section.name, slot.class_section_id) AS class_name,
          slot.subject_id,
          COALESCE(subject.name, slot.subject_id) AS subject_name,
          slot.teacher_id,
          COALESCE(staff.full_name, staff.preferred_name, staff.staff_number, staff.email, slot.teacher_id) AS teacher_name,
          slot.room_id,
          slot.day_of_week,
          slot.starts_at::text,
          slot.ends_at::text,
          slot.status,
          slot.created_at::text,
          slot.updated_at::text
        FROM timetable_slots slot
        LEFT JOIN class_sections section
          ON section.tenant_id = slot.tenant_id AND section.id::text = slot.class_section_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = slot.tenant_id AND staff.user_id::text = slot.teacher_id
        WHERE slot.tenant_id = $1
          AND slot.version_id = $2::uuid
          AND slot.status <> 'cancelled'
        ORDER BY slot.day_of_week, slot.starts_at, class_name, subject_name
      `,
      [tenantId, versionId],
    );
    return result.rows;
  }

  async countVersionSlots(tenantId: string, versionId: string): Promise<number> {
    const result = await this.executeSql<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM timetable_slots
       WHERE tenant_id = $1 AND version_id = $2::uuid AND status = 'draft'`,
      [tenantId, versionId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listActiveVersions(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          version.id::text,
          version.academic_year,
          version.term_name,
          version.status,
          version.immutable,
          version.updated_at::text,
          COUNT(slot.id)::int AS slot_count,
          (
            SELECT COUNT(*)::int
            FROM timetable_slots left_slot
            JOIN timetable_slots right_slot
              ON right_slot.tenant_id = left_slot.tenant_id
             AND right_slot.version_id = left_slot.version_id
             AND right_slot.id > left_slot.id
             AND right_slot.day_of_week = left_slot.day_of_week
             AND right_slot.starts_at < left_slot.ends_at
             AND right_slot.ends_at > left_slot.starts_at
             AND (
               right_slot.teacher_id = left_slot.teacher_id
               OR right_slot.class_section_id = left_slot.class_section_id
               OR (right_slot.room_id IS NOT NULL AND right_slot.room_id = left_slot.room_id)
             )
            WHERE left_slot.tenant_id = version.tenant_id
              AND left_slot.version_id = version.id
              AND left_slot.status <> 'cancelled'
              AND right_slot.status <> 'cancelled'
          ) AS conflict_count
        FROM timetable_versions version
        LEFT JOIN timetable_slots slot
          ON slot.tenant_id = version.tenant_id
         AND slot.version_id = version.id
         AND slot.status <> 'cancelled'
        WHERE version.tenant_id = $1
          AND version.status IN ('draft', 'published')
        GROUP BY version.id
        ORDER BY version.updated_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async listPublishedSchedules(input: {
    tenant_id: string;
    academic_year?: string;
    term_name?: string;
    limit?: number;
    offset?: number;
  }) {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 50;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50;
    const offset = Math.max(requestedOffset, 0);

    const result = await this.executeSql(
      `
        SELECT
          version.id::text AS version_id,
          version.academic_year,
          version.term_name,
          version.published_at::text,
          slot.id::text AS slot_id,
          slot.class_section_id,
          COALESCE(section.name, slot.class_section_id) AS class_name,
          slot.subject_id,
          COALESCE(subject.name, slot.subject_id) AS subject_name,
          slot.teacher_id,
          COALESCE(staff.full_name, staff.preferred_name, staff.staff_number, staff.email, slot.teacher_id) AS teacher_name,
          slot.room_id,
          slot.day_of_week,
          slot.starts_at::text,
          slot.ends_at::text,
          slot.status
        FROM timetable_versions version
        JOIN timetable_slots slot
          ON slot.tenant_id = version.tenant_id AND slot.version_id = version.id
         AND slot.status <> 'cancelled'
        LEFT JOIN class_sections section
          ON section.tenant_id = slot.tenant_id AND section.id::text = slot.class_section_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = slot.tenant_id AND staff.user_id::text = slot.teacher_id
        WHERE version.tenant_id = $1
          AND version.status = 'published'
          AND ($2::text IS NULL OR version.academic_year = $2)
          AND ($3::text IS NULL OR version.term_name = $3)
        ORDER BY version.published_at DESC NULLS LAST, slot.day_of_week, slot.starts_at, slot.class_section_id
        LIMIT $4::integer
        OFFSET $5::integer
      `,
      [input.tenant_id, input.academic_year ?? null, input.term_name ?? null, limit, offset],
    );

    return result.rows;
  }

  async listTeacherSchedule(input: {
    tenant_id: string;
    teacher_id: string;
    day_of_week?: string;
    academic_year?: string;
    term_name?: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          slot.id::text AS slot_id,
          slot.version_id::text,
          slot.class_section_id,
          COALESCE(section.name, slot.class_section_id) AS class_name,
          slot.stream_id,
          stream.name AS stream_name,
          slot.subject_id,
          COALESCE(subject.name, slot.subject_id) AS subject_name,
          slot.teacher_id AS original_teacher_id,
          COALESCE(original_teacher.full_name, original_teacher.display_name,
                   original_teacher.preferred_name, original_teacher.email, slot.teacher_id) AS original_teacher_name,
          relief.id::text AS relief_id,
          relief.substitute_teacher_id,
          COALESCE(substitute.full_name, substitute.display_name,
                   substitute.preferred_name, substitute.email) AS substitute_teacher_name,
          COALESCE(relief.substitute_teacher_id, slot.teacher_id) AS effective_teacher_id,
          COALESCE(substitute.full_name, substitute.display_name,
                   substitute.preferred_name, substitute.email,
                   original_teacher.full_name, original_teacher.display_name,
                   original_teacher.preferred_name, original_teacher.email, slot.teacher_id) AS effective_teacher_name,
          (relief.id IS NOT NULL) AS is_relief,
          slot.room_id,
          slot.resource_id::text,
          resource.name AS resource_name,
          slot.period_id::text,
          period.name AS period_name,
          slot.day_of_week,
          slot.starts_at::text,
          slot.ends_at::text,
          slot.status,
          version.academic_year,
          version.term_name
        FROM timetable_versions version
        JOIN timetable_slots slot
          ON slot.tenant_id = version.tenant_id AND slot.version_id = version.id
         AND slot.status <> 'cancelled'
        LEFT JOIN class_sections section
          ON section.tenant_id = slot.tenant_id AND section.id::text = slot.class_section_id
        LEFT JOIN class_streams stream
          ON stream.tenant_id = slot.tenant_id AND stream.id::text = slot.stream_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
        LEFT JOIN staff_profiles original_teacher
          ON original_teacher.tenant_id = slot.tenant_id
         AND original_teacher.user_id::text = slot.teacher_id
        LEFT JOIN timetable_resources resource
          ON resource.tenant_id = slot.tenant_id AND resource.id = slot.resource_id
        LEFT JOIN timetable_period_definitions period
          ON period.tenant_id = slot.tenant_id AND period.id = slot.period_id
        LEFT JOIN timetable_relief_assignments relief
          ON relief.tenant_id = slot.tenant_id AND relief.slot_id = slot.id
         AND relief.relief_date = CURRENT_DATE AND relief.status = 'assigned'
        LEFT JOIN staff_profiles substitute
          ON substitute.tenant_id = relief.tenant_id
         AND substitute.user_id::text = relief.substitute_teacher_id
        WHERE version.tenant_id = $1
          AND version.status = 'published'
          AND (slot.teacher_id = $2 OR relief.substitute_teacher_id = $2)
          AND ($3::text IS NULL OR slot.day_of_week = $3::integer)
          AND ($4::text IS NULL OR version.academic_year = $4)
          AND ($5::text IS NULL OR version.term_name = $5)
        ORDER BY slot.day_of_week, slot.starts_at, slot.class_section_id
      `,
      [input.tenant_id, input.teacher_id, input.day_of_week ?? null,
        input.academic_year ?? null, input.term_name ?? null],
    );

    return result.rows;
  }

  async appendAuditLog(input: {
    tenant_id: string;
    version_id?: string | null;
    slot_id?: string | null;
    actor_user_id?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.executeSql(
      `
        INSERT INTO timetable_audit_logs (
          tenant_id,
          version_id,
          slot_id,
          actor_user_id,
          action,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.version_id ?? null,
        input.slot_id ?? null,
        input.actor_user_id ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
