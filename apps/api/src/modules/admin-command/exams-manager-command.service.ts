import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

type SqlResult<T> = { rows: T[]; rowCount: number };

@Injectable()
export class ExamsManagerCommandService {
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

  private actorUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private async readSql<T = any>(query: string, params: any[] = []): Promise<SqlResult<T>> {
    return this.operations.readSql<T>(query, params);
  }

  private normalizeStatus(value: unknown, fallback = 'scheduled') {
    const status = String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_');
    const allowed = new Set(['draft', 'scheduled', 'active', 'completed', 'published', 'cancelled']);
    return allowed.has(status) ? status : fallback;
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
          (SELECT COUNT(*)::int FROM exam_series WHERE tenant_id = $1 AND LOWER(COALESCE(status, 'scheduled')) NOT IN ('archived', 'cancelled')) AS active_exams,
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
          COALESCE(series.status, 'scheduled') AS status,
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
          100 AS max_marks,
          'School grading' AS grading_system,
          COALESCE(series.status, 'scheduled') AS status,
          (SELECT COUNT(DISTINCT mark.subject_id)::int FROM exam_marks mark WHERE mark.tenant_id = series.tenant_id AND mark.exam_series_id = series.id) AS subjects_count,
          (SELECT COUNT(DISTINCT mark.class_section_id)::int FROM exam_marks mark WHERE mark.tenant_id = series.tenant_id AND mark.exam_series_id = series.id) AS classes_count,
          series.created_at::text,
          series.starts_on::text,
          series.ends_on::text
        FROM exam_series series
        WHERE series.tenant_id = $1
        ORDER BY series.starts_on DESC, series.created_at DESC
      `,
      [tenantId],
    );

    const exams = result.rows;
    return {
      metrics: {
        total_exams: exams.length,
        active_exams: exams.filter((exam) => ['active', 'scheduled'].includes(String(exam.status).toLowerCase())).length,
        draft_exams: exams.filter((exam) => String(exam.status).toLowerCase() === 'draft').length,
        completed_exams: exams.filter((exam) => ['completed', 'published'].includes(String(exam.status).toLowerCase())).length,
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

    const columns = await this.examSeriesColumns();
    const supportsAcademicTerm = columns.has('academic_term_id');
    const supportsCreatedBy = columns.has('created_by_user_id');
    const insertColumns = ['tenant_id', 'name', 'starts_on', 'ends_on', 'status'];
    const placeholders = ['$1::uuid', '$2', '$3::date', '$4::date', '$5'];
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
        RETURNING id::text, name, starts_on::text, ends_on::text, COALESCE(status, 'scheduled') AS status, created_at::text
      `,
      params,
    );

    const exam = created.rows[0];
    await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.actorUserId(),
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'teacher'],
      eventType: 'exams.exam-setup.created',
      entityType: 'exam_series',
      entityId: exam?.id ?? null,
      title: 'Exams: Exam Setup Created',
      message: `${name} created for ${startsOn} to ${endsOn}`,
      priority: 'normal',
      payload: { name, starts_on: startsOn, ends_on: endsOn, status },
    });

    return {
      success: true,
      message: 'Exam created successfully',
      exam,
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
          'Not assigned' AS invigilator,
          'Scheduled' AS status
        FROM exam_timetable_slots slot
        LEFT JOIN exam_series series
          ON series.tenant_id = slot.tenant_id
         AND series.id = slot.exam_series_id
        LEFT JOIN exam_assessments assessment
          ON assessment.tenant_id = slot.tenant_id
         AND assessment.id = slot.assessment_id
        WHERE slot.tenant_id = $1
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
          MIN(mark.id)::text AS id,
          COALESCE(series.name, 'Unlinked exam') AS exam_name,
          mark.subject_id::text AS subject,
          mark.class_section_id::text AS class_name,
          'Assigned teacher' AS teacher,
          COUNT(DISTINCT mark.student_id)::int AS total_students,
          COUNT(mark.id)::int AS entered,
          COUNT(mark.id) FILTER (WHERE LOWER(COALESCE(mark.status, 'draft')) IN ('draft', 'pending', 'overdue'))::int AS missing,
          CASE
            WHEN BOOL_AND(LOWER(COALESCE(mark.status, '')) = 'locked') THEN 'Locked'
            WHEN COUNT(mark.id) FILTER (WHERE LOWER(COALESCE(mark.status, 'draft')) IN ('draft', 'pending', 'overdue')) > 0 THEN 'Pending'
            ELSE 'Completed'
          END AS status,
          COALESCE(series.ends_on::text, '') AS deadline
        FROM exam_marks mark
        LEFT JOIN exam_series series
          ON series.tenant_id = mark.tenant_id
         AND series.id = mark.exam_series_id
        WHERE mark.tenant_id = $1
        GROUP BY series.name, series.ends_on, mark.exam_series_id, mark.subject_id, mark.class_section_id
        ORDER BY COALESCE(series.ends_on, NOW()::date) DESC
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
    const result = await this.operations.writeSql(
      `
        UPDATE exam_marks
        SET status = 'locked', locked_at = COALESCE(locked_at, NOW()), updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, status
      `,
      [tenantId, id],
    );

    await this.recordExamAction('marks-entry.locked', { ...dto, status: 'locked' }, id);
    return {
      success: true,
      message: result.rowCount > 0 ? 'Marks entry locked' : 'No matching marks entry found for this tenant',
      entry: result.rows[0] ?? null,
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
    return this.updateMarkStatus(id, 'approved', 'moderation.approved', dto);
  }

  async rejectModeration(id: string, dto: any = {}) {
    return this.updateMarkStatus(id, 'rejected', 'moderation.rejected', dto);
  }

  private async updateMarkStatus(id: string, status: string, action: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `
        UPDATE exam_marks
        SET status = $3, reviewed_at = COALESCE(reviewed_at, NOW()), updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, status
      `,
      [tenantId, id, status],
    );

    await this.recordExamAction(action, { ...dto, status }, id);
    return {
      success: true,
      message: result.rowCount > 0 ? `Marks ${status}` : 'No matching marks entry found for this tenant',
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
          0::int AS students,
          '' AS published_at,
          COALESCE(series.status, 'draft') AS status
        FROM exam_series series
        WHERE series.tenant_id = $1
          AND LOWER(COALESCE(series.status, '')) IN ('ready_to_publish', 'published')
        ORDER BY series.updated_at DESC
      `,
      [tenantId],
    );

    const publishingList = result.rows;
    return {
      metrics: {
        pending_publish: publishingList.filter((row) => String(row.status).toLowerCase() === 'ready_to_publish').length,
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
