import { randomUUID } from 'node:crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { TimetablePeriodTypeDto } from '../dto/timetable.dto';
import { validateConfigurationDays, validatePeriodTypes } from '../period-type-policy';

type QueryResult<T = any> = { rows: T[]; rowCount: number };

export interface TimetableScope {
  type: 'school' | 'class' | 'stream' | 'teacher' | 'requirement';
  id?: string;
}

export interface GeneratedPlacement {
  requirement_id: string;
  class_section_id: string;
  stream_id?: string | null;
  subject_id: string;
  teacher_id: string;
  resource_id?: string | null;
  parallel_key?: string | null;
  day_of_week: number;
  period_id: string;
  starts_at: string;
  ends_at: string;
  duration_periods: number;
  locked?: boolean;
}

export interface GeneratedGap {
  requirement_id: string;
  remaining_periods: number;
  duration_periods: number;
  reason_code: string;
  reason_message: string;
  metadata?: Record<string, unknown>;
}

export interface ManagedClassSectionScopeInput {
  tenant_id: string;
  user_id: string;
  role: string;
  academic_year: string;
}

export interface HodDepartmentScopeInput {
  tenant_id: string;
  user_id: string;
}

export interface TimetableViewRepositoryInput {
  tenant_id: string;
  academic_year: string;
  term_name: string;
  view: string;
  version_id?: string;
  class_section_id?: string;
  stream_id?: string;
  teacher_id?: string;
  resource_id?: string;
  day_of_week?: number;
  prefer_draft?: boolean;
  /** Undefined means unrestricted; an empty array deliberately returns no lessons. */
  allowed_class_section_ids?: string[];
  department_id?: string;
}

export type TimetablePortalScope =
  | {
    kind: 'class';
    student_id: string;
    class_section_id: string;
    stream_id: string | null;
  }
  | {
    kind: 'teacher';
    teacher_id: string;
  };

export interface TimetablePortalStudent {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_section_id: string;
  class_name: string;
  stream_id: string | null;
  stream_name: string | null;
}

export interface TimetablePortalScopeResolution {
  scope: TimetablePortalScope;
  students: TimetablePortalStudent[];
  active_student: TimetablePortalStudent | null;
}

export interface TimetablePortalScheduleInput {
  tenant_id: string;
  user_id: string;
  role: string;
  requested_student_id?: string;
  academic_year?: string;
  term_name?: string;
  version_id?: string;
  date?: string;
}

export interface TimetablePortalVersion {
  id: string;
  academic_year: string;
  term_name: string;
  revision_number: number;
  status: 'published';
  published_at: string | null;
}

export interface TimetablePortalScheduleItem {
  id: string;
  version_id: string;
  class_section_id: string;
  class_name: string;
  stream_id: string | null;
  stream_name: string | null;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  resource_id: string | null;
  resource_name: string | null;
  room_id: string | null;
  day_of_week: number;
  period_id: string | null;
  starts_at: string;
  ends_at: string;
  duration_periods: number;
  parallel_key: string | null;
  relief_id: string | null;
  relief_date: string | null;
  substitute_teacher_id: string | null;
  substitute_teacher_name: string | null;
  effective_teacher_id: string;
  effective_teacher_name: string;
}

export interface TimetablePortalSchedule {
  scope: TimetablePortalScope;
  students: TimetablePortalStudent[];
  active_student: TimetablePortalStudent | null;
  version: TimetablePortalVersion | null;
  items: TimetablePortalScheduleItem[];
}

export interface CreateTimetableSlotAtomicInput {
  tenant_id: string;
  version_id: string;
  expected_version_row_version?: number;
  requirement_id?: string | null;
  class_section_id: string;
  stream_id?: string | null;
  subject_id: string;
  teacher_id: string;
  resource_id?: string | null;
  room_id?: string | null;
  period_id: string;
  parallel_key?: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  duration_periods?: number;
  locked?: boolean;
  notes?: string | null;
  actor_user_id: string | null;
}

export interface UpdateTimetableSlotAtomicInput {
  tenant_id: string;
  slot_id: string;
  expected_row_version: number;
  expected_version_row_version?: number;
  requirement_id?: string | null;
  class_section_id?: string;
  stream_id?: string | null;
  subject_id?: string;
  teacher_id?: string;
  resource_id?: string | null;
  room_id?: string | null;
  period_id?: string;
  parallel_key?: string | null;
  day_of_week?: number;
  starts_at?: string;
  ends_at?: string;
  duration_periods?: number;
  actor_user_id: string | null;
}

export interface CancelTimetableSlotAtomicInput {
  tenant_id: string;
  slot_id: string;
  expected_row_version: number;
  reason?: string | null;
  actor_user_id: string | null;
}

