import { BadRequestException, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { TEACHER_MARK_PROGRESS_SQL, TeacherMarkProgress } from './teacher-mark-progress';

type SqlResult<T> = { rows: T[]; rowCount: number };

@Injectable()
export class ExamsManagerCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
    private readonly examsService?: ExamsService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {}

  private async emitExamSetupOperation(input: {
    operation: 'created' | 'configured';
    exam: Record<string, unknown>;
    name: string;
    startsOn: string;
    endsOn: string;
    status: string;
    scope: Record<string, unknown>;
  }) {
    if (!this.schoolEvents) {
      return;
    }

    const examSeriesId = String(input.exam.id ?? '').trim();
    if (!examSeriesId) {
      throw new BadRequestException('Exam event requires a persisted exam cycle.');
    }

    const targetRoles = ['principal', 'dean_academics', 'hod', 'teacher'];
    const timestamp = String(
      input.exam.updated_at
      ?? input.exam.created_at
      ?? new Date().toISOString(),
    );
    const actionLabel = input.operation === 'created' ? 'created' : 'configured';
    const title = input.operation === 'created' ? 'Exam Cycle Created' : 'Exam Cycle Configured';
    const body = `${input.name} was ${actionLabel} for ${input.startsOn} to ${input.endsOn}.`;

    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: `exam-series-${input.operation}-${examSeriesId}-${timestamp}`,
        type: `exam.series_${input.operation}`,
        module: 'exams',
        actorRole: 'exams_manager',
        title,
        body,
        entityId: examSeriesId,
        severity: 'info',
        createdAt: timestamp,
        payload: {
          exam_series_id: examSeriesId,
          name: input.name,
          starts_on: input.startsOn,
          ends_on: input.endsOn,
          status: input.status,
          ...input.scope,
        },
      },
      notifications: [{
        id: `exam-series-${input.operation}-${examSeriesId}-${timestamp}`,
        audienceRoles: targetRoles,
        title,
        body,
        sourceModule: 'exams',
        relatedModule: 'exams',
        relatedRecordId: examSeriesId,
        priority: input.status === 'submitted' ? 'high' : 'normal',
        read: false,
        createdAt: timestamp,
      }],
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private actorUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private async readSql<T = any>(query: string, params: any[] = []): Promise<SqlResult<T>> {
    return this.operations.readSql<T>(query, params);
  }

  private normalizeStatus(value: unknown, fallback = 'draft') {
    const status = String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_');
    const aliases = new Map<string, string>([
      ['scheduled', 'draft'],
      ['active', 'submitted'],
      ['entry_open', 'submitted'],
      ['in_progress', 'submitted'],
      ['completed', 'locked'],
      ['ready_to_publish', 'locked'],
      ['final_approved', 'locked'],
      ['cancelled', 'archived'],
      ['canceled', 'archived'],
    ]);
    const normalized = aliases.get(status) ?? status;
    const allowed = new Set(['draft', 'submitted', 'reviewed', 'locked', 'published', 'archived']);
    const normalizedFallback = aliases.get(fallback) ?? fallback;
    return allowed.has(normalized) ? normalized : normalizedFallback;
  }

  private requireDate(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }

    const date = new Date(text);
    if (Number.isNaN(date.valueOf())) {
      throw new BadRequestException(`${label} must be a valid date`);
    }

    return text.slice(0, 10);
  }

  private requireTime(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }

    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
      throw new BadRequestException(`${label} must be a valid time`);
    }

    const [rawHours, rawMinutes] = text.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException(`${label} must be a valid time`);
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  private optionalText(value: unknown) {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : null;
  }

  private async examSeriesColumns() {
    const result = await this.readSql<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'exam_series'
          AND table_schema = ANY(current_schemas(false))
      `,
    );

    return new Set(result.rows.map((row) => row.column_name));
  }

  private async activeAcademicTermId(tenantId: string, startsOn: string) {
    const result = await this.readSql<{ id: string }>(
      `
        SELECT id::text
        FROM academic_terms
        WHERE tenant_id = $1
        ORDER BY
          CASE
            WHEN status = 'active' THEN 0
            WHEN $2::date BETWEEN starts_on::date AND ends_on::date THEN 1
            ELSE 2
          END,
          starts_on DESC
        LIMIT 1
      `,
      [tenantId, startsOn],
    );

    return result.rows[0]?.id ?? null;
  }

  private uniqueUuidArray(value: unknown, label: string) {
    const values = Array.isArray(value) ? value : [];
    const unique = Array.from(new Set(values.map((item) => String(item ?? '').trim()).filter(Boolean)));
    for (const item of unique) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item)) {
        throw new BadRequestException(`${label} contains an invalid identifier`);
      }
    }
    return unique;
  }

  private async resolveGradingSystemId(tenantId: string, dto: any): Promise<string | null> {
    const requested = String(dto?.grading_system_id ?? dto?.gradingSystemId ?? dto?.grading_system ?? '').trim();
    if (!requested) {
      return null;
    }

    const result = await this.readSql<{ id: string }>(
      `
        SELECT system.id::text
        FROM academics_grading_systems system
        WHERE system.tenant_id = $1
          AND system.is_active = TRUE
          AND (
            system.id::text = $2
            OR LOWER(system.name) = LOWER($2)
          )
        ORDER BY (system.id::text = $2) DESC, system.updated_at DESC
        LIMIT 1
      `,
      [tenantId, requested],
    );
    const id = String(result.rows[0]?.id ?? '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Choose an active grading system configured for this school.');
    }
    return id;
  }

  private requireExamScopeSelection(dto: any) {
    const subjectIds = this.uniqueUuidArray(dto?.subject_ids ?? dto?.subjectIds, 'Subjects');
    const classSectionIds = this.uniqueUuidArray(
      dto?.class_section_ids ?? dto?.classSectionIds ?? dto?.class_ids ?? dto?.classIds,
      'Classes',
    );
    if (subjectIds.length === 0 || classSectionIds.length === 0) {
      throw new BadRequestException(
        'Choose at least one subject and one class before creating or configuring an exam cycle.',
      );
    }
    return { subjectIds, classSectionIds };
  }

  private positiveNumber(value: unknown, fallback: number, label: string) {
    const numberValue = Number(value ?? fallback);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new BadRequestException(`${label} must be a positive number`);
    }
    return numberValue;
  }

  private async syncExamScope(
    tenantId: string,
    examSeriesId: string,
    dto: any,
    startsOn: string,
    endsOn: string,
  ) {
    const { subjectIds, classSectionIds } = this.requireExamScopeSelection(dto);

    const actorUserId = this.actorUserId();
    if (!actorUserId) {
      throw new BadRequestException('User context is required to configure exam subjects and classes.');
    }

    const maxMarks = this.positiveNumber(dto?.max_marks ?? dto?.maxMarks, 100, 'Max marks');
    const status = this.normalizeStatus(dto?.status);
    const windowStatus = status === 'submitted' ? 'open' : 'closed';

    const assessments = await this.operations.writeSql<{
      id: string;
      subject_id: string;
    }>(
      `
        INSERT INTO exam_assessments (
          tenant_id,
          exam_series_id,
          subject_id,
          name,
          max_score,
          weight,
          created_by_user_id,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2::uuid,
          subject.id::uuid,
          CONCAT(subject.name, ' Main Paper'),
          $4::numeric,
          100,
          $5::uuid,
          NOW(),
          NOW()
        FROM subjects subject
        WHERE subject.tenant_id = $1
          AND subject.id::text = ANY($3::text[])
        ON CONFLICT (tenant_id, exam_series_id, subject_id, name) DO UPDATE
        SET max_score = EXCLUDED.max_score,
            weight = EXCLUDED.weight,
            updated_at = NOW()
        RETURNING id::text, subject_id::text
      `,
      [tenantId, examSeriesId, subjectIds, maxMarks, actorUserId],
    );

    const windows = await this.operations.writeSql<{
      id: string;
      subject_id: string;
      class_section_id: string;
    }>(
      `
        INSERT INTO exam_mark_entry_windows (
          tenant_id,
          exam_series_id,
          subject_id,
          class_section_id,
          opens_at,
          closes_at,
          status,
          last_action,
          last_action_at,
          last_action_by_user_id,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2::uuid,
          subject.id::uuid,
          section.id::uuid,
          CASE WHEN $7 = 'open' THEN LEAST($5::date, NOW()) ELSE $5::date END,
          ($6::date + INTERVAL '1 day' - INTERVAL '1 second'),
          $7,
          CASE WHEN $7 = 'open' THEN 'opened' ELSE 'locked' END,
          NOW(),
          $8::uuid,
          NOW(),
          NOW()
        FROM subjects subject
        CROSS JOIN class_sections section
        WHERE subject.tenant_id = $1
          AND section.tenant_id = $1
          AND subject.id::text = ANY($3::text[])
          AND section.id::text = ANY($4::text[])
          AND LOWER(COALESCE(section.status, 'active')) = 'active'
        ON CONFLICT (tenant_id, exam_series_id, subject_id, class_section_id) DO UPDATE
        SET opens_at = EXCLUDED.opens_at,
            closes_at = EXCLUDED.closes_at,
            status = EXCLUDED.status,
            last_action = EXCLUDED.last_action,
            last_action_at = EXCLUDED.last_action_at,
            last_action_by_user_id = EXCLUDED.last_action_by_user_id,
            updated_at = NOW()
        RETURNING id::text, subject_id::text, class_section_id::text
      `,
      [tenantId, examSeriesId, subjectIds, classSectionIds, startsOn, endsOn, windowStatus, actorUserId],
    );

    return {
      subjectsConfigured: assessments.rowCount,
      markEntryWindowsConfigured: windows.rowCount,
      assessmentsInserted: assessments.rowCount,
    };
  }

  async getExamSetupOptions() {
    const tenantId = this.requireTenantId();
    const [terms, subjects, classes, gradingSystems, staff, examSeries, assessments] = await Promise.all([
      this.readSql(
        `
          SELECT
            id::text,
            CONCAT(name, ' (', to_char(starts_on, 'YYYY-MM-DD'), ' to ', to_char(ends_on, 'YYYY-MM-DD'), ')') AS label,
            status
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC
          LIMIT 24
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT id::text, COALESCE(NULLIF(code, ''), name) AS code, name AS label
          FROM subjects
          WHERE tenant_id = $1
          ORDER BY name ASC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT
            id::text,
            COALESCE(NULLIF(CONCAT_WS(' ', grade_level, stream), ''), name) AS label
          FROM class_sections
          WHERE tenant_id = $1
            AND LOWER(COALESCE(status, 'active')) = 'active'
          ORDER BY grade_level ASC, stream ASC, name ASC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT
            id::text,
            name AS label,
            description,
            CASE WHEN is_active THEN 'active' ELSE 'inactive' END AS status
          FROM academics_grading_systems
          WHERE tenant_id = $1
            AND is_active = TRUE
          ORDER BY name ASC
          LIMIT 80
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT
            id::text,
            user_id::text,
            COALESCE(NULLIF(display_name, ''), staff_number, user_id::text, id::text) AS label,
            staff_number,
            COALESCE(status, 'active') AS status
          FROM staff_profiles
          WHERE tenant_id = $1
            AND user_id IS NOT NULL
            AND COALESCE(status, 'active') = 'active'
          ORDER BY label ASC
          LIMIT 300
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT
            id::text,
            name AS label,
            COALESCE(status, 'draft') AS status
          FROM exam_series
          WHERE tenant_id = $1
            AND LOWER(COALESCE(status, 'draft')) NOT IN ('archived')
          ORDER BY starts_on DESC NULLS LAST, created_at DESC
          LIMIT 80
        `,
        [tenantId],
      ),
      this.readSql(
        `
          SELECT
            assessment.id::text,
            assessment.exam_series_id::text,
            assessment.subject_id::text,
            CONCAT(COALESCE(subject.name, 'Assessment'), ' - ', assessment.name) AS label
          FROM exam_assessments assessment
          LEFT JOIN subjects subject
            ON subject.tenant_id = assessment.tenant_id
           AND subject.id::text = assessment.subject_id::text
          WHERE assessment.tenant_id = $1
          ORDER BY label ASC
          LIMIT 300
        `,
        [tenantId],
      ),
    ]);

    return {
      terms: terms.rows,
      subjects: subjects.rows,
      classes: classes.rows,
      gradingSystems: gradingSystems.rows,
      staff: staff.rows,
      examSeries: examSeries.rows,
      assessments: assessments.rows,
    };
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metricsResult = await this.readSql<{
      active_exams: number;
      pending_moderation: number;
      published_results: number;
      total_report_cards: number;
      overdue_entries: number;
      total_marks: number;
      completed_marks: number;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM exam_series WHERE tenant_id = $1 AND LOWER(COALESCE(status, 'draft')) NOT IN ('archived')) AS active_exams,
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND LOWER(COALESCE(status, '')) IN ('submitted', 'needs_moderation', 'pending_review')) AS pending_moderation,
          (SELECT COUNT(*)::int FROM student_report_cards WHERE tenant_id = $1 AND LOWER(COALESCE(status, '')) = 'published') AS published_results,
          (SELECT COUNT(*)::int FROM student_report_cards WHERE tenant_id = $1) AS total_report_cards,
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND LOWER(COALESCE(status, '')) IN ('overdue')) AS overdue_entries,
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1) AS total_marks,
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND LOWER(COALESCE(status, '')) IN ('submitted', 'reviewed', 'approved', 'locked', 'published')) AS completed_marks
      `,
      [tenantId],
    );

    const row = metricsResult.rows[0] ?? {
      active_exams: 0,
      pending_moderation: 0,
      published_results: 0,
      total_report_cards: 0,
      overdue_entries: 0,
      total_marks: 0,
      completed_marks: 0,
    };
    const totalMarks = Number(row.total_marks ?? 0);
    const completedMarks = Number(row.completed_marks ?? 0);
    const marksCompletion = totalMarks > 0 ? Math.round((completedMarks / totalMarks) * 100) : 0;

    const recent = await this.readSql<{
      id: string;
      name: string;
      term: string;
      status: string;
      total_subjects: number;
      marks_progress: number;
      start_date: string;
    }>(
      `
        SELECT
          series.id::text,
          series.name,
          CONCAT(series.starts_on::text, ' - ', series.ends_on::text) AS term,
          COALESCE(series.status, 'draft') AS status,
          COUNT(DISTINCT mark.subject_id)::int AS total_subjects,
          CASE
            WHEN COUNT(mark.id) = 0 THEN 0
            ELSE ROUND(
              COUNT(mark.id) FILTER (
                WHERE LOWER(COALESCE(mark.status, '')) IN ('submitted', 'reviewed', 'approved', 'locked', 'published')
              )::numeric * 100 / COUNT(mark.id)
            )::int
          END AS marks_progress,
          series.starts_on::text AS start_date
        FROM exam_series series
        LEFT JOIN exam_marks mark
          ON mark.tenant_id = series.tenant_id
         AND mark.exam_series_id = series.id
        WHERE series.tenant_id = $1
        GROUP BY series.id, series.name, series.starts_on, series.ends_on, series.status
        ORDER BY series.starts_on DESC, series.created_at DESC
        LIMIT 12
      `,
      [tenantId],
    );

    return {
      metrics: {
        active_exams: Number(row.active_exams ?? 0),
        pending_moderation: Number(row.pending_moderation ?? 0),
        published_results: Number(row.published_results ?? 0),
        total_report_cards: Number(row.total_report_cards ?? 0),
        marks_completion: marksCompletion,
        overdue_entries: Number(row.overdue_entries ?? 0),
        totalExams: Number(row.active_exams ?? 0),
        pendingMarks: Number(row.pending_moderation ?? 0),
        publishedReports: Number(row.published_results ?? 0),
      },
      recent_exams: recent.rows,
      upcomingExams: recent.rows,
    };
  }

  async getExamSetup() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      name: string;
      term: string;
      year: number;
      type: string;
      max_marks: number;
      grading_system: string;
      grading_system_id: string | null;
      status: string;
      subjects_count: number;
      classes_count: number;
      created_at: string;
      starts_on: string;
      ends_on: string;
    }>(
      `
        SELECT
          series.id::text,
          series.name,
          CONCAT(series.starts_on::text, ' - ', series.ends_on::text) AS term,
          EXTRACT(YEAR FROM series.starts_on)::int AS year,
          'Exam cycle' AS type,
          COALESCE((SELECT MAX(assessment.max_score)::int FROM exam_assessments assessment WHERE assessment.tenant_id = series.tenant_id AND assessment.exam_series_id = series.id), 100) AS max_marks,
          COALESCE(series_grading.name, default_grading.name, 'School grading') AS grading_system,
          COALESCE(series_grading.id::text, default_grading.id::text) AS grading_system_id,
          COALESCE(series.status, 'scheduled') AS status,
          (SELECT COUNT(DISTINCT assessment.subject_id)::int FROM exam_assessments assessment WHERE assessment.tenant_id = series.tenant_id AND assessment.exam_series_id = series.id) AS subjects_count,
          (SELECT COUNT(DISTINCT entry_window.class_section_id)::int FROM exam_mark_entry_windows entry_window WHERE entry_window.tenant_id = series.tenant_id AND entry_window.exam_series_id = series.id) AS classes_count,
          series.created_at::text,
          series.starts_on::text,
          series.ends_on::text
        FROM exam_series series
        LEFT JOIN academics_grading_systems series_grading
          ON series_grading.tenant_id = series.tenant_id
         AND series_grading.id::text = NULLIF(to_jsonb(series)->>'grading_system_id', '')
         AND series_grading.is_active = TRUE
        LEFT JOIN LATERAL (
          SELECT system.id, system.name
          FROM academics_report_card_settings settings
          JOIN academics_grading_systems system
            ON system.tenant_id = settings.tenant_id
           AND system.id::text = settings.grading_system_id::text
           AND system.is_active = TRUE
          WHERE settings.tenant_id = series.tenant_id
            AND settings.is_active = TRUE
          ORDER BY settings.updated_at DESC, settings.created_at DESC
          LIMIT 1
        ) default_grading ON TRUE
        WHERE series.tenant_id = $1
        ORDER BY series.starts_on DESC, series.created_at DESC
      `,
      [tenantId],
    );

    const exams = result.rows;
    return {
      metrics: {
        total_exams: exams.length,
        active_exams: exams.filter((exam) => ['submitted', 'reviewed', 'locked'].includes(String(exam.status).toLowerCase())).length,
        draft_exams: exams.filter((exam) => String(exam.status).toLowerCase() === 'draft').length,
        completed_exams: exams.filter((exam) => ['published', 'archived'].includes(String(exam.status).toLowerCase())).length,
      },
      exams,
    };
  }

  async createExamSetup(dto: any) {
    const tenantId = this.requireTenantId();
    const name = this.operations.requiredText(dto?.name, 'Exam name');
    const startsOn = this.requireDate(dto?.starts_on ?? dto?.startsOn, 'Start date');
    const endsOn = this.requireDate(dto?.ends_on ?? dto?.endsOn, 'End date');
    const status = this.normalizeStatus(dto?.status);

    if (new Date(endsOn) < new Date(startsOn)) {
      throw new BadRequestException('End date cannot be before start date');
    }
    this.requireExamScopeSelection(dto);

    const gradingSystemId = await this.resolveGradingSystemId(tenantId, dto);
    const columns = await this.examSeriesColumns();
    const supportsAcademicTerm = columns.has('academic_term_id');
    const supportsCreatedBy = columns.has('created_by_user_id');
    const insertColumns = ['tenant_id', 'name', 'starts_on', 'ends_on', 'status'];
    const placeholders = ['$1', '$2', '$3::date', '$4::date', '$5'];
    const params: any[] = [tenantId, name, startsOn, endsOn, status];

    if (supportsAcademicTerm) {
      const academicTermId = dto?.academic_term_id ?? await this.activeAcademicTermId(tenantId, startsOn);
      if (!academicTermId) {
        throw new BadRequestException('Create or activate an academic term before creating an exam cycle.');
      }
      insertColumns.splice(1, 0, 'academic_term_id');
      params.splice(1, 0, academicTermId);
      placeholders.splice(1, 0, '$2::uuid');
      for (let index = 2; index < placeholders.length; index += 1) {
        placeholders[index] = `$${index + 1}${placeholders[index].includes('::') ? placeholders[index].slice(placeholders[index].indexOf('::')) : ''}`;
      }
    }

    if (supportsCreatedBy) {
      const actorUserId = this.actorUserId();
      if (!actorUserId) {
        throw new BadRequestException('User context is required to create an exam cycle.');
      }
      insertColumns.push('created_by_user_id');
      params.push(actorUserId);
      placeholders.push(`$${params.length}::uuid`);
    }

    if (gradingSystemId && columns.has('grading_system_id')) {
      insertColumns.push('grading_system_id');
      params.push(gradingSystemId);
      placeholders.push(`$${params.length}::uuid`);
    }

    if (columns.has('created_at')) {
      insertColumns.push('created_at');
      placeholders.push('NOW()');
    }
    if (columns.has('updated_at')) {
      insertColumns.push('updated_at');
      placeholders.push('NOW()');
    }

    const created = await this.operations.writeSql<{
      id: string;
      name: string;
      starts_on: string;
      ends_on: string;
      status: string;
      created_at: string;
    }>(
      `
        INSERT INTO exam_series (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id::text, name, starts_on::text, ends_on::text, COALESCE(status, 'draft') AS status, created_at::text
      `,
      params,
    );

    const exam = created.rows[0];
    if (!exam) {
      throw new BadRequestException('The exam cycle could not be created for this school.');
    }
    const scope = exam?.id
      ? await this.syncExamScope(tenantId, exam.id, dto, startsOn, endsOn)
      : { subjectsConfigured: 0, markEntryWindowsConfigured: 0 };
    await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'hod', 'teacher'],
      eventType: 'exams.exam-setup.created',
      entityType: 'exam_series',
      entityId: exam?.id ?? null,
      title: 'Exams: Exam Setup Created',
      message: `${name} created for ${startsOn} to ${endsOn}`,
      priority: 'normal',
      payload: { exam_series_id: exam.id, name, starts_on: startsOn, ends_on: endsOn, status, grading_system_id: gradingSystemId, ...scope },
    });
    await this.emitExamSetupOperation({
      operation: 'created',
      exam,
      name,
      startsOn,
      endsOn,
      status,
      scope,
    });

    return {
      success: true,
      message: 'Exam created successfully',
      exam,
      scope,
    };
  }

  async configureExamSetup(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const name = this.operations.requiredText(dto?.name, 'Exam name');
    const startsOn = this.requireDate(dto?.starts_on ?? dto?.startsOn, 'Start date');
    const endsOn = this.requireDate(dto?.ends_on ?? dto?.endsOn, 'End date');
    const status = this.normalizeStatus(dto?.status);

    if (new Date(endsOn) < new Date(startsOn)) {
      throw new BadRequestException('End date cannot be before start date');
    }
    this.requireExamScopeSelection(dto);

    const gradingSystemId = await this.resolveGradingSystemId(tenantId, dto);
    const gradingSystemUpdate = gradingSystemId ? ', grading_system_id = $7::uuid' : '';
    const updateParams: unknown[] = [tenantId, id, name, startsOn, endsOn, status];
    if (gradingSystemId) updateParams.push(gradingSystemId);

    const updated = await this.operations.writeSql<{
      id: string;
      name: string;
      starts_on: string;
      ends_on: string;
      status: string;
      updated_at: string;
    }>(
      `
        UPDATE exam_series
        SET name = $3,
            starts_on = $4::date,
            ends_on = $5::date,
            status = $6
            ${gradingSystemUpdate},
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, name, starts_on::text, ends_on::text, COALESCE(status, 'draft') AS status, updated_at::text
      `,
      updateParams,
    );

    if (updated.rowCount === 0) {
      throw new BadRequestException('Exam cycle was not found for this school.');
    }

    const exam = updated.rows[0];
    const scope = await this.syncExamScope(tenantId, id, dto, startsOn, endsOn);
    await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'hod', 'teacher'],
      eventType: 'exams.exam-setup.configured',
      entityType: 'exam_series',
      entityId: id,
      title: 'Exams: Exam Setup Configured',
      message: `${name} configured for ${startsOn} to ${endsOn}`,
      priority: 'normal',
      payload: { name, starts_on: startsOn, ends_on: endsOn, status, grading_system_id: gradingSystemId, ...scope },
    });
    await this.emitExamSetupOperation({
      operation: 'configured',
      exam,
      name,
      startsOn,
      endsOn,
      status,
      scope,
    });

    return {
      success: true,
      message: 'Exam configured successfully',
      exam,
      scope,
    };
  }

  async getExamTimetable() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      exam_name: string;
      subject: string;
      class_name: string;
      date: string;
      start_time: string;
      end_time: string;
      venue: string;
      invigilator: string;
      status: string;
    }>(
      `
        SELECT
          slot.id::text,
          COALESCE(series.name, 'Unlinked exam') AS exam_name,
          COALESCE(assessment.name, slot.assessment_id::text) AS subject,
          'All assigned learners' AS class_name,
          slot.date::text,
          slot.start_time::text,
          slot.end_time::text,
          COALESCE(slot.room_name, 'Not assigned') AS venue,
          COALESCE(
            NULLIF(
              STRING_AGG(
                DISTINCT COALESCE(NULLIF(staff.display_name, ''), staff.staff_number, invigilator.staff_user_id::text),
                ', '
              ) FILTER (WHERE invigilator.id IS NOT NULL),
              ''
            ),
            'Not assigned'
          ) AS invigilator,
          INITCAP(REPLACE(COALESCE(slot.status, 'scheduled'), '_', ' ')) AS status
        FROM exam_timetable_slots slot
        LEFT JOIN exam_series series
          ON series.tenant_id = slot.tenant_id
         AND series.id::text = slot.exam_series_id::text
        LEFT JOIN exam_assessments assessment
          ON assessment.tenant_id = slot.tenant_id
         AND assessment.id::text = slot.assessment_id::text
        LEFT JOIN exam_invigilators invigilator
          ON invigilator.tenant_id = slot.tenant_id
         AND invigilator.timetable_slot_id::text = slot.id::text
         AND LOWER(COALESCE(invigilator.status, 'assigned')) = 'assigned'
        LEFT JOIN staff_profiles staff
          ON staff.tenant_id = slot.tenant_id
         AND staff.user_id::text = invigilator.staff_user_id::text
        WHERE slot.tenant_id = $1
        GROUP BY slot.id, series.name, assessment.name, slot.assessment_id, slot.date, slot.start_time, slot.end_time, slot.room_name, slot.status
        ORDER BY slot.date ASC, slot.start_time ASC
      `,
      [tenantId],
    );

    const slots = result.rows;
    return {
      metrics: {
        total_slots: slots.length,
        scheduled: slots.filter((slot) => String(slot.status).toLowerCase() === 'scheduled').length,
        in_progress: slots.filter((slot) => String(slot.status).toLowerCase() === 'in_progress').length,
        completed: slots.filter((slot) => String(slot.status).toLowerCase() === 'completed').length,
      },
      slots,
    };
  }

  async createExamTimetableSlot(dto: any) {
    const tenantId = this.requireTenantId();
    const examSeriesId = this.operations.requiredText(dto?.exam_series_id ?? dto?.examSeriesId, 'Exam cycle');
    const assessmentId = this.optionalText(dto?.assessment_id ?? dto?.assessmentId);
    const date = this.requireDate(dto?.date, 'Exam date');
    const startTime = this.requireTime(dto?.start_time ?? dto?.startTime, 'Start time');
    const endTime = this.requireTime(dto?.end_time ?? dto?.endTime, 'End time');
    const roomName = this.operations.requiredText(dto?.room_name ?? dto?.roomName, 'Room or venue');
    const staffUserId = this.optionalText(dto?.staff_user_id ?? dto?.staffUserId);
    const invigilatorRole = this.optionalText(dto?.invigilator_role ?? dto?.invigilatorRole) ?? 'invigilator';

    if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    const created = await this.operations.writeSql<{
      id: string;
      exam_series_id: string;
      assessment_id: string | null;
      date: string;
      start_time: string;
      end_time: string;
      room_name: string;
      status: string;
    }>(
      `
        INSERT INTO exam_timetable_slots (tenant_id, exam_series_id, assessment_id, date, start_time, end_time, room_name, status)
        VALUES ($1, $2::uuid, $3::uuid, $4::date, $5::time, $6::time, $7, 'scheduled')
        RETURNING
          id::text,
          exam_series_id::text,
          assessment_id::text,
          date::text,
          start_time::text,
          end_time::text,
          COALESCE(room_name, 'Not assigned') AS room_name,
          COALESCE(status, 'scheduled') AS status
      `,
      [tenantId, examSeriesId, assessmentId, date, startTime, endTime, roomName],
    );

    if (created.rowCount === 0 || !created.rows[0]?.id) {
      throw new BadRequestException('Timetable slot could not be scheduled.');
    }

    const slot = created.rows[0];
    let invigilator: any = null;

    if (staffUserId) {
      const assigned = await this.operations.writeSql<{
        id: string;
        staff_user_id: string;
        role: string;
        status: string;
      }>(
        `
          INSERT INTO exam_invigilators (tenant_id, timetable_slot_id, staff_user_id, role, status)
          VALUES ($1, $2::uuid, $3::uuid, $4, 'assigned')
          ON CONFLICT (tenant_id, timetable_slot_id, staff_user_id)
          DO UPDATE SET
            role = EXCLUDED.role,
            status = 'assigned',
            updated_at = NOW()
          RETURNING id::text, staff_user_id::text, role, status
        `,
        [tenantId, slot.id, staffUserId, invigilatorRole],
      );

      invigilator = assigned.rows[0] ?? null;
    }

    await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'hod', 'teacher'],
      eventType: 'exams.exam-timetable.created',
      entityType: 'exam_timetable_slot',
      entityId: slot.id,
      title: 'Exams: Timetable Slot Created',
      message: `${date} ${startTime}-${endTime} in ${roomName}`,
      priority: 'normal',
      payload: {
        exam_series_id: examSeriesId,
        assessment_id: assessmentId,
        date,
        start_time: startTime,
        end_time: endTime,
        room_name: roomName,
        staff_user_id: staffUserId,
        invigilator_role: invigilatorRole,
      },
    });

    return {
      success: true,
      message: 'Timetable slot scheduled successfully',
      slot,
      invigilator,
    };
  }

  async getTeacherMarkProgress() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<TeacherMarkProgress>(TEACHER_MARK_PROGRESS_SQL, [tenantId]);
    return { entries: result.rows };
  }

  async getMarksEntry() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      exam_name: string;
      subject: string;
      class_name: string;
      teacher: string;
      total_students: number;
      entered: number;
      missing: number;
      status: string;
      deadline: string;
    }>(
      `
        SELECT
          mark_window.id::text AS id,
          series.name AS exam_name,
          COALESCE(subject.name, mark_window.subject_id::text) AS subject,
          COALESCE(class_section.name, mark_window.class_section_id::text) AS class_name,
          COALESCE(teacher_assignments.teacher_names, 'Unassigned') AS teacher,
          COALESCE(student_counts.expected_count, 0)::int AS total_students,
          COUNT(DISTINCT mark.student_id) FILTER (
            WHERE COALESCE(mark.score_status, CASE WHEN mark.score IS NOT NULL THEN 'entered' END) = 'entered'
          )::int AS entered,
          GREATEST(
            COALESCE(student_counts.expected_count, 0)
            - COUNT(DISTINCT mark.student_id) FILTER (
                WHERE COALESCE(mark.score_status, CASE WHEN mark.score IS NOT NULL THEN 'entered' END) = 'entered'
              ),
            0
          )::int AS missing,
          CASE
            WHEN LOWER(COALESCE(series.status, 'draft')) = 'draft' THEN 'Draft'
            WHEN mark_window.status = 'closed' THEN 'Locked'
            WHEN mark_window.closes_at < NOW() THEN 'Overdue'
            WHEN COALESCE(student_counts.expected_count, 0) > 0
             AND COUNT(DISTINCT mark.student_id) FILTER (
                   WHERE mark.status IN ('submitted', 'reviewed', 'locked', 'published')
                     AND COALESCE(mark.score_status, CASE WHEN mark.score IS NOT NULL THEN 'entered' END) = 'entered'
                 ) >= COALESCE(student_counts.expected_count, 0) THEN 'Completed'
            WHEN COUNT(DISTINCT mark.student_id) FILTER (
                   WHERE COALESCE(mark.score_status, CASE WHEN mark.score IS NOT NULL THEN 'entered' END) = 'entered'
                 ) > 0 THEN 'In_progress'
            ELSE 'Pending'
          END AS status,
          mark_window.closes_at::text AS deadline
        FROM exam_mark_entry_windows mark_window
        JOIN exam_series series
          ON series.tenant_id = mark_window.tenant_id
         AND series.id = mark_window.exam_series_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark_window.tenant_id
         AND subject.id::text = mark_window.subject_id::text
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = mark_window.tenant_id
         AND class_section.id::text = mark_window.class_section_id::text
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM students student
          WHERE student.tenant_id = mark_window.tenant_id
            AND student.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM student_class_assignments class_assignment
              WHERE class_assignment.tenant_id = student.tenant_id
                AND class_assignment.student_id = student.id::text
                AND class_assignment.class_section_id = mark_window.class_section_id::text
                AND class_assignment.status = 'active'
            )
            AND EXISTS (
              SELECT 1
              FROM student_subject_enrollments subject_enrollment
              WHERE subject_enrollment.tenant_id = student.tenant_id
                AND subject_enrollment.student_id = student.id::text
                AND subject_enrollment.class_section_id = mark_window.class_section_id::text
                AND subject_enrollment.subject_id = mark_window.subject_id::text
                AND subject_enrollment.status = 'active'
            )
        ) student_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT STRING_AGG(
            DISTINCT COALESCE(NULLIF(staff.display_name, ''), staff.staff_number, assignment.teacher_user_id::text),
            ', '
          ) AS teacher_names
          FROM teacher_subject_assignments assignment
          LEFT JOIN staff_profiles staff
            ON staff.tenant_id = assignment.tenant_id
           AND staff.user_id::text = assignment.teacher_user_id::text
          WHERE assignment.tenant_id = mark_window.tenant_id
            AND (assignment.academic_term_id IS NULL OR assignment.academic_term_id = series.academic_term_id::text)
            AND assignment.class_section_id = mark_window.class_section_id::text
            AND assignment.subject_id = mark_window.subject_id::text
            AND assignment.status = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        ) teacher_assignments ON TRUE
        LEFT JOIN exam_marks mark
          ON mark.tenant_id = mark_window.tenant_id
         AND mark.exam_series_id = mark_window.exam_series_id
         AND mark.subject_id = mark_window.subject_id
         AND mark.class_section_id = mark_window.class_section_id
        WHERE mark_window.tenant_id = $1
        GROUP BY
          mark_window.id,
          mark_window.subject_id,
          mark_window.class_section_id,
          mark_window.status,
          mark_window.closes_at,
          series.name,
          series.status,
          subject.name,
          class_section.name,
          teacher_assignments.teacher_names,
          student_counts.expected_count
        ORDER BY mark_window.closes_at DESC, series.name, subject.name, class_section.name
      `,
      [tenantId],
    );

    const entries = result.rows;
    const totalEntries = entries.length;
    const completed = entries.filter((entry) => String(entry.status).toLowerCase() === 'completed').length;
    const pending = entries.filter((entry) => String(entry.status).toLowerCase() === 'pending').length;
    const overdue = entries.filter((entry) => String(entry.status).toLowerCase() === 'overdue').length;

    return {
      metrics: {
        total_entries: totalEntries,
        completed,
        pending,
        overdue,
        completion_rate: totalEntries > 0 ? Math.round((completed / totalEntries) * 100) : 0,
      },
      entries,
    };
  }

  async lockMarksEntry(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.actorUserId();
    const result = await this.operations.writeSql(
      `
        WITH locked_window AS (
          UPDATE exam_mark_entry_windows
          SET status = 'closed',
              last_action = 'locked',
              last_action_at = NOW(),
              last_action_by_user_id = $3::uuid,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
          RETURNING id, tenant_id, exam_series_id, subject_id, class_section_id, status
        ), locked_marks AS (
          UPDATE exam_marks mark
          SET status = 'locked',
              locked_at = COALESCE(mark.locked_at, NOW()),
              updated_at = NOW()
          FROM locked_window mark_window
          WHERE mark.tenant_id = mark_window.tenant_id
            AND mark.exam_series_id = mark_window.exam_series_id
            AND mark.subject_id = mark_window.subject_id
            AND mark.class_section_id = mark_window.class_section_id
          RETURNING mark.id
        )
        SELECT
          mark_window.id::text,
          mark_window.status,
          (SELECT COUNT(*)::int FROM locked_marks) AS marks_locked
        FROM locked_window mark_window
      `,
      [tenantId, id, actorUserId],
    );

    if (result.rowCount === 0) {
      throw new BadRequestException('No matching mark-entry window was found for this school.');
    }

    const entry = result.rows[0] as { marks_locked?: number } | undefined;
    await this.recordExamAction(
      'marks-entry.locked',
      { ...dto, status: 'locked', marks_locked: Number(entry?.marks_locked ?? 0) },
      id,
    );
    return {
      success: true,
      message: 'Marks entry window locked',
      entry: entry ?? null,
    };
  }

  async getModeration() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      exam_name: string;
      subject: string;
      class_name: string;
      teacher: string;
      original_mean: number;
      moderated_mean: number;
      variance: number;
      students_affected: number;
      status: string;
      submitted_at: string;
    }>(
      `
        SELECT
          mark.id::text,
          COALESCE(series.name, 'Unlinked exam') AS exam_name,
          mark.subject_id::text AS subject,
          mark.class_section_id::text AS class_name,
          'Submitted teacher' AS teacher,
          mark.score::numeric AS original_mean,
          mark.score::numeric AS moderated_mean,
          0::numeric AS variance,
          1::int AS students_affected,
          COALESCE(mark.status, 'submitted') AS status,
          mark.created_at::text AS submitted_at
        FROM exam_marks mark
        LEFT JOIN exam_series series
          ON series.tenant_id = mark.tenant_id
         AND series.id = mark.exam_series_id
        WHERE mark.tenant_id = $1
          AND LOWER(COALESCE(mark.status, '')) IN ('submitted', 'needs_moderation', 'pending_review')
        ORDER BY mark.created_at DESC
      `,
      [tenantId],
    );

    const submissions = result.rows;
    return {
      metrics: {
        total_submissions: submissions.length,
        pending_review: submissions.filter((item) => ['submitted', 'needs_moderation', 'pending_review'].includes(String(item.status).toLowerCase())).length,
        approved: submissions.filter((item) => String(item.status).toLowerCase() === 'approved').length,
        rejected: submissions.filter((item) => String(item.status).toLowerCase() === 'rejected').length,
      },
      submissions,
    };
  }

  async approveModeration(id: string, dto: any = {}) {
    return this.updateMarkStatus(id, 'reviewed', 'moderation.approved', dto);
  }

  async rejectModeration(id: string, dto: any = {}) {
    return this.updateMarkStatus(id, 'draft', 'moderation.rejected', dto);
  }

  private async updateMarkStatus(id: string, status: string, action: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const reason = String(dto?.reason ?? dto?.notes ?? '').trim();
    const result = await this.operations.writeSql(
      `
        UPDATE exam_marks
        SET status = $3,
            reviewed_at = CASE
              WHEN $3 = 'reviewed' THEN COALESCE(reviewed_at, NOW())
              ELSE reviewed_at
            END,
            remarks = COALESCE(NULLIF($4, ''), remarks),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND LOWER(COALESCE(status, '')) IN ('submitted', 'reviewed', 'pending_review', 'needs_moderation')
        RETURNING id::text, status
      `,
      [tenantId, id, status, reason],
    );

    if (result.rowCount === 0) {
      throw new BadRequestException('No matching marks entry was found in this school moderation queue.');
    }

    await this.recordExamAction(action, { ...dto, status }, id);
    return {
      success: true,
      message: status === 'reviewed' ? 'Marks approved for report-card generation' : 'Marks returned to draft for teacher correction',
      entry: result.rows[0] ?? null,
    };
  }

  async getPublishing() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      exam_name: string;
      class: string;
      term: string;
      students: number;
      published_at: string;
      status: string;
    }>(
      `
        SELECT
          series.id::text,
          series.name AS exam_name,
          'All classes' AS class,
          CONCAT(series.starts_on::text, ' - ', series.ends_on::text) AS term,
          COUNT(card.id)::int AS students,
          COALESCE(series.published_at::text, MAX(card.published_at)::text, '') AS published_at,
          COALESCE(series.status, 'draft') AS status
        FROM exam_series series
        LEFT JOIN student_report_cards card
          ON card.tenant_id = series.tenant_id
         AND card.exam_series_id = series.id
        WHERE series.tenant_id = $1
          AND (
            LOWER(COALESCE(series.status, '')) IN ('locked', 'published')
            OR LOWER(COALESCE(card.status, '')) IN ('approved', 'published')
          )
        GROUP BY series.id, series.name, series.starts_on, series.ends_on, series.status, series.published_at
        ORDER BY series.updated_at DESC
      `,
      [tenantId],
    );

    const publishingList = result.rows;
    return {
      metrics: {
        pending_publish: publishingList.filter((row) => ['locked', 'reviewed'].includes(String(row.status).toLowerCase())).length,
        published: publishingList.filter((row) => String(row.status).toLowerCase() === 'published').length,
        draft: publishingList.filter((row) => String(row.status).toLowerCase() === 'draft').length,
      },
      publishingList,
    };
  }

  async getReportCards() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      student_name: string;
      class: string;
      term: string;
      exam: string;
      total_marks: number;
      position: number;
      status: string;
    }>(
      `
        SELECT
          card.id::text,
          card.student_id::text AS student_name,
          'Class not linked' AS class,
          COALESCE(series.starts_on::text, '') AS term,
          COALESCE(series.name, 'Unlinked exam') AS exam,
          0::numeric AS total_marks,
          0::int AS position,
          COALESCE(card.status, 'draft') AS status
        FROM student_report_cards card
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        WHERE card.tenant_id = $1
        ORDER BY card.created_at DESC
      `,
      [tenantId],
    );

    const reportcardsList = result.rows;
    return {
      metrics: {
        generated: reportcardsList.length,
        pending: reportcardsList.filter((card) => String(card.status).toLowerCase() !== 'published').length,
        downloaded: reportcardsList.filter((card) => String(card.status).toLowerCase() === 'downloaded').length,
      },
      reportcardsList,
    };
  }

  async generateReportCards(id: string, dto: any = {}) {
    const generated = await this.requireExamsService().generateReportCardBatch({
      exam_series_id: id,
      ...(dto?.class_section_id ? { class_section_id: String(dto.class_section_id) } : {}),
      ...(dto?.stream_name ? { stream_name: String(dto.stream_name) } : {}),
      ...(dto?.batch_size ? { batch_size: Number(dto.batch_size) } : {}),
    });
    const generatedCount = Number(generated.completed_students ?? 0);
    if (generatedCount === 0) {
      throw new BadRequestException('No eligible students with locked marks are ready for report-card generation.');
    }

    await this.recordExamAction('report-card.generated', { ...dto, generated_count: generatedCount }, id);
    return {
      success: true,
      message: `${generatedCount} report card${generatedCount === 1 ? '' : 's'} generated as drafts`,
      generated_count: generatedCount,
      batch: generated,
    };
  }

  async publishResults(id: string, dto: any = {}) {
    const published = await this.requireExamsService().publishExamSeries(id);
    const publishedCount = Number(published.published_report_cards_count ?? 0);

    return {
      success: true,
      message: `${publishedCount} approved report card${publishedCount === 1 ? '' : 's'} published`,
      published_count: publishedCount,
      release: published,
    };
  }

  async unpublishResults(id: string, dto: any = {}) {
    const reason = this.operations.requiredText(dto?.reason ?? dto?.notes, 'Unpublish reason');
    const unpublished = await this.requireExamsService().unpublishExamSeries(id, reason);
    const unpublishedCount = Number(unpublished.withdrawn_report_cards_count ?? 0);

    return {
      success: true,
      message: `${unpublishedCount} published report card${unpublishedCount === 1 ? '' : 's'} withdrawn`,
      unpublished_count: unpublishedCount,
      withdrawal: unpublished,
    };
  }

  private requireExamsService(): ExamsService {
    if (!this.examsService) {
      throw new BadRequestException('The governed exams lifecycle service is unavailable.');
    }
    return this.examsService;
  }

  async getAnalysis() {
    const tenantId = this.requireTenantId();
    const result = await this.readSql<{
      id: string;
      exam_name: string;
      class: string;
      mean_score: number;
      highest: number;
      lowest: number;
      pass_rate: string;
      status: string;
    }>(
      `
        SELECT
          CONCAT(mark.exam_series_id::text, '-', mark.class_section_id::text) AS id,
          COALESCE(series.name, 'Unlinked exam') AS exam_name,
          mark.class_section_id::text AS class,
          ROUND(AVG(mark.score)::numeric, 2)::numeric AS mean_score,
          MAX(mark.score)::numeric AS highest,
          MIN(mark.score)::numeric AS lowest,
          CASE
            WHEN COUNT(mark.id) = 0 THEN '0%'
            ELSE CONCAT(ROUND(COUNT(mark.id) FILTER (WHERE mark.score >= 50)::numeric * 100 / COUNT(mark.id)), '%')
          END AS pass_rate,
          'Available' AS status
        FROM exam_marks mark
        LEFT JOIN exam_series series
          ON series.tenant_id = mark.tenant_id
         AND series.id = mark.exam_series_id
        WHERE mark.tenant_id = $1
        GROUP BY mark.exam_series_id, mark.class_section_id, series.name
        ORDER BY series.name ASC
      `,
      [tenantId],
    );

    const analysisList = result.rows;
    const meanScore = analysisList.length > 0
      ? Math.round(analysisList.reduce((sum, row) => sum + Number(row.mean_score ?? 0), 0) / analysisList.length)
      : 0;

    return {
      metrics: {
        exams_analyzed: analysisList.length,
        mean_score: meanScore,
        pass_rate: 0,
        top_subject: 0,
      },
      analysisList,
    };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const reports = await this.operations.listReportSnapshots(tenantId, 'exams-manager-command');
    return {
      metrics: {
        reports_generated: reports.length,
      },
      reportsList: reports.map((report: any) => ({
        id: report.id ?? report.snapshotId,
        title: report.reportName ?? report.title ?? 'Exam report',
        generated_at: report.generatedDate ?? report.generated_at ?? '',
        type: report.type ?? 'pdf',
        status: report.status ?? 'Ready',
      })),
    };
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.actorUserId();
    const [overview, examSetup, examTimetable, marksEntry, moderation, publishing, reportCards, analysis] = await Promise.all([
      this.getOverview(),
      this.getExamSetup(),
      this.getExamTimetable(),
      this.getMarksEntry(),
      this.getModeration(),
      this.getPublishing(),
      this.getReportCards(),
      this.getAnalysis(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'exams-manager-command',
      reportId: 'exams-operations',
      title: String(dto?.name || dto?.title || 'Exams operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, examSetup, examTimetable, marksEntry, moderation, publishing, reportCards, analysis },
      filters: { requested_from: 'exams-manager-dashboard' },
      targetRoles: ['principal', 'dean_academics', 'exams_manager'],
    });
  }

  async requestZerakiSync(dto: any = {}) {
    const tenantId = this.requireTenantId();
    await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'system_monitor'],
      eventType: 'exams.zeraki-sync.unconfigured',
      entityType: 'exam_import_provider',
      entityId: null,
      title: 'Exams: Zeraki Live Sync Not Configured',
      message: 'Use Imports & Templates to download CSV templates, preview rows, and commit validated mark imports.',
      priority: 'normal',
      payload: {
        provider: 'zeraki',
        status: 'not_configured',
        requested_action: dto?.requested_action ?? 'zeraki_sync',
        source_dashboard: dto?.source_dashboard ?? 'exams-manager',
      },
    });

    throw new BadRequestException('Zeraki live sync is not configured for this school. Use Imports & Templates to download a CSV template, preview rows, and commit a tenant-scoped marks import.');
  }

  async recordExamAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    const eventType = `exams.${action}`;
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'hod', 'teacher'],
      eventType,
      entityType: 'exam_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title: this.titleForAction('Exams', action),
      message: dto?.reason ?? dto?.notes ?? dto?.title ?? null,
      priority: ['publish', 'unpublish', 'reject'].some((part) => action.includes(part)) ? 'high' : 'normal',
      payload: { action, ...dto },
    });
  }

  private titleForAction(prefix: string, action: string) {
    return `${prefix}: ${action.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`;
  }
}