@Injectable()
export class TimetableWorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.prisma.query<T>(sql, params);
  }

  private asRows<T>(result: unknown): T[] {
    return Array.isArray(result) ? result as T[] : result == null ? [] : [result as T];
  }

  private isPostgresUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const record = error as Record<string, unknown>;
    if (record.code === '23505') return true;

    const meta = record.meta;
    if (meta && typeof meta === 'object') {
      const metaRecord = meta as Record<string, unknown>;
      if (metaRecord.code === '23505' || String(metaRecord.message ?? '').includes('23505')) return true;
    }

    const cause = record.cause;
    return Boolean(
      cause
      && typeof cause === 'object'
      && (cause as Record<string, unknown>).code === '23505',
    );
  }

  private async acquireTimetableVersionLock(
    tx: any,
    tenantId: string,
    versionId: string,
  ): Promise<void> {
    await tx.$queryRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text))`,
      tenantId,
      versionId,
    );
  }

  private assertAtomicSlotTime(input: {
    day_of_week: number;
    starts_at: string;
    ends_at: string;
    duration_periods?: number;
  }): void {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
    if (!Number.isInteger(input.day_of_week) || input.day_of_week < 1 || input.day_of_week > 7) {
      throw new BadRequestException('Select a configured timetable day');
    }
    if (!timePattern.test(input.starts_at) || !timePattern.test(input.ends_at) || input.starts_at >= input.ends_at) {
      throw new BadRequestException('Timetable lesson start and end times are invalid');
    }
    const duration = Number(input.duration_periods ?? 1);
    if (!Number.isInteger(duration) || duration < 1 || duration > 4) {
      throw new BadRequestException('Timetable lesson duration must be between one and four periods');
    }
  }

  private async assertAtomicSlotReferences(tx: any, input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    requirement_id?: string | null;
    class_section_id: string;
    stream_id?: string | null;
    subject_id: string;
    teacher_id: string;
    resource_id?: string | null;
    period_id: string;
    day_of_week: number;
    starts_at: string;
    relief_date?: string;
  }): Promise<void> {
    const references = this.asRows<{
      class_ok: boolean;
      stream_ok: boolean;
      subject_ok: boolean;
      teacher_ok: boolean;
      allocation_ok: boolean;
      resource_ok: boolean;
      period_ok: boolean;
      requirement_ok: boolean;
    }>(await tx.$queryRawUnsafe(
      `SELECT
         EXISTS (
           SELECT 1
           FROM class_sections section
           JOIN academic_years year
             ON year.tenant_id = section.tenant_id AND year.id = section.academic_year_id
           WHERE section.tenant_id = $1 AND section.id::text = $4
             AND year.name = $2 AND COALESCE(section.is_active, TRUE)
         ) AS class_ok,
         ($5::text IS NULL OR EXISTS (
           SELECT 1 FROM class_streams stream
           WHERE stream.tenant_id = $1 AND stream.id::text = $5
             AND stream.class_section_id::text = $4
         )) AS stream_ok,
         EXISTS (
           SELECT 1 FROM subjects subject
           WHERE subject.tenant_id = $1 AND subject.id::text = $6
             AND COALESCE(subject.status, 'active') = 'active'
         ) AS subject_ok,
         EXISTS (
           SELECT 1 FROM staff_profiles staff
           WHERE staff.tenant_id = $1 AND staff.user_id::text = $7
             AND COALESCE(staff.status, 'active') = 'active'
         ) AS teacher_ok,
         EXISTS (
           SELECT 1
           FROM teacher_subject_assignments assignment
           LEFT JOIN academic_terms term
             ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
           LEFT JOIN academic_years year
             ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
           WHERE assignment.tenant_id = $1
             AND (assignment.academic_term_id IS NULL OR (year.name = $2 AND term.name = $3))
             AND assignment.class_section_id::text = $4
             AND assignment.subject_id::text = $6
             AND assignment.teacher_user_id::text = $7
             AND assignment.status = 'active'
             AND (assignment.stream_id IS NULL OR assignment.stream_id::text = $5::text)
             AND (assignment.effective_from IS NULL OR assignment.effective_from::date <= CURRENT_DATE)
             AND (assignment.effective_to IS NULL OR assignment.effective_to::date >= CURRENT_DATE)
         ) AS allocation_ok,
         ($8::text IS NULL OR EXISTS (
           SELECT 1 FROM timetable_resources resource
           WHERE resource.tenant_id = $1 AND resource.id::text = $8 AND resource.status = 'active'
         )) AS resource_ok,
         EXISTS (
           SELECT 1
           FROM timetable_period_definitions period
           JOIN timetable_configurations configuration
             ON configuration.tenant_id = period.tenant_id
            AND configuration.id = period.configuration_id
           WHERE period.tenant_id = $1 AND period.id::text = $9
             AND configuration.academic_year = $2 AND configuration.term_name = $3
             AND period.day_of_week = $10 AND period.is_teaching
             AND period.starts_at = $11::time
         ) AS period_ok,
         ($12::text IS NULL OR EXISTS (
           SELECT 1 FROM timetable_subject_requirements requirement
           WHERE requirement.tenant_id = $1 AND requirement.id::text = $12
             AND requirement.academic_year = $2 AND requirement.term_name = $3
             AND requirement.class_section_id = $4
             AND requirement.subject_id = $6
             AND (requirement.stream_id IS NULL OR requirement.stream_id = $5)
             AND requirement.status = 'active'
         )) AS requirement_ok`,
      input.tenant_id,
      input.academic_year,
      input.term_name,
      input.class_section_id,
      input.stream_id ?? null,
      input.subject_id,
      input.teacher_id,
      input.resource_id ?? null,
      input.period_id,
      input.day_of_week,
      input.starts_at,
      input.requirement_id ?? null,
    ))[0];

    const invalid = [
      ['class', references?.class_ok],
      ['stream', references?.stream_ok],
      ['subject', references?.subject_ok],
      ['teacher', references?.teacher_ok],
      ['teacher allocation', references?.allocation_ok],
      ['resource', references?.resource_ok],
      ['period', references?.period_ok],
      ['subject requirement', references?.requirement_ok],
    ].filter(([, valid]) => !valid).map(([label]) => label);
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid timetable setup: ${invalid.join(', ')}`);
    }
  }

  private async assertNoAtomicSlotOverlap(tx: any, input: {
    tenant_id: string;
    version_id: string;
    exclude_slot_id?: string;
    class_section_id: string;
    stream_id?: string | null;
    teacher_id: string;
    resource_id?: string | null;
    parallel_key?: string | null;
    day_of_week: number;
    starts_at: string;
    ends_at: string;
  }): Promise<void> {
    const conflicts = this.asRows<{
      teacher_clash: boolean;
      class_clash: boolean;
      stream_clash: boolean;
      resource_clash: boolean;
    }>(await tx.$queryRawUnsafe(
      `SELECT
         COALESCE(bool_or(existing.teacher_id = $7), FALSE) AS teacher_clash,
         COALESCE(bool_or(
           existing.class_section_id = $8
           AND NOT ($11::text IS NOT NULL AND existing.parallel_key = $11)
         ), FALSE) AS class_clash,
         COALESCE(bool_or(
           $9::text IS NOT NULL AND existing.stream_id = $9
           AND NOT ($11::text IS NOT NULL AND existing.parallel_key = $11)
         ), FALSE) AS stream_clash,
         COALESCE(bool_or(
           $10::text IS NOT NULL AND existing.resource_id::text = $10
           AND EXISTS (
             SELECT 1 FROM timetable_resources selected_resource
             WHERE selected_resource.tenant_id = existing.tenant_id
               AND selected_resource.id::text = $10
               AND selected_resource.status = 'active'
               AND selected_resource.is_exclusive
           )
         ), FALSE) AS resource_clash
       FROM timetable_slots existing
       WHERE existing.tenant_id = $1 AND existing.version_id = $2::uuid
         AND ($3::text IS NULL OR existing.id::text <> $3)
         AND existing.status <> 'cancelled' AND existing.day_of_week = $4
         AND existing.starts_at < $6::time AND existing.ends_at > $5::time`,
      input.tenant_id,
      input.version_id,
      input.exclude_slot_id ?? null,
      input.day_of_week,
      input.starts_at,
      input.ends_at,
      input.teacher_id,
      input.class_section_id,
      input.stream_id ?? null,
      input.resource_id ?? null,
      input.parallel_key ?? null,
    ))[0];
    const labels = [
      conflicts?.teacher_clash ? 'teacher' : null,
      conflicts?.class_clash ? 'class' : null,
      conflicts?.stream_clash ? 'stream' : null,
      conflicts?.resource_clash ? 'resource' : null,
    ].filter((label): label is string => Boolean(label));
    if (labels.length > 0) {
      throw new BadRequestException(`Cannot save this lesson because it creates a ${labels.join(', ')} clash`);
    }
  }

  async assertAcademicScope(tenantId: string, academicYear: string, termName: string): Promise<void> {
    const result = await this.query(
      `
        SELECT term.id
        FROM academic_terms term
        JOIN academic_years year
          ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
        WHERE term.tenant_id = $1 AND year.name = $2 AND term.name = $3
          AND COALESCE(year.status, 'active') = 'active'
          AND year.archived_at IS NULL
          AND COALESCE(term.status, 'active') = 'active'
          AND term.archived_at IS NULL
        LIMIT 1
      `,
      [tenantId, academicYear, termName],
    );
    if (!result.rows[0]) {
      throw new BadRequestException('The selected academic year and term are inactive or do not belong to this school');
    }
  }

  async getConfiguration(tenantId: string, academicYear: string, termName: string) {
    const configuration = await this.query<any>(
      `
        SELECT id::text, academic_year, term_name, row_version, period_types,
               to_char(school_starts_at, 'HH24:MI') AS school_starts_at,
               created_at::text, updated_at::text
        FROM timetable_configurations
        WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
        LIMIT 1
      `,
      [tenantId, academicYear, termName],
    );
    const record = configuration.rows[0];
    if (!record) return null;

    const [days, periods, commonBlocks] = await Promise.all([
      this.query<any>(
        `SELECT id::text, day_of_week, name, is_teaching_day, order_index
         FROM timetable_days
         WHERE tenant_id = $1 AND configuration_id = $2::uuid
         ORDER BY order_index, day_of_week`,
        [tenantId, record.id],
      ),
      this.query<any>(
        `SELECT id::text, day_of_week, name,
                to_char(starts_at, 'HH24:MI') AS starts_at,
                to_char(ends_at, 'HH24:MI') AS ends_at,
                period_type, is_teaching, order_index, metadata
         FROM timetable_period_definitions
         WHERE tenant_id = $1 AND configuration_id = $2::uuid
         ORDER BY day_of_week, order_index, starts_at`,
        [tenantId, record.id],
      ),
      this.query<any>(
        `SELECT id::text, name, activity_type, day_of_week, period_id::text,
                duration_periods, target_scope, target_ids, is_locked, metadata
         FROM timetable_common_blocks
         WHERE tenant_id = $1 AND configuration_id = $2::uuid
         ORDER BY day_of_week, created_at`,
        [tenantId, record.id],
      ),
    ]);

    return {
      ...record,
      days: days.rows.map((day) => ({
        ...day,
        periods: periods.rows.filter((period) => Number(period.day_of_week) === Number(day.day_of_week)),
      })),
      common_blocks: commonBlocks.rows,
    };
  }

  async saveConfiguration(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    expected_row_version?: number;
    school_starts_at?: string;
    period_types?: TimetablePeriodTypeDto[];
    days: any[];
    common_blocks?: any[];
    actor_user_id: string | null;
  }) {
    await this.assertAcademicScope(input.tenant_id, input.academic_year, input.term_name);
    const normalizedDays = input.days.map((day, dayIndex) => ({
      id: day.id || randomUUID(),
      day_of_week: Number(day.day_of_week),
      name: String(day.name || `Day ${day.day_of_week}`).trim(),
      is_teaching_day: day.is_teaching_day !== false,
      order_index: dayIndex,
      periods: (day.periods ?? []).map((period: any, periodIndex: number) => ({
        id: period.id || randomUUID(),
        day_of_week: Number(day.day_of_week),
        name: String(period.name || `Period ${periodIndex + 1}`).trim(),
        starts_at: String(period.starts_at || '').trim(),
        ends_at: String(period.ends_at || '').trim(),
        period_type: String(period.period_type || 'lesson').trim(),
        is_teaching: period.is_teaching !== false,
        order_index: periodIndex,
        metadata: period.metadata ?? {},
      })),
    }));
    const periodTypes = input.period_types ? validatePeriodTypes(input.period_types) : undefined;
    validateConfigurationDays(normalizedDays, periodTypes);
    const periodIds = new Set(normalizedDays.flatMap(
      (day: { periods: Array<{ id: string }> }) => day.periods.map((period) => period.id),
    ));
    for (const block of input.common_blocks ?? []) {
      if (!periodIds.has(String(block.period_id))) {
        throw new BadRequestException(`Common block "${block.name ?? 'Activity'}" must reference a configured period`);
      }
      if (!normalizedDays.some((day) => day.day_of_week === Number(block.day_of_week) && day.periods.some((period: any) => period.id === block.period_id))) {
        throw new BadRequestException('Common blocks must reference a period on the selected day');
      }
    }

    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      await tx.$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text || ':' || $3::text))`,
        input.tenant_id, input.academic_year, input.term_name,
      );
      const currentRows = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version, period_types FROM timetable_configurations
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 FOR UPDATE`,
        input.tenant_id, input.academic_year, input.term_name,
      ));
      const current = currentRows[0];
      if (!periodTypes && current?.period_types?.length) {
        validateConfigurationDays(normalizedDays, validatePeriodTypes(current.period_types));
      }
      if (current && input.expected_row_version != null && Number(current.row_version) !== input.expected_row_version) {
        throw new ConflictException('Timetable configuration changed since it was loaded; refresh and retry');
      }

      const configurationId = current?.id ?? randomUUID();
      if (current) {
        await tx.$executeRawUnsafe(
          `UPDATE timetable_configurations
           SET row_version = row_version + 1, updated_by_user_id = $3::uuid, updated_at = NOW(),
               school_starts_at = COALESCE($4::time, school_starts_at),
               period_types = COALESCE($5::jsonb, period_types)
           WHERE tenant_id = $1 AND id = $2::uuid`,
          input.tenant_id, configurationId, input.actor_user_id, input.school_starts_at ?? null,
          periodTypes ? JSON.stringify(periodTypes) : null,
        );
      } else {
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_configurations
             (id, tenant_id, academic_year, term_name, created_by_user_id, updated_by_user_id, school_starts_at, period_types)
           VALUES ($1::uuid, $2, $3, $4, $5::uuid, $5::uuid, $6::time, $7::jsonb)`,
          configurationId, input.tenant_id, input.academic_year, input.term_name, input.actor_user_id,
          input.school_starts_at ?? null, JSON.stringify(periodTypes ?? []),
        );
      }

      await tx.$executeRawUnsafe(
        'DELETE FROM timetable_common_blocks WHERE tenant_id = $1 AND configuration_id = $2::uuid',
        input.tenant_id, configurationId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM timetable_period_definitions WHERE tenant_id = $1 AND configuration_id = $2::uuid AND NOT (id = ANY($3::uuid[]))',
        input.tenant_id, configurationId, [...periodIds],
      );
      // Free the unique day/order positions before reordering retained occurrences.
      // Keeping their identities also keeps teacher availability rules intact.
      await tx.$executeRawUnsafe(
        'UPDATE timetable_period_definitions SET order_index = -order_index - 1 WHERE tenant_id = $1 AND configuration_id = $2::uuid',
        input.tenant_id, configurationId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM timetable_days WHERE tenant_id = $1 AND configuration_id = $2::uuid',
        input.tenant_id, configurationId,
      );

      for (const day of normalizedDays) {
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_days
             (id, tenant_id, configuration_id, day_of_week, name, is_teaching_day, order_index)
           VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7)`,
          day.id, input.tenant_id, configurationId, day.day_of_week, day.name,
          day.is_teaching_day, day.order_index,
        );
        for (const period of day.periods) {
          const saved = await tx.$executeRawUnsafe(
            `INSERT INTO timetable_period_definitions
               (id, tenant_id, configuration_id, day_of_week, name, starts_at, ends_at,
                period_type, is_teaching, order_index, metadata)
             VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6::time, $7::time, $8, $9, $10, $11::jsonb)
             ON CONFLICT (id) DO UPDATE SET
               day_of_week = EXCLUDED.day_of_week, name = EXCLUDED.name,
               starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
               period_type = EXCLUDED.period_type, is_teaching = EXCLUDED.is_teaching,
               order_index = EXCLUDED.order_index, metadata = EXCLUDED.metadata, updated_at = NOW()
             WHERE timetable_period_definitions.tenant_id = EXCLUDED.tenant_id
               AND timetable_period_definitions.configuration_id = EXCLUDED.configuration_id`,
            period.id, input.tenant_id, configurationId, day.day_of_week, period.name,
            period.starts_at, period.ends_at, period.period_type, period.is_teaching,
            period.order_index, JSON.stringify(period.metadata),
          );
          if (saved === 0) throw new BadRequestException('A period identifier does not belong to this timetable');
        }
      }

      for (const block of input.common_blocks ?? []) {
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_common_blocks
             (id, tenant_id, configuration_id, name, activity_type, day_of_week, period_id,
              duration_periods, target_scope, target_ids, is_locked, metadata, created_by_user_id)
           VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7::uuid, $8, $9, $10::jsonb, $11, $12::jsonb, $13::uuid)`,
          block.id || randomUUID(), input.tenant_id, configurationId,
          String(block.name || 'School activity').trim(), String(block.activity_type || 'activity'),
          Number(block.day_of_week), String(block.period_id), Number(block.duration_periods || 1),
          String(block.target_scope || 'school'), JSON.stringify(block.target_ids ?? []),
          block.is_locked !== false, JSON.stringify(block.metadata ?? {}), input.actor_user_id,
        );
      }

      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
           AND status = 'draft'`,
        input.tenant_id, input.academic_year, input.term_name,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, 'timetable.configuration.updated', $3::jsonb)`,
        input.tenant_id, input.actor_user_id,
        JSON.stringify({
          configuration_id: configurationId,
          academic_year: input.academic_year,
          term_name: input.term_name,
        }),
      );
    });

    return this.getConfiguration(input.tenant_id, input.academic_year, input.term_name);
  }

  async listRequirements(tenantId: string, academicYear: string, termName: string) {
    const result = await this.query<any>(
      `
        SELECT requirement.id::text, requirement.academic_year, requirement.term_name,
               requirement.class_section_id, class_section.name AS class_name,
               requirement.stream_id, stream.name AS stream_name,
               requirement.subject_id, subject.name AS subject_name,
               requirement.teacher_id,
               COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email) AS teacher_name,
               requirement.periods_per_week, requirement.duration_periods,
               requirement.resource_id::text, resource.name AS resource_name,
               requirement.parallel_key, requirement.preferred_days,
               requirement.preferred_start_period_ids, requirement.status,
               requirement.row_version, requirement.created_at::text, requirement.updated_at::text
        FROM timetable_subject_requirements requirement
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = requirement.tenant_id
         AND class_section.id::text = requirement.class_section_id
        LEFT JOIN class_streams stream
          ON stream.tenant_id = requirement.tenant_id
         AND stream.id::text = requirement.stream_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = requirement.tenant_id
         AND subject.id::text = requirement.subject_id
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = requirement.tenant_id
         AND staff.user_id::text = requirement.teacher_id
        LEFT JOIN timetable_resources resource
          ON resource.tenant_id = requirement.tenant_id
         AND resource.id = requirement.resource_id
        WHERE requirement.tenant_id = $1
          AND requirement.academic_year = $2 AND requirement.term_name = $3
          AND requirement.status <> 'archived'
        ORDER BY class_name, stream_name NULLS FIRST, subject_name, teacher_name
      `,
      [tenantId, academicYear, termName],
    );
    return result.rows;
  }

  async saveRequirements(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    requirements: any[];
    replace_existing?: boolean;
    actor_user_id: string | null;
  }) {
    await this.assertAcademicScope(input.tenant_id, input.academic_year, input.term_name);
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const retainedIds: string[] = [];
      for (const requirement of input.requirements) {
        const refs = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT
             EXISTS (
               SELECT 1
               FROM class_sections section
               JOIN academic_years year
                 ON year.tenant_id = section.tenant_id
                AND year.id::text = section.academic_year_id::text
               WHERE section.tenant_id = $1 AND section.id::text = $2
                 AND year.name = $7
                 AND COALESCE(section.is_active, TRUE) = TRUE
                 AND COALESCE(section.status, 'active') = 'active'
                 AND section.archived_at IS NULL
             ) AS class_ok,
             ($3::text IS NULL OR EXISTS (
               SELECT 1
               FROM class_streams stream
               JOIN class_sections section
                 ON section.tenant_id = stream.tenant_id
                AND section.id::text = stream.class_section_id::text
               JOIN academic_years year
                 ON year.tenant_id = section.tenant_id
                AND year.id::text = section.academic_year_id::text
               WHERE stream.tenant_id = $1 AND stream.id::text = $3
                 AND stream.class_section_id::text = $2
                 AND year.name = $7
                 AND COALESCE(stream.is_active, TRUE) = TRUE
                 AND COALESCE(stream.status, 'active') = 'active'
                 AND stream.archived_at IS NULL
                 AND COALESCE(section.is_active, TRUE) = TRUE
                 AND COALESCE(section.status, 'active') = 'active'
                 AND section.archived_at IS NULL
             )) AS stream_ok,
             EXISTS (SELECT 1 FROM subjects WHERE tenant_id = $1 AND id::text = $4) AS subject_ok,
             ($5::text IS NULL OR EXISTS (SELECT 1 FROM staff_profiles WHERE tenant_id = $1 AND user_id::text = $5 AND COALESCE(status, 'active') = 'active')) AS teacher_ok,
             ($6::text IS NULL OR EXISTS (SELECT 1 FROM timetable_resources WHERE tenant_id = $1 AND id::text = $6 AND status = 'active')) AS resource_ok`,
          input.tenant_id, String(requirement.class_section_id), requirement.stream_id ?? null,
          String(requirement.subject_id), requirement.teacher_id ?? null, requirement.resource_id ?? null,
          input.academic_year,
        ));
        const refsRow = refs[0] ?? {};
        if (!refsRow.class_ok || !refsRow.stream_ok || !refsRow.subject_ok || !refsRow.teacher_ok || !refsRow.resource_ok) {
          throw new BadRequestException('A timetable requirement references a class, stream, subject, teacher, or resource outside this school');
        }

        const existing = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT id::text, row_version FROM timetable_subject_requirements
           WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
             AND class_section_id = $4 AND subject_id = $5
             AND stream_id IS NOT DISTINCT FROM $6::text
             AND teacher_id IS NOT DISTINCT FROM $7::text
             AND parallel_key IS NOT DISTINCT FROM $8::text
           FOR UPDATE`,
          input.tenant_id, input.academic_year, input.term_name,
          String(requirement.class_section_id), String(requirement.subject_id),
          requirement.stream_id ?? null, requirement.teacher_id ?? null, requirement.parallel_key ?? null,
        ))[0];

        if (existing && requirement.expected_row_version != null
          && Number(existing.row_version) !== Number(requirement.expected_row_version)) {
          throw new ConflictException('A timetable requirement changed since it was loaded; refresh and retry');
        }
        const id = existing?.id ?? requirement.id ?? randomUUID();
        retainedIds.push(String(id));
        if (existing) {
          await tx.$executeRawUnsafe(
            `UPDATE timetable_subject_requirements
             SET periods_per_week = $3, duration_periods = $4, resource_id = $5::uuid,
                 preferred_days = $6::jsonb, preferred_start_period_ids = $7::jsonb,
                 status = 'active', row_version = row_version + 1,
                 updated_by_user_id = $8::uuid, updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2::uuid`,
            input.tenant_id, id, Number(requirement.periods_per_week),
            Number(requirement.duration_periods || 1), requirement.resource_id ?? null,
            JSON.stringify(requirement.preferred_days ?? []),
            JSON.stringify(requirement.preferred_start_period_ids ?? []), input.actor_user_id,
          );
        } else {
          await tx.$executeRawUnsafe(
            `INSERT INTO timetable_subject_requirements (
               id, tenant_id, academic_year, term_name, class_section_id, stream_id,
               subject_id, teacher_id, periods_per_week, duration_periods, resource_id,
               parallel_key, preferred_days, preferred_start_period_ids,
               created_by_user_id, updated_by_user_id
             ) VALUES (
               $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid,
               $12, $13::jsonb, $14::jsonb, $15::uuid, $15::uuid
             )`,
            id, input.tenant_id, input.academic_year, input.term_name,
            String(requirement.class_section_id), requirement.stream_id ?? null,
            String(requirement.subject_id), requirement.teacher_id ?? null,
            Number(requirement.periods_per_week), Number(requirement.duration_periods || 1),
            requirement.resource_id ?? null, requirement.parallel_key ?? null,
            JSON.stringify(requirement.preferred_days ?? []),
            JSON.stringify(requirement.preferred_start_period_ids ?? []), input.actor_user_id,
          );
        }
      }
      if (input.replace_existing) {
        await tx.$executeRawUnsafe(
          `UPDATE timetable_subject_requirements
           SET status = 'inactive', row_version = row_version + 1,
               updated_by_user_id = $5::uuid, updated_at = NOW()
           WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
             AND status = 'active' AND NOT (id = ANY($4::uuid[]))`,
          input.tenant_id,
          input.academic_year,
          input.term_name,
          retainedIds,
          input.actor_user_id,
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
           AND status = 'draft'`,
        input.tenant_id, input.academic_year, input.term_name,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, 'timetable.requirements.updated', $3::jsonb)`,
        input.tenant_id, input.actor_user_id,
        JSON.stringify({
          academic_year: input.academic_year,
          term_name: input.term_name,
          count: input.requirements.length,
          replace_existing: Boolean(input.replace_existing),
        }),
      );
    });
    return this.listRequirements(input.tenant_id, input.academic_year, input.term_name);
  }

  async listAvailability(tenantId: string, academicYear: string, termName: string, teacherId?: string) {
    const result = await this.query<any>(
      `SELECT availability.id::text, availability.teacher_id,
              COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email) AS teacher_name,
              availability.day_of_week, availability.period_id::text,
              period.name AS period_name, period.starts_at::text, period.ends_at::text,
              availability.state, availability.reason, availability.row_version
       FROM timetable_teacher_availability availability
       JOIN timetable_period_definitions period
         ON period.tenant_id = availability.tenant_id AND period.id = availability.period_id
       LEFT JOIN staff_profiles staff
         ON staff.tenant_id = availability.tenant_id AND staff.user_id::text = availability.teacher_id
       WHERE availability.tenant_id = $1
         AND availability.academic_year = $2 AND availability.term_name = $3
         AND ($4::text IS NULL OR availability.teacher_id = $4)
       ORDER BY teacher_name, availability.day_of_week, period.order_index`,
      [tenantId, academicYear, termName, teacherId ?? null],
    );
    return result.rows;
  }

  async saveAvailability(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    items: any[];
    replace_existing?: boolean;
    actor_user_id: string | null;
  }) {
    await this.assertAcademicScope(input.tenant_id, input.academic_year, input.term_name);
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const retainedIds: string[] = [];
      for (const item of input.items) {
        const refs = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT
             EXISTS (SELECT 1 FROM staff_profiles WHERE tenant_id = $1 AND user_id::text = $2 AND COALESCE(status, 'active') = 'active') AS teacher_ok,
             EXISTS (SELECT 1 FROM timetable_period_definitions period
                     JOIN timetable_configurations configuration
                       ON configuration.tenant_id = period.tenant_id AND configuration.id = period.configuration_id
                     WHERE period.tenant_id = $1 AND period.id::text = $3
                       AND period.day_of_week = $4 AND configuration.academic_year = $5 AND configuration.term_name = $6) AS period_ok`,
          input.tenant_id, String(item.teacher_id), String(item.period_id), Number(item.day_of_week),
          input.academic_year, input.term_name,
        ))[0];
        if (!refs?.teacher_ok || !refs?.period_ok) {
          throw new BadRequestException('Teacher availability references a teacher or period outside this school configuration');
        }
        const existing = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT id::text, row_version FROM timetable_teacher_availability
           WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
             AND teacher_id = $4 AND day_of_week = $5 AND period_id = $6::uuid
           FOR UPDATE`,
          input.tenant_id, input.academic_year, input.term_name, String(item.teacher_id),
          Number(item.day_of_week), String(item.period_id),
        ))[0];
        if (existing && item.expected_row_version != null
          && Number(existing.row_version) !== Number(item.expected_row_version)) {
          throw new ConflictException('Teacher availability changed since it was loaded; refresh and retry');
        }
        const availabilityId = existing?.id ?? item.id ?? randomUUID();
        retainedIds.push(String(availabilityId));
        if (existing) {
          await tx.$executeRawUnsafe(
            `UPDATE timetable_teacher_availability
             SET state = $3, reason = $4, row_version = row_version + 1,
                 updated_by_user_id = $5::uuid, updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2::uuid`,
            input.tenant_id, existing.id, String(item.state), item.reason ?? null, input.actor_user_id,
          );
        } else {
          await tx.$executeRawUnsafe(
            `INSERT INTO timetable_teacher_availability (
               id, tenant_id, academic_year, term_name, teacher_id, day_of_week,
               period_id, state, reason, created_by_user_id, updated_by_user_id
             ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8, $9, $10::uuid, $10::uuid)`,
            availabilityId, input.tenant_id, input.academic_year, input.term_name,
            String(item.teacher_id), Number(item.day_of_week), String(item.period_id),
            String(item.state), item.reason ?? null, input.actor_user_id,
          );
        }
      }
      if (input.replace_existing) {
        await tx.$executeRawUnsafe(
          `DELETE FROM timetable_teacher_availability
           WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
             AND NOT (id = ANY($4::uuid[]))`,
          input.tenant_id,
          input.academic_year,
          input.term_name,
          retainedIds,
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
           AND status = 'draft'`,
        input.tenant_id, input.academic_year, input.term_name,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, 'timetable.availability.updated', $3::jsonb)`,
        input.tenant_id, input.actor_user_id,
        JSON.stringify({
          academic_year: input.academic_year,
          term_name: input.term_name,
          count: input.items.length,
          replace_existing: Boolean(input.replace_existing),
        }),
      );
    });
    return this.listAvailability(input.tenant_id, input.academic_year, input.term_name);
  }

  async listResources(tenantId: string, status?: string) {
    const result = await this.query<any>(
      `SELECT id::text, name, resource_type, capacity, is_exclusive, status,
              source_kind, source_record_id, metadata, row_version,
              created_at::text, updated_at::text
       FROM timetable_resources
       WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY status, name`,
      [tenantId, status ?? null],
    );
    return result.rows;
  }

  async createResource(input: any) {
    let resource: any;
    try {
      await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
        resource = this.asRows<any>(await tx.$queryRawUnsafe(
          `INSERT INTO timetable_resources (
             tenant_id, name, resource_type, capacity, is_exclusive, status,
             source_kind, source_record_id, metadata, created_by_user_id, updated_by_user_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::uuid, $10::uuid)
           RETURNING id::text, name, resource_type, capacity, is_exclusive, status,
                     source_kind, source_record_id, metadata, row_version`,
          input.tenant_id, input.name, input.resource_type ?? 'room', input.capacity ?? null,
          input.is_exclusive !== false, input.status ?? 'active', input.source_kind ?? null,
          input.source_record_id ?? null, JSON.stringify(input.metadata ?? {}), input.actor_user_id,
        ))[0];
        await tx.$executeRawUnsafe(
          `UPDATE timetable_versions SET row_version = row_version + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND status = 'draft'`,
          input.tenant_id,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_audit_logs (tenant_id, actor_user_id, action, metadata)
           VALUES ($1, $2::uuid, 'timetable.resource.created', $3::jsonb)`,
          input.tenant_id,
          input.actor_user_id,
          JSON.stringify({ resource_id: resource.id, name: resource.name }),
        );
      });
    } catch (error) {
      if (this.isPostgresUniqueViolation(error)) {
        throw new ConflictException('A timetable resource with this name already exists in this school');
      }
      throw error;
    }
    return resource;
  }

  async updateResource(tenantId: string, resourceId: string, input: any, actorUserId: string | null) {
    let resource: any;
    try {
      await this.prisma.executeWithTenant(tenantId, actorUserId, async (tx: any) => {
        resource = this.asRows<any>(await tx.$queryRawUnsafe(
          `UPDATE timetable_resources
           SET name = COALESCE($3, name), resource_type = COALESCE($4, resource_type),
               capacity = COALESCE($5::integer, capacity),
               is_exclusive = COALESCE($6::boolean, is_exclusive), status = COALESCE($7, status),
               metadata = COALESCE($8::jsonb, metadata), row_version = row_version + 1,
               updated_by_user_id = $9::uuid, updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2::uuid
             AND ($10::integer IS NULL OR row_version = $10)
           RETURNING id::text, name, resource_type, capacity, is_exclusive, status,
                     source_kind, source_record_id, metadata, row_version`,
          tenantId, resourceId, input.name ?? null, input.resource_type ?? null,
          input.capacity ?? null, input.is_exclusive ?? null, input.status ?? null,
          input.metadata == null ? null : JSON.stringify(input.metadata), actorUserId,
          input.expected_row_version ?? null,
        ))[0];
        if (!resource) {
          const exists = this.asRows(await tx.$queryRawUnsafe(
            `SELECT 1 FROM timetable_resources WHERE tenant_id = $1 AND id = $2::uuid`,
            tenantId,
            resourceId,
          ));
          if (!exists[0]) throw new NotFoundException('Timetable resource was not found for this school');
          throw new ConflictException('Timetable resource changed since it was loaded; refresh and retry');
        }
        await tx.$executeRawUnsafe(
          `UPDATE timetable_versions SET row_version = row_version + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND status = 'draft'`,
          tenantId,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_audit_logs (tenant_id, actor_user_id, action, metadata)
           VALUES ($1, $2::uuid, 'timetable.resource.updated', $3::jsonb)`,
          tenantId,
          actorUserId,
          JSON.stringify({ resource_id: resource.id, row_version: resource.row_version }),
        );
      });
    } catch (error) {
      if (this.isPostgresUniqueViolation(error)) {
        throw new ConflictException('A timetable resource with this name already exists in this school');
      }
      throw error;
    }
    return resource;
  }

  async getReadinessSnapshot(tenantId: string, academicYear: string, termName: string) {
    const result = await this.query<any>(
      `SELECT
         EXISTS (
           SELECT 1 FROM academic_years year
           WHERE year.tenant_id = $1 AND year.name = $2
         ) AS academic_year,
         EXISTS (
           SELECT 1 FROM academic_terms term
           JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
           WHERE term.tenant_id = $1 AND year.name = $2 AND term.name = $3
         ) AS term,
         (SELECT COUNT(*)::int FROM timetable_days day
          JOIN timetable_configurations configuration ON configuration.tenant_id = day.tenant_id AND configuration.id = day.configuration_id
          WHERE day.tenant_id = $1 AND configuration.academic_year = $2 AND configuration.term_name = $3
            AND day.is_teaching_day) AS teaching_days,
         (SELECT COUNT(*)::int FROM timetable_period_definitions period
          JOIN timetable_configurations configuration ON configuration.tenant_id = period.tenant_id AND configuration.id = period.configuration_id
          WHERE period.tenant_id = $1 AND configuration.academic_year = $2 AND configuration.term_name = $3
            AND period.is_teaching) AS teaching_periods,
         (SELECT COUNT(*)::int FROM class_sections class_section
          JOIN academic_years year ON year.tenant_id = class_section.tenant_id AND year.id = class_section.academic_year_id
          WHERE class_section.tenant_id = $1 AND year.name = $2
            AND COALESCE(class_section.is_active, true)) AS classes,
         (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1 AND COALESCE(status, 'active') = 'active') AS subjects,
         (SELECT COUNT(DISTINCT assignment.teacher_user_id)::int
          FROM teacher_subject_assignments assignment
          LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
          LEFT JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
          WHERE assignment.tenant_id = $1
            AND (assignment.academic_term_id IS NULL OR (year.name = $2 AND term.name = $3))
            AND assignment.status = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)) AS active_teachers,
         (SELECT COUNT(*)::int FROM timetable_subject_requirements
          WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'active') AS requirements,
         (SELECT COALESCE(SUM(periods_per_week), 0)::int FROM timetable_subject_requirements
          WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'active') AS required_lessons,
         (SELECT COUNT(*)::int FROM timetable_subject_requirements requirement
          WHERE requirement.tenant_id = $1 AND requirement.academic_year = $2 AND requirement.term_name = $3
            AND requirement.status = 'active'
            AND (
              requirement.teacher_id IS NULL OR NOT EXISTS (
                SELECT 1 FROM teacher_subject_assignments assignment
                LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
                LEFT JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
                WHERE assignment.tenant_id = requirement.tenant_id
                  AND (assignment.academic_term_id IS NULL OR (year.name = requirement.academic_year AND term.name = requirement.term_name))
                  AND assignment.class_section_id::text = requirement.class_section_id
                  AND assignment.subject_id::text = requirement.subject_id
                  AND assignment.teacher_user_id::text = requirement.teacher_id
                  AND (assignment.stream_id IS NULL OR assignment.stream_id::text = requirement.stream_id)
                  AND assignment.status = 'active'
                  AND (assignment.effective_from IS NULL OR assignment.effective_from <= CURRENT_DATE)
                  AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
              )
            )) AS invalid_allocations`,
      [tenantId, academicYear, termName],
    );
    return result.rows[0] ?? {};
  }

  async getConstraintSnapshot(tenantId: string, academicYear: string, termName: string, versionId?: string) {
    const [configuration, requirements, availability, resources, assignments, slots] = await Promise.all([
      this.getConfiguration(tenantId, academicYear, termName),
      this.listRequirements(tenantId, academicYear, termName),
      this.listAvailability(tenantId, academicYear, termName),
      this.listResources(tenantId, 'active'),
      this.query<any>(
        `SELECT assignment.id::text, assignment.class_section_id::text, assignment.stream_id::text,
                assignment.subject_id::text, assignment.teacher_user_id::text AS teacher_id,
                assignment.department_id::text, assignment.status,
                assignment.effective_from::text, assignment.effective_to::text
         FROM teacher_subject_assignments assignment
         LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
         LEFT JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
         WHERE assignment.tenant_id = $1
           AND (assignment.academic_term_id IS NULL OR (year.name = $2 AND term.name = $3))
           AND assignment.status = 'active'
           AND (assignment.effective_from IS NULL OR assignment.effective_from <= CURRENT_DATE)
           AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)`,
        [tenantId, academicYear, termName],
      ),
      versionId
        ? this.query<any>(
          `SELECT id::text, version_id::text, requirement_id::text, class_section_id,
                  stream_id, subject_id, teacher_id, resource_id::text, room_id,
                  period_id::text, parallel_key, day_of_week, starts_at::text,
                  ends_at::text, duration_periods, locked, row_version,
                  source_kind, source_record_id, status
           FROM timetable_slots
           WHERE tenant_id = $1 AND version_id = $2::uuid AND status <> 'cancelled'
           ORDER BY day_of_week, starts_at, id`,
          [tenantId, versionId],
        )
        : Promise.resolve({ rows: [], rowCount: 0 } as QueryResult<any>),
    ]);
    return {
      configuration,
      requirements,
      availability,
      resources,
      assignments: assignments.rows,
      slots: slots.rows,
    };
  }

  async getVersion(tenantId: string, versionId: string) {
    const result = await this.query<any>(
      `SELECT id::text, academic_year, term_name, revision_number,
              source_version_id::text, status, immutable, row_version,
              notes, configuration_snapshot, generation_summary,
              published_by_user_id::text, published_at::text,
              created_by_user_id::text, created_at::text, updated_at::text
       FROM timetable_versions
       WHERE tenant_id = $1 AND id = $2::uuid
       LIMIT 1`,
      [tenantId, versionId],
    );
    return result.rows[0] ?? null;
  }

  async saveGenerationResult(input: {
    tenant_id: string;
    version_id: string;
    expected_row_version?: number;
    scope: TimetableScope;
    placements: GeneratedPlacement[];
    gaps: GeneratedGap[];
    required_lessons: number;
    warnings: any[];
    actor_user_id: string | null;
  }) {
    const runId = randomUUID();
    const scope = input.scope ?? { type: 'school' as const };
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const version = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, academic_year, term_name, status, row_version
         FROM timetable_versions WHERE tenant_id = $1 AND id = $2::uuid FOR UPDATE`,
        input.tenant_id, input.version_id,
      ))[0];
      if (!version) throw new NotFoundException('Draft timetable version was not found for this school');
      if (version.status !== 'draft') throw new BadRequestException('Published timetable versions cannot be regenerated');
      if (input.expected_row_version != null && Number(version.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The timetable draft changed since it was loaded; refresh and retry');
      }

      await tx.$executeRawUnsafe(
        `DELETE FROM timetable_slots
         WHERE tenant_id = $1 AND version_id = $2::uuid
           AND source_kind = 'generated' AND locked = FALSE AND status = 'draft'
           AND (
             $3 = 'school'
             OR ($3 = 'class' AND class_section_id = $4)
             OR ($3 = 'stream' AND stream_id = $4)
             OR ($3 = 'teacher' AND teacher_id = $4)
             OR ($3 = 'requirement' AND requirement_id::text = $4)
           )`,
        input.tenant_id, input.version_id, scope.type, scope.id ?? null,
      );

      await tx.$executeRawUnsafe(
        `DELETE FROM timetable_unscheduled_requirements unresolved
         USING timetable_subject_requirements requirement
         WHERE unresolved.tenant_id = $1 AND unresolved.version_id = $2::uuid
           AND requirement.tenant_id = unresolved.tenant_id AND requirement.id = unresolved.requirement_id
           AND (
             $3 = 'school'
             OR ($3 = 'class' AND requirement.class_section_id = $4)
             OR ($3 = 'stream' AND requirement.stream_id = $4)
             OR ($3 = 'teacher' AND requirement.teacher_id = $4)
             OR ($3 = 'requirement' AND requirement.id::text = $4)
           )`,
        input.tenant_id, input.version_id, scope.type, scope.id ?? null,
      );

      const status = input.gaps.length > 0 ? 'completed_with_gaps' : 'completed';
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_generation_runs (
           id, tenant_id, version_id, status, scope, required_lessons,
           scheduled_lessons, unscheduled_lessons, warnings,
           created_by_user_id, completed_at
         ) VALUES ($1::uuid, $2, $3::uuid, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10::uuid, NOW())`,
        runId, input.tenant_id, input.version_id, status, JSON.stringify(scope),
        input.required_lessons, input.placements.reduce((sum, item) => sum + Number(item.duration_periods), 0),
        input.gaps.reduce((sum, item) => sum + Number(item.remaining_periods), 0),
        JSON.stringify(input.warnings), input.actor_user_id,
      );

      if (input.placements.length > 0) {
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_slots (
             tenant_id, version_id, requirement_id, generation_run_id,
             academic_year, term_name, class_section_id, stream_id,
             subject_id, teacher_id, resource_id, period_id, parallel_key,
             day_of_week, starts_at, ends_at, duration_periods, locked,
             source_kind, status, created_by_user_id
           ) SELECT
             $1, version.id, placement.requirement_id::uuid, $3::uuid,
             version.academic_year, version.term_name,
             placement.class_section_id, placement.stream_id,
             placement.subject_id, placement.teacher_id,
             placement.resource_id::uuid, placement.period_id::uuid,
             placement.parallel_key, placement.day_of_week,
             placement.starts_at::time, placement.ends_at::time,
             placement.duration_periods, COALESCE(placement.locked, FALSE),
             'generated', 'draft', $5::uuid
           FROM timetable_versions version
           CROSS JOIN jsonb_to_recordset($4::jsonb) AS placement(
             requirement_id text,
             class_section_id text,
             stream_id text,
             subject_id text,
             teacher_id text,
             resource_id text,
             period_id text,
             parallel_key text,
             day_of_week integer,
             starts_at text,
             ends_at text,
             duration_periods integer,
             locked boolean
           )
           WHERE version.tenant_id = $1 AND version.id = $2::uuid AND version.status = 'draft'`,
          input.tenant_id,
          input.version_id,
          runId,
          JSON.stringify(input.placements.map((placement) => ({
            ...placement,
            stream_id: placement.stream_id ?? null,
            resource_id: placement.resource_id ?? null,
            parallel_key: placement.parallel_key ?? null,
            locked: Boolean(placement.locked),
          }))),
          input.actor_user_id,
        );
      }

      if (input.gaps.length > 0) {
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_unscheduled_requirements (
             tenant_id, version_id, generation_run_id, requirement_id,
             remaining_periods, duration_periods, reason_code, reason_message, metadata
           ) SELECT $1, $2::uuid, $3::uuid, gap.requirement_id::uuid,
                    gap.remaining_periods, gap.duration_periods,
                    gap.reason_code, gap.reason_message,
                    COALESCE(gap.metadata, '{}'::jsonb)
             FROM jsonb_to_recordset($4::jsonb) AS gap(
               requirement_id text,
               remaining_periods integer,
               duration_periods integer,
               reason_code text,
               reason_message text,
               metadata jsonb
             )
           ON CONFLICT (tenant_id, version_id, requirement_id)
           DO UPDATE SET generation_run_id = EXCLUDED.generation_run_id,
             remaining_periods = EXCLUDED.remaining_periods,
             duration_periods = EXCLUDED.duration_periods,
             reason_code = EXCLUDED.reason_code,
             reason_message = EXCLUDED.reason_message,
             status = 'open', metadata = EXCLUDED.metadata,
             row_version = timetable_unscheduled_requirements.row_version + 1,
             updated_at = NOW()`,
          input.tenant_id,
          input.version_id,
          runId,
          JSON.stringify(input.gaps.map((gap) => ({ ...gap, metadata: gap.metadata ?? {} }))),
        );
      }

      const summary = {
        run_id: runId,
        required_lessons: input.required_lessons,
        scheduled_lessons: input.placements.reduce((sum, item) => sum + Number(item.duration_periods), 0),
        unscheduled_lessons: input.gaps.reduce((sum, item) => sum + Number(item.remaining_periods), 0),
        warnings: input.warnings,
        scope,
      };
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET generation_summary = $3::jsonb, row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid`,
        input.tenant_id, input.version_id, JSON.stringify(summary),
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5::jsonb)`,
        input.tenant_id, input.version_id, input.actor_user_id,
        input.gaps.length > 0 ? 'timetable.generation.partial' : 'timetable.generation.completed',
        JSON.stringify(summary),
      );
    });

    const [run, version] = await Promise.all([
      this.query<any>(
        `SELECT id::text, version_id::text, status, scope, required_lessons,
                scheduled_lessons, unscheduled_lessons, warnings,
                started_at::text, completed_at::text
         FROM timetable_generation_runs WHERE tenant_id = $1 AND id = $2::uuid`,
        [input.tenant_id, runId],
      ),
      this.getVersion(input.tenant_id, input.version_id),
    ]);
    return { run: run.rows[0], version };
  }

  async listUnscheduled(tenantId: string, academicYear: string, termName: string, versionId?: string) {
    const result = await this.query<any>(
      `SELECT unresolved.id::text, unresolved.version_id::text,
              unresolved.generation_run_id::text, unresolved.requirement_id::text,
              requirement.class_section_id, class_section.name AS class_name,
              requirement.stream_id, stream.name AS stream_name,
              requirement.subject_id, subject.name AS subject_name,
              requirement.teacher_id,
              COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email) AS teacher_name,
              unresolved.remaining_periods, unresolved.duration_periods,
              requirement.resource_id::text, resource.name AS resource_name,
              requirement.parallel_key, unresolved.reason_code, unresolved.reason_message,
              unresolved.status, unresolved.row_version, unresolved.metadata,
              unresolved.created_at::text, unresolved.updated_at::text
       FROM timetable_unscheduled_requirements unresolved
       JOIN timetable_versions version
         ON version.tenant_id = unresolved.tenant_id AND version.id = unresolved.version_id
       JOIN timetable_subject_requirements requirement
         ON requirement.tenant_id = unresolved.tenant_id AND requirement.id = unresolved.requirement_id
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = requirement.tenant_id AND class_section.id::text = requirement.class_section_id
       LEFT JOIN class_streams stream
         ON stream.tenant_id = requirement.tenant_id AND stream.id::text = requirement.stream_id
       LEFT JOIN subjects subject
         ON subject.tenant_id = requirement.tenant_id AND subject.id::text = requirement.subject_id
       LEFT JOIN staff_profiles staff
         ON staff.tenant_id = requirement.tenant_id AND staff.user_id::text = requirement.teacher_id
       LEFT JOIN timetable_resources resource
         ON resource.tenant_id = requirement.tenant_id AND resource.id = requirement.resource_id
       WHERE unresolved.tenant_id = $1
         AND version.academic_year = $2 AND version.term_name = $3
         AND ($4::text IS NULL OR version.id::text = $4)
         AND unresolved.status IN ('open', 'partially_placed')
       ORDER BY class_name, subject_name, unresolved.created_at`,
      [tenantId, academicYear, termName, versionId ?? null],
    );
    return result.rows;
  }

  async countOpenUnscheduled(tenantId: string, versionId: string): Promise<number> {
    const result = await this.query<any>(
      `SELECT COALESCE(SUM(remaining_periods), 0)::int AS count
       FROM timetable_unscheduled_requirements
       WHERE tenant_id = $1 AND version_id = $2::uuid
         AND status IN ('open', 'partially_placed')`,
      [tenantId, versionId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async getUnscheduled(tenantId: string, unresolvedId: string) {
    const result = await this.query<any>(
      `SELECT unresolved.id::text, unresolved.version_id::text,
              unresolved.requirement_id::text, unresolved.remaining_periods,
              unresolved.duration_periods, unresolved.status, unresolved.row_version,
              requirement.class_section_id, requirement.stream_id,
              requirement.subject_id, requirement.teacher_id,
              requirement.resource_id::text, requirement.parallel_key,
              version.academic_year, version.term_name
       FROM timetable_unscheduled_requirements unresolved
       JOIN timetable_subject_requirements requirement
         ON requirement.tenant_id = unresolved.tenant_id AND requirement.id = unresolved.requirement_id
       JOIN timetable_versions version
         ON version.tenant_id = unresolved.tenant_id AND version.id = unresolved.version_id
       WHERE unresolved.tenant_id = $1 AND unresolved.id = $2::uuid
         AND unresolved.status IN ('open', 'partially_placed')
       LIMIT 1`,
      [tenantId, unresolvedId],
    );
    return result.rows[0] ?? null;
  }

  async placeUnscheduled(input: {
    tenant_id: string;
    unresolved_id: string;
    expected_row_version?: number;
    placement: GeneratedPlacement;
    actor_user_id: string | null;
  }) {
    let result: any;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const identity = this.asRows<{ version_id: string }>(await tx.$queryRawUnsafe(
        `SELECT version_id::text
         FROM timetable_unscheduled_requirements
         WHERE tenant_id = $1 AND id = $2::uuid
         LIMIT 1`,
        input.tenant_id,
        input.unresolved_id,
      ))[0];
      if (!identity?.version_id) throw new NotFoundException('Unscheduled lesson was not found for this school');
      await this.acquireTimetableVersionLock(tx, input.tenant_id, identity.version_id);
      const unresolved = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT unresolved.*, version.academic_year, version.term_name, version.status AS version_status
         FROM timetable_unscheduled_requirements unresolved
         JOIN timetable_versions version ON version.tenant_id = unresolved.tenant_id AND version.id = unresolved.version_id
         WHERE unresolved.tenant_id = $1 AND unresolved.id = $2::uuid
         FOR UPDATE OF unresolved, version`,
        input.tenant_id, input.unresolved_id,
      ))[0];
      if (!unresolved) throw new NotFoundException('Unscheduled lesson was not found for this school');
      if (unresolved.version_status !== 'draft') throw new BadRequestException('Only a draft timetable can accept an unscheduled lesson');
      if (input.expected_row_version != null && Number(unresolved.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The unscheduled lesson changed since it was loaded; refresh and retry');
      }
      const placedPeriods = Math.min(Number(unresolved.remaining_periods), Number(input.placement.duration_periods));
      if (String(input.placement.requirement_id) !== String(unresolved.requirement_id)) {
        throw new BadRequestException('The unscheduled lesson does not match its subject requirement');
      }
      const atomicPlacement = {
        ...input.placement,
        tenant_id: input.tenant_id,
        version_id: String(unresolved.version_id),
        academic_year: String(unresolved.academic_year),
        term_name: String(unresolved.term_name),
        duration_periods: placedPeriods,
      };
      this.assertAtomicSlotTime(atomicPlacement);
      await this.assertAtomicSlotReferences(tx, atomicPlacement);
      await this.assertNoAtomicSlotOverlap(tx, atomicPlacement);
      const slot = this.asRows<any>(await tx.$queryRawUnsafe(
        `INSERT INTO timetable_slots (
           tenant_id, version_id, requirement_id, academic_year, term_name,
           class_section_id, stream_id, subject_id, teacher_id, resource_id,
           period_id, parallel_key, day_of_week, starts_at, ends_at,
           duration_periods, source_kind, status, created_by_user_id
         ) VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10::uuid,
                   $11::uuid, $12, $13, $14::time, $15::time, $16, 'manual', 'draft', $17::uuid)
         RETURNING id::text, row_version`,
        input.tenant_id, unresolved.version_id, input.placement.requirement_id,
        unresolved.academic_year, unresolved.term_name, input.placement.class_section_id,
        input.placement.stream_id ?? null, input.placement.subject_id, input.placement.teacher_id,
        input.placement.resource_id ?? null, input.placement.period_id,
        input.placement.parallel_key ?? null, input.placement.day_of_week,
        input.placement.starts_at, input.placement.ends_at, placedPeriods, input.actor_user_id,
      ))[0];
      const remaining = Number(unresolved.remaining_periods) - placedPeriods;
      const updated = this.asRows<any>(await tx.$queryRawUnsafe(
        `UPDATE timetable_unscheduled_requirements
         SET remaining_periods = $3,
             status = CASE WHEN $3 = 0 THEN 'placed' ELSE 'partially_placed' END,
             row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid
         RETURNING id::text, remaining_periods, status, row_version`,
        input.tenant_id, input.unresolved_id, remaining,
      ))[0];
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid`,
        input.tenant_id, unresolved.version_id,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'timetable.unscheduled.placed', $5::jsonb)`,
        input.tenant_id, unresolved.version_id, slot.id, input.actor_user_id,
        JSON.stringify({ unresolved_id: input.unresolved_id, remaining_periods: remaining }),
      );
      result = { slot, unscheduled: updated };
    });
    return result;
  }

  async createSlotAtomic(input: CreateTimetableSlotAtomicInput) {
    this.assertAtomicSlotTime(input);
    let createdSlot: any = null;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      await this.acquireTimetableVersionLock(tx, input.tenant_id, input.version_id);
      const version = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, academic_year, term_name, status, row_version
         FROM timetable_versions
         WHERE tenant_id = $1 AND id::text = $2
         FOR UPDATE`,
        input.tenant_id,
        input.version_id,
      ))[0];
      if (!version) throw new NotFoundException('Draft timetable version was not found for this school');
      if (version.status !== 'draft') {
        throw new BadRequestException('Published timetable versions cannot accept new lessons; create a revision first');
      }
      if (input.expected_version_row_version != null
        && Number(version.row_version) !== Number(input.expected_version_row_version)) {
        throw new ConflictException('The timetable draft changed since it was loaded; refresh and retry');
      }

      const placement = {
        ...input,
        version_id: String(version.id),
        academic_year: String(version.academic_year),
        term_name: String(version.term_name),
        duration_periods: Number(input.duration_periods ?? 1),
      };
      await this.assertAtomicSlotReferences(tx, placement);
      await this.assertNoAtomicSlotOverlap(tx, placement);

      createdSlot = this.asRows<any>(await tx.$queryRawUnsafe(
        `INSERT INTO timetable_slots (
           tenant_id, version_id, requirement_id, academic_year, term_name,
           class_section_id, stream_id, subject_id, teacher_id, room_id,
           resource_id, period_id, parallel_key, day_of_week, starts_at, ends_at,
           duration_periods, locked, locked_by_user_id, locked_at,
           source_kind, status, created_by_user_id
         ) VALUES (
           $1, $2::uuid, $3::uuid, $4, $5,
           $6, $7, $8, $9, $10,
           $11::uuid, $12::uuid, $13, $14, $15::time, $16::time,
           $17, $18, CASE WHEN $18 THEN $19::uuid ELSE NULL END,
           CASE WHEN $18 THEN NOW() ELSE NULL END,
           'manual', 'draft', $19::uuid
         )
         RETURNING id::text, version_id::text, requirement_id::text,
                   academic_year, term_name, class_section_id, stream_id,
                   subject_id, teacher_id, room_id, resource_id::text,
                   period_id::text, parallel_key, day_of_week,
                   starts_at::text, ends_at::text, duration_periods,
                   locked, row_version, source_kind, status,
                   created_by_user_id::text, created_at::text, updated_at::text`,
        input.tenant_id,
        String(version.id),
        input.requirement_id ?? null,
        String(version.academic_year),
        String(version.term_name),
        input.class_section_id,
        input.stream_id ?? null,
        input.subject_id,
        input.teacher_id,
        input.room_id ?? null,
        input.resource_id ?? null,
        input.period_id,
        input.parallel_key ?? null,
        input.day_of_week,
        input.starts_at,
        input.ends_at,
        Number(input.duration_periods ?? 1),
        Boolean(input.locked),
        input.actor_user_id,
      ))[0];
      if (!createdSlot) throw new ConflictException('The timetable lesson could not be created');

      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id::text = $2`,
        input.tenant_id,
        String(version.id),
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs
           (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'timetable.slot.created', $5::jsonb)`,
        input.tenant_id,
        String(version.id),
        String(createdSlot.id),
        input.actor_user_id,
        JSON.stringify({
          class_section_id: input.class_section_id,
          stream_id: input.stream_id ?? null,
          subject_id: input.subject_id,
          teacher_id: input.teacher_id,
          resource_id: input.resource_id ?? null,
          day_of_week: input.day_of_week,
          period_id: input.period_id,
        }),
      );
    });
    return createdSlot;
  }

  async updateSlotAtomic(input: UpdateTimetableSlotAtomicInput) {
    let updatedSlot: any = null;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const identity = this.asRows<{ version_id: string }>(await tx.$queryRawUnsafe(
        `SELECT version_id::text
         FROM timetable_slots
         WHERE tenant_id = $1 AND id::text = $2
         LIMIT 1`,
        input.tenant_id,
        input.slot_id,
      ))[0];
      if (!identity?.version_id) throw new NotFoundException('Timetable lesson was not found for this school');

      await this.acquireTimetableVersionLock(tx, input.tenant_id, identity.version_id);
      const current = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT slot.id::text, slot.version_id::text, slot.requirement_id::text,
                slot.class_section_id, slot.stream_id, slot.subject_id, slot.teacher_id,
                slot.room_id, slot.resource_id::text, slot.period_id::text,
                slot.parallel_key, slot.day_of_week, slot.starts_at::text,
                slot.ends_at::text, slot.duration_periods, slot.locked,
                slot.row_version, slot.status,
                version.academic_year, version.term_name,
                version.status AS version_status, version.row_version AS version_row_version
         FROM timetable_slots slot
         JOIN timetable_versions version
           ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id
         WHERE slot.tenant_id = $1 AND slot.id::text = $2
         FOR UPDATE OF slot, version`,
        input.tenant_id,
        input.slot_id,
      ))[0];
      if (!current) throw new NotFoundException('Timetable lesson was not found for this school');
      if (current.version_status !== 'draft' || current.status !== 'draft') {
        throw new BadRequestException('Published timetable lessons cannot be edited; create a revision first');
      }
      if (current.locked) throw new BadRequestException('Unlock this lesson before editing it');
      if (Number(current.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The timetable lesson changed since it was loaded; refresh and retry');
      }
      if (input.expected_version_row_version != null
        && Number(current.version_row_version) !== Number(input.expected_version_row_version)) {
        throw new ConflictException('The timetable draft changed since it was loaded; refresh and retry');
      }

      const placement = {
        tenant_id: input.tenant_id,
        version_id: String(current.version_id),
        academic_year: String(current.academic_year),
        term_name: String(current.term_name),
        requirement_id: input.requirement_id === undefined ? current.requirement_id : input.requirement_id,
        class_section_id: input.class_section_id ?? String(current.class_section_id),
        stream_id: input.stream_id === undefined ? current.stream_id : input.stream_id,
        subject_id: input.subject_id ?? String(current.subject_id),
        teacher_id: input.teacher_id ?? String(current.teacher_id),
        room_id: input.room_id === undefined ? current.room_id : input.room_id,
        resource_id: input.resource_id === undefined ? current.resource_id : input.resource_id,
        period_id: input.period_id ?? String(current.period_id ?? ''),
        parallel_key: input.parallel_key === undefined ? current.parallel_key : input.parallel_key,
        day_of_week: input.day_of_week ?? Number(current.day_of_week),
        starts_at: input.starts_at ?? String(current.starts_at),
        ends_at: input.ends_at ?? String(current.ends_at),
        duration_periods: input.duration_periods ?? Number(current.duration_periods ?? 1),
      };
      this.assertAtomicSlotTime(placement);
      await this.assertAtomicSlotReferences(tx, placement);
      await this.assertNoAtomicSlotOverlap(tx, {
        ...placement,
        exclude_slot_id: input.slot_id,
      });

      updatedSlot = this.asRows<any>(await tx.$queryRawUnsafe(
        `UPDATE timetable_slots
         SET requirement_id = $3::uuid, class_section_id = $4, stream_id = $5,
             subject_id = $6, teacher_id = $7, room_id = $8,
             resource_id = $9::uuid, period_id = $10::uuid, parallel_key = $11,
             day_of_week = $12, starts_at = $13::time, ends_at = $14::time,
             duration_periods = $15, row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id::text = $2
           AND row_version = $16 AND status = 'draft' AND locked = FALSE
         RETURNING id::text, version_id::text, requirement_id::text,
                   academic_year, term_name, class_section_id, stream_id,
                   subject_id, teacher_id, room_id, resource_id::text,
                   period_id::text, parallel_key, day_of_week,
                   starts_at::text, ends_at::text, duration_periods,
                   locked, row_version, source_kind, status,
                   created_by_user_id::text, created_at::text, updated_at::text`,
        input.tenant_id,
        input.slot_id,
        placement.requirement_id ?? null,
        placement.class_section_id,
        placement.stream_id ?? null,
        placement.subject_id,
        placement.teacher_id,
        placement.room_id ?? null,
        placement.resource_id ?? null,
        placement.period_id,
        placement.parallel_key ?? null,
        placement.day_of_week,
        placement.starts_at,
        placement.ends_at,
        placement.duration_periods,
        input.expected_row_version,
      ))[0];
      if (!updatedSlot) {
        throw new ConflictException('The timetable lesson changed while it was being saved; refresh and retry');
      }

      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id::text = $2`,
        input.tenant_id,
        String(current.version_id),
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs
           (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'timetable.slot.updated', $5::jsonb)`,
        input.tenant_id,
        String(current.version_id),
        input.slot_id,
        input.actor_user_id,
        JSON.stringify({
          previous_row_version: Number(current.row_version),
          row_version: Number(updatedSlot.row_version),
          class_section_id: placement.class_section_id,
          stream_id: placement.stream_id ?? null,
          subject_id: placement.subject_id,
          teacher_id: placement.teacher_id,
          resource_id: placement.resource_id ?? null,
          day_of_week: placement.day_of_week,
          period_id: placement.period_id,
        }),
      );
    });
    return updatedSlot;
  }

  async cancelSlotAtomic(input: CancelTimetableSlotAtomicInput) {
    let cancelledSlot: any = null;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const identity = this.asRows<{ version_id: string }>(await tx.$queryRawUnsafe(
        `SELECT version_id::text
         FROM timetable_slots
         WHERE tenant_id = $1 AND id::text = $2
         LIMIT 1`,
        input.tenant_id,
        input.slot_id,
      ))[0];
      if (!identity?.version_id) throw new NotFoundException('Timetable lesson was not found for this school');

      await this.acquireTimetableVersionLock(tx, input.tenant_id, identity.version_id);
      const current = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT slot.id::text, slot.version_id::text, slot.row_version,
                slot.status, version.status AS version_status
         FROM timetable_slots slot
         JOIN timetable_versions version
           ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id
         WHERE slot.tenant_id = $1 AND slot.id::text = $2
         FOR UPDATE OF slot, version`,
        input.tenant_id,
        input.slot_id,
      ))[0];
      if (!current) throw new NotFoundException('Timetable lesson was not found for this school');
      if (current.version_status !== 'draft' || current.status !== 'draft') {
        throw new ConflictException('Only a current draft timetable lesson can be cancelled');
      }
      if (Number(current.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The timetable lesson changed since it was loaded; refresh and retry');
      }

      cancelledSlot = this.asRows<any>(await tx.$queryRawUnsafe(
        `UPDATE timetable_slots
         SET status = 'cancelled', row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id::text = $2
           AND row_version = $3 AND status = 'draft'
         RETURNING id::text, version_id::text, status, row_version, updated_at::text`,
        input.tenant_id,
        input.slot_id,
        input.expected_row_version,
      ))[0];
      if (!cancelledSlot) {
        throw new ConflictException('The timetable lesson changed while it was being cancelled; refresh and retry');
      }

      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id::text = $2`,
        input.tenant_id,
        String(current.version_id),
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs
           (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'timetable.slot.cancelled', $5::jsonb)`,
        input.tenant_id,
        String(current.version_id),
        input.slot_id,
        input.actor_user_id,
        JSON.stringify({
          previous_row_version: Number(current.row_version),
          row_version: Number(cancelledSlot.row_version),
          reason: input.reason?.trim() || null,
        }),
      );
    });
    return cancelledSlot;
  }

  async getSlotForEdit(tenantId: string, slotId: string) {
    const result = await this.query<any>(
      `SELECT slot.id::text, slot.version_id::text, slot.requirement_id::text,
              slot.academic_year, slot.term_name, slot.class_section_id, slot.stream_id,
              slot.subject_id, slot.teacher_id, slot.resource_id::text, slot.room_id,
              slot.period_id::text, slot.parallel_key, slot.day_of_week,
              slot.starts_at::text, slot.ends_at::text, slot.duration_periods,
              slot.locked, slot.row_version, slot.status, version.status AS version_status,
              version.row_version AS version_row_version
       FROM timetable_slots slot
       JOIN timetable_versions version
         ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id
       WHERE slot.tenant_id = $1 AND slot.id = $2::uuid AND slot.status <> 'cancelled'
       LIMIT 1`,
      [tenantId, slotId],
    );
    return result.rows[0] ?? null;
  }

  async moveSlot(input: {
    tenant_id: string;
    slot_id: string;
    expected_row_version: number;
    day_of_week: number;
    period_id: string;
    starts_at: string;
    ends_at: string;
    actor_user_id: string | null;
  }) {
    const result = await this.query<any>(
      `WITH updated AS (
         UPDATE timetable_slots slot
         SET day_of_week = $4, period_id = $5::uuid,
             starts_at = $6::time, ends_at = $7::time,
             row_version = row_version + 1, updated_at = NOW()
         FROM timetable_versions version
         WHERE slot.tenant_id = $1 AND slot.id = $2::uuid
           AND slot.row_version = $3 AND slot.version_id = version.id
           AND version.tenant_id = slot.tenant_id AND version.status = 'draft'
           AND slot.status = 'draft' AND slot.locked = FALSE
         RETURNING slot.*
       ), audited AS (
         INSERT INTO timetable_audit_logs (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         SELECT $1, updated.version_id, updated.id, $8::uuid, 'timetable.slot.moved',
                jsonb_build_object('day_of_week', $4, 'period_id', $5)
         FROM updated
       )
       SELECT id::text, version_id::text, class_section_id, stream_id, subject_id,
              teacher_id, resource_id::text, period_id::text, parallel_key,
              day_of_week, starts_at::text, ends_at::text, duration_periods,
              locked, row_version, status FROM updated`,
      [input.tenant_id, input.slot_id, input.expected_row_version, input.day_of_week,
        input.period_id, input.starts_at, input.ends_at, input.actor_user_id],
    );
    if (!result.rows[0]) {
      const slot = await this.getSlotForEdit(input.tenant_id, input.slot_id);
      if (!slot) throw new NotFoundException('Draft timetable slot was not found for this school');
      if (slot.locked) throw new BadRequestException('Unlock this lesson before moving it');
      throw new ConflictException('The lesson changed since it was loaded; refresh and retry');
    }
    return result.rows[0];
  }

  async setSlotLock(input: {
    tenant_id: string;
    slot_id: string;
    expected_row_version: number;
    locked: boolean;
    actor_user_id: string | null;
  }) {
    const result = await this.query<any>(
      `WITH updated AS (
         UPDATE timetable_slots slot
         SET locked = $4, locked_by_user_id = CASE WHEN $4 THEN $5::uuid ELSE NULL END,
             locked_at = CASE WHEN $4 THEN NOW() ELSE NULL END,
             row_version = row_version + 1, updated_at = NOW()
         FROM timetable_versions version
         WHERE slot.tenant_id = $1 AND slot.id = $2::uuid AND slot.row_version = $3
           AND slot.version_id = version.id AND version.tenant_id = slot.tenant_id
           AND version.status = 'draft' AND slot.status = 'draft'
         RETURNING slot.*
       ), audited AS (
         INSERT INTO timetable_audit_logs (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         SELECT $1, updated.version_id, updated.id, $5::uuid,
                CASE WHEN $4 THEN 'timetable.slot.locked' ELSE 'timetable.slot.unlocked' END,
                jsonb_build_object('locked', $4)
         FROM updated
       )
       SELECT id::text, version_id::text, locked, locked_by_user_id::text,
              locked_at::text, row_version FROM updated`,
      [input.tenant_id, input.slot_id, input.expected_row_version, input.locked, input.actor_user_id],
    );
    if (!result.rows[0]) {
      const slot = await this.getSlotForEdit(input.tenant_id, input.slot_id);
      if (!slot) throw new NotFoundException('Draft timetable slot was not found for this school');
      throw new ConflictException('The lesson changed since it was loaded; refresh and retry');
    }
    return result.rows[0];
  }

  async listVersionHistory(tenantId: string, academicYear: string, termName: string) {
    const result = await this.query<any>(
      `SELECT version.id::text, version.revision_number, version.status,
              version.source_version_id::text, version.immutable, version.notes,
              version.published_at::text, version.published_by_user_id::text,
              version.created_at::text, version.updated_at::text, version.row_version,
              COUNT(slot.id)::int AS slot_count
       FROM timetable_versions version
       LEFT JOIN timetable_slots slot
         ON slot.tenant_id = version.tenant_id AND slot.version_id = version.id
        AND slot.status <> 'cancelled'
       WHERE version.tenant_id = $1 AND version.academic_year = $2 AND version.term_name = $3
       GROUP BY version.id
       ORDER BY version.revision_number DESC, version.created_at DESC`,
      [tenantId, academicYear, termName],
    );
    return {
      items: result.rows,
      active_published_id: result.rows.find((item) => item.status === 'published')?.id ?? null,
      draft_id: result.rows.find((item) => item.status === 'draft')?.id ?? null,
    };
  }

  async resolveManagedClassSectionIds(input: ManagedClassSectionScopeInput): Promise<string[]> {
    const role = input.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!['class_teacher', 'grade_master', 'form_master', 'grade_form_master'].includes(role)) {
      return [];
    }

    const result = await this.query<{ class_section_id: string }>(
      `WITH requested_year AS (
         SELECT year.id::text AS id
         FROM academic_years year
         WHERE year.tenant_id = $1 AND year.name = $4
         LIMIT 1
       ), managed_classes AS (
         SELECT class_teacher.class_section_id::text AS class_section_id
         FROM academics_class_teachers class_teacher
         JOIN requested_year year
           ON class_teacher.academic_year_id::text = year.id
         JOIN class_sections section
           ON section.tenant_id = class_teacher.tenant_id
          AND section.id::text = class_teacher.class_section_id::text
          AND section.academic_year_id::text = year.id
         WHERE class_teacher.tenant_id = $1
           AND class_teacher.teacher_user_id::text = $2
           AND $3 = 'class_teacher'
           AND class_teacher.is_active = TRUE
           AND class_teacher.status = 'active'
           AND (class_teacher.effective_from IS NULL OR class_teacher.effective_from::date <= CURRENT_DATE)
           AND (class_teacher.effective_to IS NULL OR class_teacher.effective_to::date >= CURRENT_DATE)

         UNION

         SELECT section.id::text AS class_section_id
         FROM academics_role_appointments appointment
         JOIN requested_year year
           ON appointment.academic_year_id IS NULL
           OR appointment.academic_year_id::text = year.id
         JOIN class_sections section
           ON section.tenant_id = appointment.tenant_id
          AND section.academic_year_id::text = year.id
         WHERE appointment.tenant_id = $1
           AND appointment.teacher_user_id::text = $2
           AND appointment.status = 'active'
           AND (appointment.effective_from IS NULL OR appointment.effective_from::date <= CURRENT_DATE)
           AND (appointment.effective_to IS NULL OR appointment.effective_to::date >= CURRENT_DATE)
           AND (
             ($3 = 'grade_master' AND appointment.role_type = 'grade_master')
             OR ($3 = 'form_master' AND appointment.role_type = 'form_master')
             OR ($3 = 'grade_form_master' AND appointment.role_type IN ('grade_master', 'form_master'))
           )
           AND (
             appointment.class_section_id IS NULL
             OR appointment.class_section_id::text = section.id::text
           )
           AND (
             appointment.stream_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM class_streams stream
               WHERE stream.tenant_id = appointment.tenant_id
                 AND stream.id::text = appointment.stream_id::text
                 AND stream.class_section_id::text = section.id::text
             )
           )
       )
       SELECT DISTINCT class_section_id
       FROM managed_classes
       WHERE NULLIF(btrim(class_section_id), '') IS NOT NULL
       ORDER BY class_section_id`,
      [input.tenant_id, input.user_id, role, input.academic_year],
    );
    return result.rows.map((row) => row.class_section_id);
  }

  async resolveHodDepartmentId(input: HodDepartmentScopeInput): Promise<string | null> {
    const result = await this.query<{ department_id: string }>(
      `SELECT appointment.department_id::text AS department_id
       FROM academics_department_hod_appointments appointment
       JOIN academics_departments department
         ON department.tenant_id = appointment.tenant_id
        AND department.id = appointment.department_id
       WHERE appointment.tenant_id = $1
         AND appointment.teacher_user_id::text = $2
         AND appointment.status = 'active'
         AND COALESCE(department.is_active, TRUE) = TRUE
         AND (appointment.effective_from IS NULL OR appointment.effective_from::date <= CURRENT_DATE)
         AND (appointment.effective_to IS NULL OR appointment.effective_to::date >= CURRENT_DATE)
       ORDER BY appointment.effective_from DESC NULLS LAST,
                appointment.updated_at DESC, appointment.id DESC
       LIMIT 1`,
      [input.tenant_id, input.user_id],
    );
    return result.rows[0]?.department_id ?? null;
  }

  async resolveCurrentPublishedAcademicScope(tenantId: string): Promise<{
    academic_year: string;
    term_name: string;
    version_id: string;
  } | null> {
    const result = await this.query<{
      academic_year: string;
      term_name: string;
      version_id: string;
    }>(
      `SELECT version.academic_year, version.term_name, version.id::text AS version_id
       FROM timetable_versions version
       LEFT JOIN academic_years year
         ON year.tenant_id = version.tenant_id AND year.name = version.academic_year
       LEFT JOIN academic_terms term
         ON term.tenant_id = version.tenant_id
        AND term.academic_year_id = year.id
        AND term.name = version.term_name
       WHERE version.tenant_id = $1 AND version.status = 'published'
       ORDER BY
         CASE
           WHEN term.id IS NOT NULL
            AND CURRENT_DATE BETWEEN term.starts_on AND term.ends_on THEN 0
           ELSE 1
         END,
         version.published_at DESC NULLS LAST,
         version.updated_at DESC,
         version.id DESC
       LIMIT 1`,
      [tenantId],
    );
    return result.rows[0] ?? null;
  }

  async validateViewReference(tenantId: string, input: {
    academic_year: string;
    class_section_id?: string;
    stream_id?: string;
    teacher_id?: string;
    resource_id?: string;
    department_id?: string;
  }, allowHistoricalReferences = false) {
    const result = await this.query<any>(
      `SELECT
         ($2::text IS NULL OR EXISTS (
           SELECT 1
           FROM class_sections section
           JOIN academic_years year
             ON year.tenant_id = section.tenant_id
            AND year.id::text = section.academic_year_id::text
           WHERE section.tenant_id = $1 AND section.id::text = $2
             AND (
               $8::boolean
               OR (
                 year.name = $7
                 AND COALESCE(year.status, 'active') = 'active'
                 AND year.archived_at IS NULL
                 AND COALESCE(section.is_active, TRUE) = TRUE
                 AND COALESCE(section.status, 'active') = 'active'
                 AND section.archived_at IS NULL
               )
             )
         )) AS class_ok,
         ($3::text IS NULL OR EXISTS (
           SELECT 1
           FROM class_streams stream
           JOIN class_sections section
             ON section.tenant_id = stream.tenant_id
            AND section.id::text = stream.class_section_id::text
           JOIN academic_years year
             ON year.tenant_id = section.tenant_id
            AND year.id::text = section.academic_year_id::text
           WHERE stream.tenant_id = $1 AND stream.id::text = $3
             AND ($2::text IS NULL OR stream.class_section_id::text = $2)
             AND (
               $8::boolean
               OR (
                 year.name = $7
                 AND COALESCE(year.status, 'active') = 'active'
                 AND year.archived_at IS NULL
                 AND COALESCE(stream.is_active, TRUE) = TRUE
                 AND COALESCE(stream.status, 'active') = 'active'
                 AND stream.archived_at IS NULL
                 AND COALESCE(section.is_active, TRUE) = TRUE
                 AND COALESCE(section.status, 'active') = 'active'
                 AND section.archived_at IS NULL
               )
             )
         )) AS stream_ok,
         ($4::text IS NULL OR EXISTS (SELECT 1 FROM staff_profiles WHERE tenant_id = $1 AND user_id::text = $4 AND COALESCE(status, 'active') = 'active')) AS teacher_ok,
         ($5::text IS NULL OR EXISTS (SELECT 1 FROM timetable_resources WHERE tenant_id = $1 AND id::text = $5 AND status = 'active')) AS resource_ok,
         ($6::text IS NULL OR EXISTS (SELECT 1 FROM academics_departments WHERE tenant_id = $1 AND id::text = $6 AND COALESCE(is_active, TRUE))) AS department_ok`,
      [tenantId, input.class_section_id ?? null, input.stream_id ?? null,
        input.teacher_id ?? null, input.resource_id ?? null, input.department_id ?? null,
        input.academic_year, allowHistoricalReferences],
    );
    const refs = result.rows[0] ?? {};
    if (!refs.class_ok || !refs.stream_ok || !refs.teacher_ok || !refs.resource_ok || !refs.department_ok) {
      throw new BadRequestException('A timetable view filter is inactive, belongs to another academic year, or is outside this school');
    }
  }

  async listView(input: TimetableViewRepositoryInput) {
    if (!input.version_id) {
      await this.assertAcademicScope(input.tenant_id, input.academic_year, input.term_name);
    }
    await this.validateViewReference(input.tenant_id, input, Boolean(input.version_id));
    const version = await this.query<any>(
      `SELECT id::text, academic_year, term_name, status, revision_number,
              row_version, published_at::text
       FROM timetable_versions
       WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
         AND (
           ($5::text IS NULL AND status IN ('draft', 'published'))
           OR ($5::text IS NOT NULL AND id::text = $5 AND status IN ('draft', 'published', 'archived'))
         )
       ORDER BY
         CASE WHEN $4::boolean AND status = 'draft' THEN 0
              WHEN NOT $4::boolean AND status = 'published' THEN 0 ELSE 1 END,
         updated_at DESC
       LIMIT 1`,
      [input.tenant_id, input.academic_year, input.term_name, Boolean(input.prefer_draft),
        input.version_id ?? null],
    );
    const versionRecord = version.rows[0] ?? null;
    if (input.version_id && !versionRecord) {
      throw new NotFoundException('The requested timetable version was not found for this school and academic term');
    }
    if (!versionRecord) return { view: input.view, version: null, items: [], metrics: { total_slots: 0 } };
    const result = await this.query<any>(
      `SELECT slot.id::text, slot.version_id::text, slot.academic_year, slot.term_name,
              slot.class_section_id, COALESCE(class_section.name, slot.class_section_id) AS class_name,
              slot.stream_id, stream.name AS stream_name,
              slot.subject_id, COALESCE(subject.name, slot.subject_id) AS subject_name,
              slot.teacher_id,
              COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email, slot.teacher_id) AS teacher_name,
              slot.resource_id::text, resource.name AS resource_name, slot.room_id,
              slot.day_of_week, slot.period_id::text, period.name AS period_name,
              slot.starts_at::text, slot.ends_at::text, slot.duration_periods,
              slot.parallel_key, slot.locked, slot.row_version, slot.status, slot.source_kind
       FROM timetable_slots slot
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = slot.tenant_id AND class_section.id::text = slot.class_section_id
       LEFT JOIN class_streams stream
         ON stream.tenant_id = slot.tenant_id AND stream.id::text = slot.stream_id
       LEFT JOIN subjects subject
         ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
       LEFT JOIN staff_profiles staff
         ON staff.tenant_id = slot.tenant_id AND staff.user_id::text = slot.teacher_id
       LEFT JOIN timetable_resources resource
         ON resource.tenant_id = slot.tenant_id AND resource.id = slot.resource_id
       LEFT JOIN timetable_period_definitions period
         ON period.tenant_id = slot.tenant_id AND period.id = slot.period_id
       WHERE slot.tenant_id = $1 AND slot.version_id = $2::uuid AND slot.status <> 'cancelled'
         AND ($3::text IS NULL OR slot.class_section_id = $3)
         AND ($4::text IS NULL OR slot.stream_id = $4)
         AND ($5::text IS NULL OR slot.teacher_id = $5)
         AND ($6::text IS NULL OR slot.resource_id::text = $6)
         AND ($7::integer IS NULL OR slot.day_of_week = $7)
         AND ($8::text[] IS NULL OR slot.class_section_id = ANY($8::text[]))
         AND ($9::text IS NULL OR subject.department_id::text = $9)
       ORDER BY slot.day_of_week, slot.starts_at, class_name, subject_name`,
      [input.tenant_id, versionRecord.id, input.class_section_id ?? null,
        input.stream_id ?? null, input.teacher_id ?? null, input.resource_id ?? null,
        input.day_of_week ?? null,
        input.allowed_class_section_ids === undefined ? null : input.allowed_class_section_ids,
        input.department_id ?? null],
    );
    return {
      view: input.view,
      version: versionRecord,
      items: result.rows,
      metrics: {
        total_slots: result.rows.length,
        unique_classes: new Set(result.rows.map((item) => item.class_section_id)).size,
        unique_teachers: new Set(result.rows.map((item) => item.teacher_id)).size,
        unique_resources: new Set(result.rows.map((item) => item.resource_id).filter(Boolean)).size,
      },
    };
  }

  async publishVersionAtomic(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    notes?: string;
    expected_row_version?: number;
    configuration_snapshot: Record<string, unknown>;
    validation_summary: Record<string, unknown>;
    actor_user_id: string | null;
  }) {
    let publishedId: string | null = null;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const draft = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version
         FROM timetable_versions
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'draft'
         FOR UPDATE`,
        input.tenant_id, input.academic_year, input.term_name,
      ))[0];
      if (!draft) throw new BadRequestException('No draft timetable is available to publish');
      if (input.expected_row_version != null && Number(draft.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The timetable draft changed since it was reviewed; validate it again before publishing');
      }
      const slotCount = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM timetable_slots
         WHERE tenant_id = $1 AND version_id = $2::uuid AND status = 'draft'`,
        input.tenant_id, draft.id,
      ))[0];
      if (Number(slotCount?.count ?? 0) === 0) throw new BadRequestException('Add or generate timetable lessons before publishing');

      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET status = 'archived', immutable = TRUE, row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'published'`,
        input.tenant_id, input.academic_year, input.term_name,
      );
      const published = this.asRows<any>(await tx.$queryRawUnsafe(
        `UPDATE timetable_versions
         SET status = 'published', immutable = TRUE, notes = $4,
             configuration_snapshot = $5::jsonb,
             generation_summary = generation_summary || jsonb_build_object('validation', $6::jsonb),
             published_by_user_id = $7::uuid, published_at = NOW(),
             row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3
           AND id = $8::uuid AND status = 'draft'
         RETURNING id::text`,
        input.tenant_id, input.academic_year, input.term_name, input.notes ?? null,
        JSON.stringify(input.configuration_snapshot), JSON.stringify(input.validation_summary),
        input.actor_user_id, draft.id,
      ))[0];
      if (!published) throw new ConflictException('Timetable publication could not acquire the reviewed draft');
      publishedId = published.id;
      await tx.$executeRawUnsafe(
        `UPDATE timetable_slots SET status = 'published', updated_at = NOW()
         WHERE tenant_id = $1 AND version_id = $2::uuid AND status = 'draft'`,
        input.tenant_id, draft.id,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, 'timetable.version.published', $4::jsonb)`,
        input.tenant_id, draft.id, input.actor_user_id,
        JSON.stringify({ academic_year: input.academic_year, term_name: input.term_name, validation: input.validation_summary }),
      );
    });
    return publishedId ? this.getVersion(input.tenant_id, publishedId) : null;
  }

  async createRevisionAtomic(input: {
    tenant_id: string;
    academic_year: string;
    term_name: string;
    notes?: string;
    source_version_id?: string;
    expected_row_version?: number;
    actor_user_id: string | null;
  }) {
    let draftId: string | null = null;
    let reusedExistingDraft = false;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const existingDraft = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text FROM timetable_versions
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'draft'
         FOR UPDATE`,
        input.tenant_id, input.academic_year, input.term_name,
      ))[0];
      if (existingDraft) {
        draftId = existingDraft.id;
        reusedExistingDraft = true;
        return;
      }
      const source = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version, configuration_snapshot,
                COALESCE((SELECT MAX(revision_number) FROM timetable_versions history
                          WHERE history.tenant_id = version.tenant_id
                            AND history.academic_year = version.academic_year
                            AND history.term_name = version.term_name), 0) AS max_revision
         FROM timetable_versions version
         WHERE version.tenant_id = $1 AND version.academic_year = $2 AND version.term_name = $3
           AND version.status = 'published'
           AND ($4::text IS NULL OR version.id::text = $4)
         ORDER BY version.published_at DESC NULLS LAST LIMIT 1 FOR UPDATE`,
        input.tenant_id, input.academic_year, input.term_name, input.source_version_id ?? null,
      ))[0];
      if (!source) throw new BadRequestException('Publish the first timetable before creating a revision');
      if (input.expected_row_version != null && Number(source.row_version) !== Number(input.expected_row_version)) {
        throw new ConflictException('The published timetable changed since it was loaded; refresh and retry');
      }
      draftId = randomUUID();
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_versions (
           id, tenant_id, academic_year, term_name, revision_number, source_version_id,
           status, immutable, notes, configuration_snapshot, created_by_user_id
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, 'draft', FALSE, $7, $8::jsonb, $9::uuid)`,
        draftId, input.tenant_id, input.academic_year, input.term_name,
        Number(source.max_revision) + 1, source.id, input.notes ?? null,
        JSON.stringify(source.configuration_snapshot ?? {}), input.actor_user_id,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_slots (
           tenant_id, version_id, requirement_id, academic_year, term_name,
           class_section_id, stream_id, subject_id, teacher_id, room_id, resource_id,
           period_id, parallel_key, day_of_week, starts_at, ends_at, duration_periods,
           locked, source_kind, source_record_id, status, created_by_user_id
         ) SELECT slot.tenant_id, $3::uuid, slot.requirement_id, slot.academic_year, slot.term_name,
                  slot.class_section_id, slot.stream_id, slot.subject_id, slot.teacher_id,
                  slot.room_id, slot.resource_id, slot.period_id, slot.parallel_key,
                  slot.day_of_week, slot.starts_at, slot.ends_at, slot.duration_periods,
                  slot.locked, 'revision', slot.id::text, 'draft', $4::uuid
         FROM timetable_slots slot
         WHERE slot.tenant_id = $1 AND slot.version_id = $2::uuid AND slot.status = 'published'`,
        input.tenant_id, source.id, draftId, input.actor_user_id,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, 'timetable.version.revision_created', $4::jsonb)`,
        input.tenant_id, draftId, input.actor_user_id,
        JSON.stringify({ source_version_id: source.id, revision_number: Number(source.max_revision) + 1 }),
      );
    });
    const version = draftId ? await this.getVersion(input.tenant_id, draftId) : null;
    return version ? { ...version, reused_existing_draft: reusedExistingDraft } : null;
  }

  async copyVersionAtomic(input: {
    tenant_id: string;
    source_version_id: string;
    academic_year: string;
    term_name: string;
    expected_version_row_version?: number;
    actor_user_id: string | null;
  }) {
    await this.assertAcademicScope(input.tenant_id, input.academic_year, input.term_name);
    let output: any = null;
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const source = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version FROM timetable_versions
         WHERE tenant_id = $1 AND id = $2::uuid AND status IN ('published', 'archived')
         FOR UPDATE`,
        input.tenant_id, input.source_version_id,
      ))[0];
      if (!source) throw new NotFoundException('Source timetable version was not found for this school');
      if (input.expected_version_row_version != null
        && Number(source.row_version) !== Number(input.expected_version_row_version)) {
        throw new ConflictException('The source timetable changed since it was selected; refresh and retry');
      }
      let draft = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version FROM timetable_versions
         WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3 AND status = 'draft'
         FOR UPDATE`,
        input.tenant_id, input.academic_year, input.term_name,
      ))[0];
      if (draft) {
        const existingCount = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS count FROM timetable_slots
           WHERE tenant_id = $1 AND version_id = $2::uuid AND status <> 'cancelled'`,
          input.tenant_id, draft.id,
        ))[0];
        if (Number(existingCount?.count ?? 0) > 0) {
          throw new ConflictException('The target term already has a populated draft; review it instead of overwriting it');
        }
      } else {
        const revision = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT COALESCE(MAX(revision_number), 0)::int AS revision
           FROM timetable_versions WHERE tenant_id = $1 AND academic_year = $2 AND term_name = $3`,
          input.tenant_id, input.academic_year, input.term_name,
        ))[0];
        draft = { id: randomUUID(), row_version: 1 };
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_versions (
             id, tenant_id, academic_year, term_name, revision_number, source_version_id,
             status, immutable, source_kind, created_by_user_id
           ) VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, 'draft', FALSE, 'copy', $7::uuid)`,
          draft.id, input.tenant_id, input.academic_year, input.term_name,
          Number(revision?.revision ?? 0) + 1, source.id, input.actor_user_id,
        );
      }

      const sourceSlots = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT slot.* FROM timetable_slots slot
         WHERE slot.tenant_id = $1 AND slot.version_id = $2::uuid AND slot.status <> 'cancelled'
         ORDER BY slot.day_of_week, slot.starts_at, slot.id`,
        input.tenant_id, source.id,
      ));
      const targetPeriods = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT period.id::text, period.day_of_week, period.starts_at::text,
                period.ends_at::text, period.order_index, period.is_teaching
         FROM timetable_period_definitions period
         JOIN timetable_configurations configuration
           ON configuration.tenant_id = period.tenant_id
          AND configuration.id = period.configuration_id
         WHERE period.tenant_id = $1
           AND configuration.academic_year = $2
           AND configuration.term_name = $3
         ORDER BY period.day_of_week, period.order_index`,
        input.tenant_id, input.academic_year, input.term_name,
      ));
      const reviewIssues: any[] = [];
      let copied = 0;
      for (const slot of sourceSlots) {
        const valid = this.asRows<any>(await tx.$queryRawUnsafe(
          `SELECT
             EXISTS (SELECT 1 FROM class_sections section
                     JOIN academic_years year ON year.tenant_id = section.tenant_id AND year.id = section.academic_year_id
                     WHERE section.tenant_id = $1 AND section.id::text = $2 AND year.name = $3) AS class_ok,
             EXISTS (SELECT 1 FROM subjects WHERE tenant_id = $1 AND id::text = $4 AND COALESCE(status, 'active') = 'active') AS subject_ok,
             EXISTS (
               SELECT 1 FROM teacher_subject_assignments assignment
               LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id AND term.id = assignment.academic_term_id
               LEFT JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
               WHERE assignment.tenant_id = $1
                 AND (assignment.academic_term_id IS NULL OR (year.name = $3 AND term.name = $5))
                 AND assignment.class_section_id::text = $2 AND assignment.subject_id::text = $4
                 AND assignment.teacher_user_id::text = $6 AND assignment.status = 'active'
                 AND (assignment.stream_id IS NULL OR assignment.stream_id::text = $8::text)
                 AND (assignment.effective_from IS NULL OR assignment.effective_from <= CURRENT_DATE)
                 AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
              ) AS allocation_ok,
              ($7::text IS NULL OR EXISTS (SELECT 1 FROM timetable_resources WHERE tenant_id = $1 AND id::text = $7 AND status = 'active')) AS resource_ok,
              ($8::text IS NULL OR EXISTS (
                SELECT 1 FROM class_streams stream
                WHERE stream.tenant_id = $1 AND stream.id::text = $8
                  AND stream.class_section_id::text = $2
              )) AS stream_ok,
              (SELECT requirement.id::text
               FROM timetable_subject_requirements requirement
               WHERE requirement.tenant_id = $1
                 AND requirement.academic_year = $3 AND requirement.term_name = $5
                 AND requirement.class_section_id = $2 AND requirement.subject_id = $4
                 AND requirement.stream_id IS NOT DISTINCT FROM $8::text
                 AND requirement.teacher_id IS NOT DISTINCT FROM $6::text
                 AND requirement.parallel_key IS NOT DISTINCT FROM $9::text
                 AND requirement.status = 'active'
               LIMIT 1) AS target_requirement_id`,
          input.tenant_id, String(slot.class_section_id), input.academic_year,
          String(slot.subject_id), input.term_name, String(slot.teacher_id),
          slot.resource_id?.toString() ?? null, slot.stream_id?.toString() ?? null,
          slot.parallel_key?.toString() ?? null,
        ))[0];
        if (!valid?.class_ok || !valid?.stream_ok || !valid?.subject_ok || !valid?.allocation_ok || !valid?.resource_ok) {
          reviewIssues.push({
            source_slot_id: String(slot.id),
            code: 'COPIED_REFERENCE_CHANGED',
            message: 'This lesson was not copied because its current class, stream, subject, teacher allocation, or resource is no longer valid.',
          });
          continue;
        }
        const dayPeriods = targetPeriods.filter(
          (period) => Number(period.day_of_week) === Number(slot.day_of_week),
        );
        const startIndex = dayPeriods.findIndex(
          (period) => String(period.starts_at).slice(0, 5) === String(slot.starts_at).slice(0, 5),
        );
        const duration = Math.max(1, Number(slot.duration_periods || 1));
        const sequence = startIndex < 0 ? [] : dayPeriods.slice(startIndex, startIndex + duration);
        const targetPeriod = sequence.length === duration
          && sequence.every((period) => Boolean(period.is_teaching))
          && sequence.every((period, index) => index === 0
            || String(sequence[index - 1].ends_at).slice(0, 5) === String(period.starts_at).slice(0, 5))
          && String(sequence[sequence.length - 1]?.ends_at).slice(0, 5) === String(slot.ends_at).slice(0, 5)
          ? sequence[0]
          : null;
        if (!targetPeriod) {
          reviewIssues.push({
            source_slot_id: String(slot.id),
            code: 'COPIED_PERIOD_STRUCTURE_CHANGED',
            message: 'This lesson was not copied because the target term no longer has the same consecutive teaching period structure.',
          });
          continue;
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO timetable_slots (
             tenant_id, version_id, requirement_id, academic_year, term_name,
             class_section_id, stream_id, subject_id, teacher_id, room_id, resource_id,
             period_id, parallel_key, day_of_week, starts_at, ends_at, duration_periods,
             locked, source_kind, source_record_id, status, created_by_user_id
           ) VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11::uuid,
                     $12::uuid, $13, $14, $15::time, $16::time, $17, $18,
                     'copy', $19, 'draft', $20::uuid)`,
          input.tenant_id, draft.id, valid.target_requirement_id ?? null,
          input.academic_year, input.term_name, String(slot.class_section_id), slot.stream_id ?? null,
          String(slot.subject_id), String(slot.teacher_id), slot.room_id ?? null,
          slot.resource_id?.toString() ?? null, String(targetPeriod.id),
          slot.parallel_key ?? null, Number(slot.day_of_week), String(slot.starts_at), String(slot.ends_at),
          Number(slot.duration_periods || 1), Boolean(slot.locked), String(slot.id), input.actor_user_id,
        );
        copied += 1;
      }
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions
         SET generation_summary = generation_summary || $3::jsonb,
             row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid`,
        input.tenant_id, draft.id,
        JSON.stringify({ copied_from_version_id: source.id, slots_copied: copied, review_issues: reviewIssues }),
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, 'timetable.version.copied', $4::jsonb)`,
        input.tenant_id, draft.id, input.actor_user_id,
        JSON.stringify({ source_version_id: source.id, slots_copied: copied, review_issues: reviewIssues }),
      );
      output = { version_id: draft.id, slots_copied: copied, review_issues: reviewIssues };
    });
    return { ...output, version: await this.getVersion(input.tenant_id, output.version_id), unscheduled: [] };
  }

  async applyMovesAtomic(input: {
    tenant_id: string;
    version_id: string;
    expected_version_row_version?: number;
    moves: Array<{ slot_id: string; expected_row_version: number; day_of_week: number; period_id: string; starts_at: string; ends_at: string }>;
    actor_user_id: string | null;
  }) {
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const version = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT id::text, row_version, status FROM timetable_versions
         WHERE tenant_id = $1 AND id = $2::uuid FOR UPDATE`,
        input.tenant_id, input.version_id,
      ))[0];
      if (!version || version.status !== 'draft') throw new BadRequestException('Auto-fix requires an editable draft');
      if (input.expected_version_row_version != null
        && Number(version.row_version) !== Number(input.expected_version_row_version)) {
        throw new ConflictException('The timetable draft changed before auto-fix could be applied');
      }
      for (const move of input.moves) {
        const updated = await tx.$executeRawUnsafe(
          `UPDATE timetable_slots
           SET day_of_week = $5, period_id = $6::uuid, starts_at = $7::time, ends_at = $8::time,
               row_version = row_version + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND version_id = $2::uuid AND id = $3::uuid
             AND row_version = $4 AND status = 'draft' AND locked = FALSE`,
          input.tenant_id, input.version_id, move.slot_id, move.expected_row_version,
          move.day_of_week, move.period_id, move.starts_at, move.ends_at,
        );
        if (Number(updated) !== 1) throw new ConflictException('A lesson changed while auto-fix was being applied');
      }
      await tx.$executeRawUnsafe(
        `UPDATE timetable_versions SET row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid`,
        input.tenant_id, input.version_id,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, 'timetable.version.auto_fixed', $4::jsonb)`,
        input.tenant_id, input.version_id, input.actor_user_id, JSON.stringify({ moves: input.moves }),
      );
    });
    return this.getVersion(input.tenant_id, input.version_id);
  }

  async getReliefAffected(tenantId: string, absentTeacherId: string, reliefDate: string) {
    const teacher = await this.query<any>(
      `SELECT user_id::text AS teacher_id,
              COALESCE(full_name, display_name, preferred_name, email, user_id::text) AS teacher_name
       FROM staff_profiles
       WHERE tenant_id = $1 AND user_id::text = $2 AND COALESCE(status, 'active') = 'active'
       LIMIT 1`,
      [tenantId, absentTeacherId],
    );
    if (!teacher.rows[0]) throw new NotFoundException('Absent teacher was not found for this school');
    const lessons = await this.query<any>(
      `SELECT slot.id::text AS slot_id, slot.version_id::text, slot.academic_year, slot.term_name,
              slot.class_section_id, COALESCE(class_section.name, slot.class_section_id) AS class_name,
              slot.stream_id, stream.name AS stream_name,
              slot.subject_id, COALESCE(subject.name, slot.subject_id) AS subject_name,
              slot.teacher_id AS absent_teacher_id, slot.resource_id::text,
              slot.day_of_week, slot.period_id::text, slot.starts_at::text, slot.ends_at::text,
              relief.id::text AS relief_id, COALESCE(relief.status, 'needed') AS relief_status,
              relief.substitute_teacher_id,
              COALESCE(substitute.full_name, substitute.display_name, substitute.preferred_name, substitute.email) AS substitute_teacher_name,
              relief.row_version AS relief_row_version
       FROM timetable_slots slot
       JOIN timetable_versions version
         ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id AND version.status = 'published'
       LEFT JOIN academic_years year
         ON year.tenant_id = version.tenant_id AND year.name = version.academic_year
       LEFT JOIN academic_terms term
         ON term.tenant_id = version.tenant_id AND term.academic_year_id = year.id AND term.name = version.term_name
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = slot.tenant_id AND class_section.id::text = slot.class_section_id
       LEFT JOIN class_streams stream
         ON stream.tenant_id = slot.tenant_id AND stream.id::text = slot.stream_id
       LEFT JOIN subjects subject
         ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
       LEFT JOIN timetable_relief_assignments relief
         ON relief.tenant_id = slot.tenant_id AND relief.slot_id = slot.id
        AND relief.relief_date = $3::date AND relief.status = 'assigned'
       LEFT JOIN staff_profiles substitute
         ON substitute.tenant_id = relief.tenant_id AND substitute.user_id::text = relief.substitute_teacher_id
       WHERE slot.tenant_id = $1 AND slot.teacher_id = $2 AND slot.status = 'published'
         AND slot.day_of_week = EXTRACT(ISODOW FROM $3::date)::int
         AND (term.id IS NULL OR $3::date BETWEEN term.starts_on AND term.ends_on)
       ORDER BY slot.starts_at, class_name`,
      [tenantId, absentTeacherId, reliefDate],
    );
    return { date: reliefDate, absent_teacher: teacher.rows[0], lessons: lessons.rows };
  }

  async getReliefCandidates(tenantId: string, slotId: string, reliefDate: string) {
    const slotResult = await this.query<any>(
      `SELECT slot.id::text, slot.version_id::text, slot.teacher_id AS absent_teacher_id,
              slot.academic_year, slot.term_name, slot.class_section_id, slot.stream_id,
              slot.subject_id, slot.day_of_week,
              slot.period_id::text, slot.starts_at::text, slot.ends_at::text,
              subject.department_id::text AS subject_department_id
       FROM timetable_slots slot
       JOIN timetable_versions version
         ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id AND version.status = 'published'
       LEFT JOIN subjects subject
         ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
       WHERE slot.tenant_id = $1 AND slot.id = $2::uuid AND slot.status = 'published'
       LIMIT 1`,
      [tenantId, slotId],
    );
    const slot = slotResult.rows[0];
    if (!slot) throw new NotFoundException('Published timetable lesson was not found for this school');
    const requestedDay = new Date(`${reliefDate}T12:00:00Z`).getUTCDay() || 7;
    if (requestedDay !== Number(slot.day_of_week)) {
      throw new BadRequestException('The relief date does not fall on this lesson day');
    }

    const candidates = await this.query<any>(
      `SELECT staff.user_id::text AS teacher_id,
              COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email, staff.user_id::text) AS teacher_name,
              EXISTS (
                SELECT 1 FROM teacher_subject_assignments assignment
                WHERE assignment.tenant_id = staff.tenant_id
                  AND assignment.teacher_user_id::text = staff.user_id::text
                  AND assignment.subject_id::text = $4
                  AND assignment.status = 'active'
              ) AS subject_qualified,
              EXISTS (
                SELECT 1 FROM teacher_subject_assignments assignment
                WHERE assignment.tenant_id = staff.tenant_id
                  AND assignment.teacher_user_id::text = staff.user_id::text
                  AND assignment.class_section_id::text = $5
                  AND assignment.status = 'active'
              ) AS knows_class,
              (SELECT COUNT(*)::int FROM timetable_slots daily
               WHERE daily.tenant_id = staff.tenant_id AND daily.version_id = $6::uuid
                 AND daily.teacher_id = staff.user_id::text AND daily.day_of_week = $7
                 AND daily.status = 'published') AS daily_load,
              (SELECT COUNT(*)::int FROM timetable_slots weekly
               WHERE weekly.tenant_id = staff.tenant_id AND weekly.version_id = $6::uuid
                 AND weekly.teacher_id = staff.user_id::text AND weekly.status = 'published') AS weekly_load,
              (CASE WHEN EXISTS (
                 SELECT 1 FROM teacher_subject_assignments assignment
                 WHERE assignment.tenant_id = staff.tenant_id
                   AND assignment.teacher_user_id::text = staff.user_id::text
                   AND assignment.subject_id::text = $4 AND assignment.status = 'active'
               ) THEN 60 ELSE 0 END
               + CASE WHEN EXISTS (
                 SELECT 1 FROM teacher_subject_assignments assignment
                 WHERE assignment.tenant_id = staff.tenant_id
                   AND assignment.teacher_user_id::text = staff.user_id::text
                   AND assignment.class_section_id::text = $5 AND assignment.status = 'active'
               ) THEN 20 ELSE 0 END
               - (SELECT COUNT(*)::int * 4 FROM timetable_slots daily
                  WHERE daily.tenant_id = staff.tenant_id AND daily.version_id = $6::uuid
                    AND daily.teacher_id = staff.user_id::text AND daily.day_of_week = $7
                    AND daily.status = 'published'))::int AS score
       FROM staff_profiles staff
       WHERE staff.tenant_id = $1 AND staff.user_id IS NOT NULL
         AND COALESCE(staff.status, 'active') = 'active'
         AND staff.user_id::text <> $3
         AND EXISTS (
           SELECT 1
           FROM teacher_subject_assignments teaching_assignment
           LEFT JOIN academic_terms teaching_term
             ON teaching_term.tenant_id = teaching_assignment.tenant_id
            AND teaching_term.id = teaching_assignment.academic_term_id
           LEFT JOIN academic_years teaching_year
             ON teaching_year.tenant_id = teaching_term.tenant_id
            AND teaching_year.id = teaching_term.academic_year_id
           WHERE teaching_assignment.tenant_id = staff.tenant_id
             AND teaching_assignment.teacher_user_id::text = staff.user_id::text
             AND teaching_assignment.status = 'active'
             AND (teaching_assignment.academic_term_id IS NULL OR (teaching_year.name = $11 AND teaching_term.name = $12))
             AND (teaching_assignment.effective_from IS NULL OR teaching_assignment.effective_from::date <= $2::date)
             AND (teaching_assignment.effective_to IS NULL OR teaching_assignment.effective_to::date >= $2::date)
         )
         AND NOT EXISTS (
           SELECT 1 FROM timetable_slots occupied
           WHERE occupied.tenant_id = staff.tenant_id AND occupied.version_id = $6::uuid
             AND occupied.teacher_id = staff.user_id::text AND occupied.day_of_week = $7
             AND occupied.status = 'published'
             AND occupied.starts_at < $9::time AND occupied.ends_at > $8::time
         )
         AND NOT EXISTS (
           SELECT 1 FROM timetable_relief_assignments relief
           JOIN timetable_slots relief_slot
             ON relief_slot.tenant_id = relief.tenant_id AND relief_slot.id = relief.slot_id
           WHERE relief.tenant_id = staff.tenant_id AND relief.relief_date = $2::date
             AND relief.substitute_teacher_id = staff.user_id::text AND relief.status = 'assigned'
             AND relief_slot.starts_at < $9::time AND relief_slot.ends_at > $8::time
         )
         AND NOT EXISTS (
           SELECT 1 FROM timetable_teacher_availability availability
           WHERE availability.tenant_id = staff.tenant_id
             AND availability.teacher_id = staff.user_id::text
             AND availability.day_of_week = $7 AND availability.period_id::text = $10
             AND availability.state IN ('unavailable', 'protected')
         )
       ORDER BY score DESC, daily_load ASC, weekly_load ASC, teacher_name ASC`,
      [tenantId, reliefDate, String(slot.absent_teacher_id), String(slot.subject_id),
        String(slot.class_section_id), String(slot.version_id), Number(slot.day_of_week),
        String(slot.starts_at), String(slot.ends_at), String(slot.period_id),
        String(slot.academic_year), String(slot.term_name)],
    );
    return {
      slot,
      items: candidates.rows.map((candidate) => ({
        ...candidate,
        score: Number(candidate.score ?? 0),
        daily_load: Number(candidate.daily_load ?? 0),
        weekly_load: Number(candidate.weekly_load ?? 0),
        reasons: [
          candidate.subject_qualified ? 'Allocated to this subject' : 'No current subject allocation',
          candidate.knows_class ? 'Already teaches this class' : 'Available during this lesson',
          `${Number(candidate.daily_load ?? 0)} lesson(s) on this day`,
        ],
      })),
    };
  }

  async assignRelief(input: {
    tenant_id: string;
    slot_id: string;
    relief_date: string;
    absent_teacher_id: string;
    substitute_teacher_id: string;
    reason?: string;
    actor_user_id: string | null;
  }) {
    let assignment: any;
    try {
      await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      const slot = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT slot.*, version.status AS version_status
         FROM timetable_slots slot
         JOIN timetable_versions version ON version.tenant_id = slot.tenant_id AND version.id = slot.version_id
         WHERE slot.tenant_id = $1 AND slot.id = $2::uuid FOR UPDATE`,
        input.tenant_id, input.slot_id,
      ))[0];
      if (!slot || slot.version_status !== 'published' || slot.status !== 'published') {
        throw new NotFoundException('Published timetable lesson was not found for this school');
      }
      if (String(slot.teacher_id) !== input.absent_teacher_id) {
        throw new BadRequestException('The absent teacher does not own the selected published lesson');
      }
      if (input.absent_teacher_id === input.substitute_teacher_id) {
        throw new BadRequestException('The absent teacher cannot be their own substitute');
      }
      const requestedDay = new Date(`${input.relief_date}T12:00:00Z`).getUTCDay() || 7;
      if (requestedDay !== Number(slot.day_of_week)) {
        throw new BadRequestException('The relief date does not fall on the selected lesson day');
      }
      await tx.$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1::text || ':relief:' || $2::text || ':' || $3::text))`,
        input.tenant_id,
        input.relief_date,
        input.substitute_teacher_id,
      );
      const substitute = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT staff.user_id::text,
                COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email) AS teacher_name
         FROM staff_profiles staff
         WHERE staff.tenant_id = $1 AND staff.user_id::text = $2
           AND COALESCE(staff.status, 'active') = 'active'
           AND EXISTS (
             SELECT 1
             FROM teacher_subject_assignments teaching_assignment
             LEFT JOIN academic_terms teaching_term
               ON teaching_term.tenant_id = teaching_assignment.tenant_id
              AND teaching_term.id = teaching_assignment.academic_term_id
             LEFT JOIN academic_years teaching_year
               ON teaching_year.tenant_id = teaching_term.tenant_id
              AND teaching_year.id = teaching_term.academic_year_id
             WHERE teaching_assignment.tenant_id = staff.tenant_id
               AND teaching_assignment.teacher_user_id::text = staff.user_id::text
               AND teaching_assignment.status = 'active'
               AND (teaching_assignment.academic_term_id IS NULL OR (teaching_year.name = $3 AND teaching_term.name = $4))
               AND (teaching_assignment.effective_from IS NULL OR teaching_assignment.effective_from::date <= $5::date)
               AND (teaching_assignment.effective_to IS NULL OR teaching_assignment.effective_to::date >= $5::date)
           )
         LIMIT 1`,
        input.tenant_id, input.substitute_teacher_id, String(slot.academic_year),
        String(slot.term_name), input.relief_date,
      ))[0];
      if (!substitute) {
        throw new BadRequestException('Select an active staff member with a current teaching allocation as the substitute teacher');
      }
      const clash = this.asRows<any>(await tx.$queryRawUnsafe(
        `SELECT
           EXISTS (
             SELECT 1 FROM timetable_slots occupied
             WHERE occupied.tenant_id = $1 AND occupied.version_id = $2::uuid
               AND occupied.teacher_id = $3 AND occupied.day_of_week = $4
               AND occupied.status = 'published'
               AND occupied.starts_at < $6::time AND occupied.ends_at > $5::time
           ) AS permanent_clash,
           EXISTS (
             SELECT 1 FROM timetable_relief_assignments relief
             JOIN timetable_slots relief_slot
               ON relief_slot.tenant_id = relief.tenant_id AND relief_slot.id = relief.slot_id
             WHERE relief.tenant_id = $1 AND relief.relief_date = $7::date
               AND relief.substitute_teacher_id = $3 AND relief.status = 'assigned'
               AND relief_slot.starts_at < $6::time AND relief_slot.ends_at > $5::time
           ) AS relief_clash,
           EXISTS (
             SELECT 1 FROM timetable_teacher_availability availability
             WHERE availability.tenant_id = $1 AND availability.teacher_id = $3
               AND availability.day_of_week = $4 AND availability.period_id = $8::uuid
               AND availability.state IN ('unavailable', 'protected')
           ) AS unavailable`,
        input.tenant_id, String(slot.version_id), input.substitute_teacher_id,
        Number(slot.day_of_week), String(slot.starts_at), String(slot.ends_at),
        input.relief_date, String(slot.period_id),
      ))[0];
      if (clash?.permanent_clash || clash?.relief_clash) {
        throw new BadRequestException('The substitute teacher already has another lesson or relief assignment at this time');
      }
      if (clash?.unavailable) throw new BadRequestException('The substitute teacher is unavailable during this lesson');
      assignment = this.asRows<any>(await tx.$queryRawUnsafe(
        `INSERT INTO timetable_relief_assignments (
           tenant_id, version_id, slot_id, relief_date, absent_teacher_id,
           substitute_teacher_id, reason, assigned_by_user_id
         ) VALUES ($1, $2::uuid, $3::uuid, $4::date, $5, $6, $7, $8::uuid)
         RETURNING id::text, version_id::text, slot_id::text, relief_date::text,
                   absent_teacher_id, substitute_teacher_id, reason, status,
                   row_version, assigned_by_user_id::text, created_at::text`,
        input.tenant_id, String(slot.version_id), input.slot_id, input.relief_date,
        input.absent_teacher_id, input.substitute_teacher_id, input.reason ?? null, input.actor_user_id,
      ))[0];
      await tx.$executeRawUnsafe(
        `INSERT INTO timetable_audit_logs (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'timetable.relief.assigned', $5::jsonb)`,
        input.tenant_id, String(slot.version_id), input.slot_id, input.actor_user_id,
        JSON.stringify({ relief_id: assignment.id, date: input.relief_date, substitute_teacher_id: input.substitute_teacher_id }),
      );
      assignment.substitute_teacher_name = substitute.teacher_name;
      });
    } catch (error) {
      if (this.isPostgresUniqueViolation(error)) {
        throw new ConflictException('A relief teacher has already been assigned to this lesson and date');
      }
      throw error;
    }
    return assignment;
  }

  async setReliefNotificationId(tenantId: string, reliefId: string, notificationId: string) {
    await this.query(
      `UPDATE timetable_relief_assignments SET notification_id = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid`,
      [tenantId, reliefId, notificationId],
    );
  }

  async cancelRelief(input: {
    tenant_id: string;
    relief_id: string;
    reason: string;
    expected_row_version: number;
    actor_user_id: string | null;
  }) {
    const result = await this.query<any>(
      `WITH updated AS (
         UPDATE timetable_relief_assignments
         SET status = 'cancelled', cancellation_reason = $4,
             cancelled_by_user_id = $5::uuid, cancelled_at = NOW(),
             row_version = row_version + 1, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2::uuid AND row_version = $3 AND status = 'assigned'
         RETURNING *
       ), audited AS (
         INSERT INTO timetable_audit_logs (tenant_id, version_id, slot_id, actor_user_id, action, metadata)
         SELECT $1, updated.version_id, updated.slot_id, $5::uuid,
                'timetable.relief.cancelled', jsonb_build_object('relief_id', updated.id, 'reason', $4)
         FROM updated
       )
       SELECT id::text, version_id::text, slot_id::text, relief_date::text,
              absent_teacher_id, substitute_teacher_id, status, cancellation_reason,
              row_version, cancelled_at::text FROM updated`,
      [input.tenant_id, input.relief_id, input.expected_row_version, input.reason, input.actor_user_id],
    );
    if (!result.rows[0]) {
      const exists = await this.query(
        `SELECT 1 FROM timetable_relief_assignments WHERE tenant_id = $1 AND id = $2::uuid`,
        [input.tenant_id, input.relief_id],
      );
      if (!exists.rows[0]) throw new NotFoundException('Relief assignment was not found for this school');
      throw new ConflictException('The relief assignment changed since it was loaded; refresh and retry');
    }
    return result.rows[0];
  }

  async resolvePortalScope(
    input: Pick<
      TimetablePortalScheduleInput,
      'tenant_id' | 'user_id' | 'role' | 'requested_student_id'
    >,
  ): Promise<TimetablePortalScopeResolution> {
    const role = input.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (role === 'student') {
      const result = await this.query<TimetablePortalStudent>(
        `SELECT access.student_id,
                btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
                student.admission_number,
                assignment.class_section_id,
                COALESCE(class_section.name, assignment.class_section_id) AS class_name,
                assignment.stream_id,
                stream.name AS stream_name
         FROM student_portal_access access
         JOIN students student
           ON student.tenant_id = access.tenant_id AND student.id = access.student_id
         JOIN student_class_assignments assignment
           ON assignment.tenant_id = access.tenant_id AND assignment.student_id = access.student_id
          AND assignment.status = 'active'
         LEFT JOIN class_sections class_section
           ON class_section.tenant_id = assignment.tenant_id
          AND class_section.id::text = assignment.class_section_id::text
         LEFT JOIN class_streams stream
           ON stream.tenant_id = assignment.tenant_id
          AND stream.id::text = assignment.stream_id::text
         WHERE access.tenant_id = $1 AND access.user_id = $2::uuid AND access.status = 'active'
           AND student.deleted_at IS NULL
         LIMIT 1`,
        [input.tenant_id, input.user_id],
      );
      const activeStudent = result.rows[0];
      if (!activeStudent) throw new NotFoundException('No active student class timetable is linked to this account');
      return {
        scope: {
          kind: 'class',
          student_id: activeStudent.student_id,
          class_section_id: activeStudent.class_section_id,
          stream_id: activeStudent.stream_id ?? null,
        },
        students: [activeStudent],
        active_student: activeStudent,
      };
    }
    if (role === 'parent') {
      const result = await this.query<TimetablePortalStudent>(
        `SELECT guardian.student_id,
                btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
                student.admission_number,
                assignment.class_section_id,
                COALESCE(class_section.name, assignment.class_section_id) AS class_name,
                assignment.stream_id,
                stream.name AS stream_name
         FROM student_guardians guardian
         JOIN students student
           ON student.tenant_id = guardian.tenant_id AND student.id = guardian.student_id
         JOIN student_class_assignments assignment
           ON assignment.tenant_id = guardian.tenant_id AND assignment.student_id = guardian.student_id
          AND assignment.status = 'active'
         LEFT JOIN class_sections class_section
           ON class_section.tenant_id = assignment.tenant_id
          AND class_section.id::text = assignment.class_section_id::text
         LEFT JOIN class_streams stream
           ON stream.tenant_id = assignment.tenant_id
          AND stream.id::text = assignment.stream_id::text
         WHERE guardian.tenant_id = $1 AND guardian.user_id = $2::uuid
           AND guardian.status = 'active' AND student.deleted_at IS NULL
         ORDER BY guardian.is_primary DESC, student.first_name, student.last_name,
                  student.admission_number, guardian.student_id`,
        [input.tenant_id, input.user_id],
      );
      if (result.rows.length === 0) {
        throw new NotFoundException('No active student class timetable is linked to this parent account');
      }
      const activeStudent = input.requested_student_id
        ? result.rows.find((student) => student.student_id === input.requested_student_id)
        : result.rows[0];
      if (!activeStudent) {
        throw new NotFoundException('The selected student is not actively linked to this parent account');
      }
      return {
        scope: {
          kind: 'class',
          student_id: activeStudent.student_id,
          class_section_id: activeStudent.class_section_id,
          stream_id: activeStudent.stream_id ?? null,
        },
        students: result.rows,
        active_student: activeStudent,
      };
    }
    const staffRoles = new Set([
      'teacher', 'class_teacher', 'grade_master', 'form_master', 'hod', 'head_of_department',
      'dean_academics', 'exams_manager', 'principal', 'deputy_principal', 'discipline_master',
      'boarding_master',
    ]);
    if (!staffRoles.has(role)) throw new BadRequestException('This role does not have a personal timetable view');
    const staff = await this.query<{ active: boolean }>(
      `SELECT 1 FROM staff_profiles WHERE tenant_id = $1 AND user_id = $2::uuid
       AND COALESCE(status, 'active') = 'active'`,
      [input.tenant_id, input.user_id],
    );
    if (!staff.rows[0]) throw new NotFoundException('No active staff timetable is linked to this account');
    return {
      scope: { kind: 'teacher', teacher_id: input.user_id },
      students: [],
      active_student: null,
    };
  }

  async listPortalSchedule(input: TimetablePortalScheduleInput): Promise<TimetablePortalSchedule> {
    const resolvedScope = await this.resolvePortalScope(input);
    const { scope } = resolvedScope;
    const version = await this.query<TimetablePortalVersion>(
      `SELECT version.id::text, version.academic_year, version.term_name,
              version.revision_number, version.status, version.published_at::text
       FROM timetable_versions version
       LEFT JOIN academic_years year
         ON year.tenant_id = version.tenant_id AND year.name = version.academic_year
       LEFT JOIN academic_terms term
         ON term.tenant_id = version.tenant_id AND term.academic_year_id = year.id AND term.name = version.term_name
       WHERE version.tenant_id = $1 AND version.status = 'published'
         AND ($2::text IS NULL OR version.academic_year = $2)
         AND ($3::text IS NULL OR version.term_name = $3)
         AND ($4::text IS NULL OR version.id::text = $4)
         AND (
           $2::text IS NOT NULL OR $3::text IS NOT NULL OR $4::text IS NOT NULL
           OR term.id IS NULL OR CURRENT_DATE BETWEEN term.starts_on AND term.ends_on
         )
       ORDER BY CASE WHEN term.id IS NOT NULL THEN 0 ELSE 1 END,
                version.published_at DESC NULLS LAST LIMIT 1`,
      [input.tenant_id, input.academic_year ?? null, input.term_name ?? null,
        input.version_id ?? null],
    );
    const activeVersion = version.rows[0] ?? null;
    if (input.version_id && !activeVersion) {
      throw new NotFoundException('The requested published timetable was not found for this school');
    }
    if (!activeVersion) {
      return {
        scope,
        students: resolvedScope.students,
        active_student: resolvedScope.active_student,
        version: null,
        items: [],
      };
    }
    const rows = await this.query<TimetablePortalScheduleItem>(
      `SELECT slot.id::text, slot.version_id::text, slot.class_section_id,
              COALESCE(class_section.name, slot.class_section_id) AS class_name,
              slot.stream_id, stream.name AS stream_name,
              slot.subject_id, COALESCE(subject.name, slot.subject_id) AS subject_name,
              slot.teacher_id,
              COALESCE(staff.full_name, staff.display_name, staff.preferred_name, staff.email, slot.teacher_id) AS teacher_name,
              slot.resource_id::text, resource.name AS resource_name, slot.room_id,
              slot.day_of_week, slot.period_id::text,
              slot.starts_at::text, slot.ends_at::text, slot.duration_periods, slot.parallel_key,
              relief.id::text AS relief_id, relief.relief_date::text AS relief_date,
              relief.substitute_teacher_id,
              COALESCE(substitute.full_name, substitute.display_name, substitute.preferred_name, substitute.email) AS substitute_teacher_name,
              COALESCE(relief.substitute_teacher_id, slot.teacher_id) AS effective_teacher_id,
              COALESCE(
                substitute.full_name, substitute.display_name, substitute.preferred_name, substitute.email,
                staff.full_name, staff.display_name, staff.preferred_name, staff.email, slot.teacher_id
              ) AS effective_teacher_name
       FROM timetable_slots slot
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = slot.tenant_id AND class_section.id::text = slot.class_section_id
       LEFT JOIN class_streams stream
         ON stream.tenant_id = slot.tenant_id AND stream.id::text = slot.stream_id
       LEFT JOIN subjects subject
         ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id
       LEFT JOIN staff_profiles staff
         ON staff.tenant_id = slot.tenant_id AND staff.user_id::text = slot.teacher_id
       LEFT JOIN timetable_resources resource
         ON resource.tenant_id = slot.tenant_id AND resource.id = slot.resource_id
       LEFT JOIN timetable_relief_assignments relief
         ON relief.tenant_id = slot.tenant_id AND relief.slot_id = slot.id
        AND relief.status = 'assigned'
        AND relief.relief_date = COALESCE($7::date, CURRENT_DATE)
       LEFT JOIN staff_profiles substitute
         ON substitute.tenant_id = relief.tenant_id
        AND substitute.user_id::text = relief.substitute_teacher_id
       WHERE slot.tenant_id = $1 AND slot.version_id = $2::uuid AND slot.status = 'published'
         AND (
           ($3 = 'teacher' AND (slot.teacher_id = $4 OR relief.substitute_teacher_id = $4))
           OR ($3 = 'class' AND slot.class_section_id = $5
               AND ($6::text IS NULL OR slot.stream_id IS NULL OR slot.stream_id = $6))
         )
       ORDER BY slot.day_of_week, slot.starts_at`,
      [input.tenant_id, activeVersion.id, scope.kind,
        scope.kind === 'teacher' ? scope.teacher_id : null,
        scope.kind === 'class' ? scope.class_section_id : null,
        scope.kind === 'class' ? scope.stream_id : null,
        input.date ?? null],
    );
    return {
      scope,
      students: resolvedScope.students,
      active_student: resolvedScope.active_student,
      version: activeVersion,
      items: rows.rows,
    };
  }
}
