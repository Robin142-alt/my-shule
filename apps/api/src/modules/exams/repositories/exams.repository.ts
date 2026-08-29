import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export type ExamAnalyticsScopeLevel = 'school' | 'department' | 'assignment';

export interface ExamAnalyticsScope {
  level: ExamAnalyticsScopeLevel;
  actor_user_id: string | null;
  role: string;
}

@Injectable()
export class ExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const tenantId = params[0] as string;
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const result = await tx.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    });
  }

  async createSeries(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_series (
          tenant_id,
          academic_term_id,
          name,
          starts_on,
          ends_on,
          created_by_user_id
        )
        SELECT $1, term.id::uuid, $3, $4::date, $5::date, $6::uuid
        FROM academic_terms term
        WHERE term.tenant_id::text = $1::text
          AND term.id::text = $2::text
          AND lower(COALESCE(term.status, 'active')) = 'active'
          AND term.archived_at IS NULL
          AND $4::date >= term.starts_on
          AND $5::date <= term.ends_on
        RETURNING *
      `,
      [
        input.tenant_id,
        input.academic_term_id,
        input.name,
        input.starts_on,
        input.ends_on,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async getDashboard(tenantId: string) {
    const [
      savedConfigurations,
      examDrafts,
      marksEntrySessions,
      deanReviewBatches
    ] = await Promise.all([
      this.executeSql(`SELECT * FROM exam_series WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`, [tenantId]),
      this.executeSql(`SELECT * FROM exam_series WHERE tenant_id = $1 AND status = 'draft' ORDER BY created_at DESC LIMIT 5`, [tenantId]),
      this.executeSql(`SELECT * FROM exam_mark_entry_windows WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`, [tenantId]),
      this.executeSql(`SELECT * FROM report_card_generation_batches WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`, [tenantId]),
    ]);

    return {
      savedConfigurations: savedConfigurations.rows,
      examDrafts: examDrafts.rows,
      marksEntrySessions: marksEntrySessions.rows,
      deanReviewBatches: deanReviewBatches.rows
    };
  }

  async getWorkflowOverview(input: {
    tenant_id: string;
    department_ids?: string[];
    limit?: number;
  }) {
    const departmentIds = Array.isArray(input.department_ids)
      ? [...new Set(input.department_ids.map((value) => String(value).trim()).filter(Boolean))]
      : [];
    const requestedLimit = Number(input.limit ?? 25);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 25;

    const seriesResult = await this.executeSql(
      `WITH series_scope AS (
         SELECT series.*
         FROM exam_series series
         WHERE series.tenant_id = $1
           AND lower(COALESCE(series.status, 'draft')) <> 'archived'
           AND (
             $2::text[] IS NULL
             OR EXISTS (
               SELECT 1
               FROM exam_assessments assessment
               INNER JOIN subjects subject
                 ON subject.tenant_id = assessment.tenant_id
                AND subject.id = assessment.subject_id::text
               WHERE assessment.tenant_id = series.tenant_id
                 AND assessment.exam_series_id = series.id
                 AND subject.department_id::text = ANY($2::text[])
             )
             OR EXISTS (
               SELECT 1
               FROM exam_marks mark
               INNER JOIN subjects subject
                 ON subject.tenant_id = mark.tenant_id
                AND subject.id = mark.subject_id::text
               WHERE mark.tenant_id = series.tenant_id
                 AND mark.exam_series_id = series.id
                 AND subject.department_id::text = ANY($2::text[])
             )
           )
         ORDER BY series.created_at DESC
         LIMIT $3::integer
       ), assessment_rollup AS (
         SELECT
           assessment.exam_series_id,
           COUNT(*)::integer AS assessment_count,
           COUNT(DISTINCT assessment.subject_id)::integer AS subject_count
         FROM exam_assessments assessment
         LEFT JOIN subjects subject
           ON subject.tenant_id = assessment.tenant_id
          AND subject.id = assessment.subject_id::text
         WHERE assessment.tenant_id = $1
           AND ($2::text[] IS NULL OR subject.department_id::text = ANY($2::text[]))
         GROUP BY assessment.exam_series_id
       ), window_rollup AS (
         SELECT
           mark_window.exam_series_id,
           COUNT(*)::integer AS entry_window_count,
           COUNT(*) FILTER (WHERE lower(COALESCE(mark_window.status, 'open')) = 'open')::integer AS open_window_count,
           COUNT(*) FILTER (WHERE lower(COALESCE(mark_window.status, 'open')) = 'closed')::integer AS closed_window_count,
           COUNT(DISTINCT mark_window.class_section_id)::integer AS class_count
         FROM exam_mark_entry_windows mark_window
         LEFT JOIN subjects subject
           ON subject.tenant_id = mark_window.tenant_id
          AND subject.id = mark_window.subject_id::text
         WHERE mark_window.tenant_id = $1
           AND ($2::text[] IS NULL OR subject.department_id::text = ANY($2::text[]))
         GROUP BY mark_window.exam_series_id
       ), mark_rollup AS (
         SELECT
           mark.exam_series_id,
           COUNT(*)::integer AS total_marks,
           COUNT(*) FILTER (WHERE mark.status = 'draft')::integer AS draft_marks,
           COUNT(*) FILTER (WHERE mark.status = 'submitted')::integer AS submitted_marks,
           COUNT(*) FILTER (WHERE mark.status = 'reviewed')::integer AS reviewed_marks,
           COUNT(*) FILTER (WHERE mark.status = 'locked')::integer AS locked_marks,
           COUNT(*) FILTER (WHERE mark.status = 'published')::integer AS published_marks,
           COUNT(DISTINCT mark.student_id)::integer AS learner_count,
           COUNT(DISTINCT mark.class_section_id)::integer AS marked_class_count,
           COUNT(DISTINCT mark.subject_id)::integer AS marked_subject_count,
           MAX(mark.updated_at)::text AS marks_updated_at
         FROM exam_marks mark
         LEFT JOIN subjects subject
           ON subject.tenant_id = mark.tenant_id
          AND subject.id = mark.subject_id::text
         WHERE mark.tenant_id = $1
           AND ($2::text[] IS NULL OR subject.department_id::text = ANY($2::text[]))
         GROUP BY mark.exam_series_id
       ), card_rollup AS (
         SELECT
           card.exam_series_id,
           COUNT(*)::integer AS total_report_cards,
           COUNT(*) FILTER (WHERE card.status IN ('draft_requested', 'draft_generated', 'draft', 'regeneration_required'))::integer AS draft_report_cards,
           COUNT(*) FILTER (WHERE card.status = 'under_review')::integer AS review_report_cards,
           COUNT(*) FILTER (WHERE card.status = 'approved')::integer AS approved_report_cards,
           COUNT(*) FILTER (WHERE card.status = 'published')::integer AS published_report_cards,
           COUNT(*) FILTER (WHERE card.status = 'withdrawn')::integer AS withdrawn_report_cards,
           MAX(card.updated_at)::text AS report_cards_updated_at
         FROM student_report_cards card
         WHERE card.tenant_id = $1
           AND card.is_current = TRUE
         GROUP BY card.exam_series_id
       ), generation_rollup AS (
         SELECT
           batch.exam_series_id,
           COUNT(*)::integer AS generation_batch_count,
           COUNT(*) FILTER (WHERE batch.status = 'failed')::integer AS failed_generation_batches,
           COALESCE(SUM(batch.completed_students), 0)::integer AS generated_students,
           COALESCE(SUM(batch.failed_students), 0)::integer AS failed_students,
           MAX(batch.updated_at)::text AS generation_updated_at
         FROM report_card_generation_batches batch
         WHERE batch.tenant_id = $1
         GROUP BY batch.exam_series_id
       )
       SELECT
         series.id::text,
         series.name,
         lower(COALESCE(series.status, 'draft')) AS status,
         series.academic_term_id::text,
         term.name AS term_name,
         year.name AS academic_year_name,
         series.starts_on::text,
         series.ends_on::text,
         series.created_at::text,
         series.updated_at::text,
         COALESCE(assessment.assessment_count, 0) AS assessment_count,
         COALESCE(assessment.subject_count, 0) AS subject_count,
         COALESCE(mark_window.entry_window_count, 0) AS entry_window_count,
         COALESCE(mark_window.open_window_count, 0) AS open_window_count,
         COALESCE(mark_window.closed_window_count, 0) AS closed_window_count,
         COALESCE(mark_window.class_count, 0) AS class_count,
         COALESCE(mark.total_marks, 0) AS total_marks,
         COALESCE(mark.draft_marks, 0) AS draft_marks,
         COALESCE(mark.submitted_marks, 0) AS submitted_marks,
         COALESCE(mark.reviewed_marks, 0) AS reviewed_marks,
         COALESCE(mark.locked_marks, 0) AS locked_marks,
         COALESCE(mark.published_marks, 0) AS published_marks,
         COALESCE(mark.learner_count, 0) AS learner_count,
         COALESCE(mark.marked_class_count, 0) AS marked_class_count,
         COALESCE(mark.marked_subject_count, 0) AS marked_subject_count,
         mark.marks_updated_at,
         COALESCE(card.total_report_cards, 0) AS total_report_cards,
         COALESCE(card.draft_report_cards, 0) AS draft_report_cards,
         COALESCE(card.review_report_cards, 0) AS review_report_cards,
         COALESCE(card.approved_report_cards, 0) AS approved_report_cards,
         COALESCE(card.published_report_cards, 0) AS published_report_cards,
         COALESCE(card.withdrawn_report_cards, 0) AS withdrawn_report_cards,
         card.report_cards_updated_at,
         COALESCE(generation.generation_batch_count, 0) AS generation_batch_count,
         COALESCE(generation.failed_generation_batches, 0) AS failed_generation_batches,
         COALESCE(generation.generated_students, 0) AS generated_students,
         COALESCE(generation.failed_students, 0) AS failed_students,
         generation.generation_updated_at
       FROM series_scope series
       LEFT JOIN academic_terms term
         ON term.tenant_id = series.tenant_id
        AND term.id::text = series.academic_term_id::text
       LEFT JOIN academic_years year
         ON year.tenant_id = term.tenant_id
        AND year.id::text = term.academic_year_id::text
       LEFT JOIN assessment_rollup assessment ON assessment.exam_series_id = series.id
       LEFT JOIN window_rollup mark_window ON mark_window.exam_series_id = series.id
       LEFT JOIN mark_rollup mark ON mark.exam_series_id = series.id
       LEFT JOIN card_rollup card ON card.exam_series_id = series.id
       LEFT JOIN generation_rollup generation ON generation.exam_series_id = series.id
       ORDER BY series.created_at DESC`,
      [input.tenant_id, departmentIds.length > 0 ? departmentIds : null, limit],
    );

    const moderationResult = await this.executeSql(
      `SELECT
         concat(mark.exam_series_id::text, ':', mark.subject_id::text, ':', mark.class_section_id::text) AS id,
         mark.exam_series_id::text,
         COALESCE(series.name, 'Exam series') AS exam_name,
         mark.subject_id::text,
         COALESCE(subject.name, subject.code, 'Subject') AS subject_name,
         mark.class_section_id::text,
         COALESCE(class_section.custom_label, class_section.name, 'Class') AS class_name,
         COALESCE(MAX(staff.display_name), 'Assigned teacher') AS teacher_name,
         jsonb_agg(mark.id::text ORDER BY mark.created_at) AS mark_ids,
         COUNT(*)::integer AS mark_count,
         COUNT(*) FILTER (WHERE mark.status = 'submitted')::integer AS submitted_count,
         COUNT(*) FILTER (WHERE mark.status = 'reviewed')::integer AS reviewed_count,
         ROUND(AVG(mark.score) FILTER (WHERE mark.score_status = 'entered'), 2)::float AS mean_score,
         MAX(mark.score) FILTER (WHERE mark.score_status = 'entered')::float AS highest_score,
         MIN(mark.score) FILTER (WHERE mark.score_status = 'entered')::float AS lowest_score,
         CASE
           WHEN COUNT(*) FILTER (WHERE mark.status = 'submitted') > 0 THEN 'submitted'
           ELSE 'reviewed'
         END AS status,
         MAX(mark.updated_at)::text AS updated_at
       FROM exam_marks mark
       INNER JOIN exam_series series
         ON series.tenant_id = mark.tenant_id
        AND series.id = mark.exam_series_id
       LEFT JOIN subjects subject
         ON subject.tenant_id = mark.tenant_id
        AND subject.id = mark.subject_id::text
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = mark.tenant_id
        AND class_section.id = mark.class_section_id::text
       LEFT JOIN staff_profiles staff
         ON staff.tenant_id = mark.tenant_id
        AND staff.user_id::text = mark.entered_by_user_id::text
       WHERE mark.tenant_id = $1
         AND mark.status IN ('submitted', 'reviewed')
         AND ($2::text[] IS NULL OR subject.department_id::text = ANY($2::text[]))
       GROUP BY
         mark.exam_series_id,
         series.name,
         mark.subject_id,
         subject.name,
         subject.code,
         mark.class_section_id,
         class_section.custom_label,
         class_section.name
       ORDER BY MAX(mark.updated_at) DESC
       LIMIT 100`,
      [input.tenant_id, departmentIds.length > 0 ? departmentIds : null],
    );

    return {
      series: seriesResult.rows,
      moderation_batches: moderationResult.rows,
    };
  }

  async createAssessment(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_assessments (
          tenant_id,
          exam_series_id,
          subject_id,
          name,
          max_score,
          weight,
          created_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.subject_id,
        input.name,
        input.max_score,
        input.weight,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async updateAssessment(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `UPDATE exam_assessments
       SET name = COALESCE($3, name), max_score = COALESCE($4, max_score),
           weight = COALESCE($5, weight), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.assessment_id, input.name ?? null, input.max_score ?? null, input.weight ?? null],
    );
    return result.rows[0] ?? null;
  }

  async deleteAssessment(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH target AS MATERIALIZED (
         SELECT id, name FROM exam_assessments WHERE tenant_id = $1 AND id = $2::uuid
       ), dependencies AS MATERIALIZED (
         SELECT
           (SELECT COUNT(*)::integer FROM exam_marks WHERE tenant_id = $1 AND assessment_id = $2::uuid) AS mark_count,
           (SELECT COUNT(*)::integer FROM exam_assessment_components WHERE tenant_id = $1 AND assessment_id = $2::uuid) AS component_count
       ), deleted AS (
         DELETE FROM exam_assessments assessment USING target, dependencies
         WHERE assessment.tenant_id = $1 AND assessment.id = target.id
           AND dependencies.mark_count = 0 AND dependencies.component_count = 0
         RETURNING assessment.id
       )
       SELECT target.id::text, target.name, deleted.id::text AS deleted_id,
         dependencies.mark_count, dependencies.component_count
       FROM target CROSS JOIN dependencies LEFT JOIN deleted ON TRUE`,
      [input.tenant_id, input.assessment_id],
    );
    return result.rows[0] ?? null;
  }

  async findTeacherAssignment(input: {
    tenant_id: string;
    teacher_user_id: string;
    academic_term_id: string;
    class_section_id: string;
    subject_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT *
        FROM teacher_subject_assignments
        WHERE tenant_id = $1
          AND teacher_user_id = $2::text
          AND academic_term_id = $3::text
          AND class_section_id = $4::text
          AND subject_id = $5::text
          AND status = 'active'
          AND mark_entry_allowed = TRUE
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.teacher_user_id,
        input.academic_term_id,
        input.class_section_id,
        input.subject_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findSeriesState(input: { tenant_id: string; exam_series_id: string }) {
    const result = await this.executeSql(
      `
        SELECT id, status, locked_at::text, published_at::text
        FROM exam_series
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.exam_series_id],
    );

    return result.rows[0] ?? null;
  }

  async findOpenMarkEntryWindow(input: {
    tenant_id: string;
    exam_series_id: string;
    academic_term_id: string;
    class_section_id: string;
    subject_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          mark_window.id::text,
          mark_window.exam_series_id::text,
          mark_window.subject_id::text,
          mark_window.class_section_id::text,
          mark_window.opens_at::text,
          mark_window.closes_at::text,
          mark_window.status
        FROM exam_mark_entry_windows mark_window
        JOIN exam_series series
          ON series.tenant_id = mark_window.tenant_id
         AND series.id = mark_window.exam_series_id
        WHERE mark_window.tenant_id = $1
          AND mark_window.exam_series_id = $2::uuid
          AND series.academic_term_id = $3::uuid
          AND mark_window.class_section_id = $4::uuid
          AND mark_window.subject_id = $5::uuid
          AND mark_window.status = 'open'
          AND (mark_window.opens_at <= NOW() OR mark_window.last_action = 'opened')
          AND mark_window.closes_at >= NOW()
        ORDER BY mark_window.created_at DESC
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.academic_term_id,
        input.class_section_id,
        input.subject_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async upsertMark(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_marks (
          tenant_id,
          exam_series_id,
          assessment_id,
          academic_term_id,
          class_section_id,
          subject_id,
          student_id,
          score,
          score_status,
          remarks,
          entered_by_user_id,
          updated_by_user_id
        )
        VALUES (
          $1,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6::uuid,
          $7::uuid,
          $8::numeric,
          $9,
          $10,
          $11::uuid,
          $11::uuid
        )
        ON CONFLICT (tenant_id, assessment_id, student_id)
        DO UPDATE SET
          score = EXCLUDED.score,
          score_status = EXCLUDED.score_status,
          remarks = EXCLUDED.remarks,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = NOW()
        WHERE exam_marks.exam_series_id = EXCLUDED.exam_series_id
          AND exam_marks.academic_term_id = EXCLUDED.academic_term_id
          AND exam_marks.class_section_id = EXCLUDED.class_section_id
          AND exam_marks.subject_id = EXCLUDED.subject_id
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.assessment_id,
        input.academic_term_id,
        input.class_section_id,
        input.subject_id,
        input.student_id,
        input.score,
        input.score_status ?? 'entered',
        input.remarks ?? null,
        input.actor_user_id,
      ],
    );

    return result.rows[0];
  }

  async saveTeacherMarkSheet(input: {
    tenant_id: string;
    actor_user_id: string;
    source_window_id: string;
    submit: boolean;
    rows: Array<{
      row_number: number;
      exam_series_id: string;
      assessment_id: string;
      academic_term_id: string;
      class_section_id: string;
      subject_id: string;
      student_id: string;
      score: number | null;
      score_status: string;
      remarks: string | null;
    }>;
  }) {
    return this.prisma.executeWithTenant(
      input.tenant_id,
      input.actor_user_id,
      async (tx: any) => {
        const savedResult = await tx.$queryRawUnsafe(
          `WITH source AS MATERIALIZED (
             SELECT *
             FROM jsonb_to_recordset($3::jsonb) AS row(
               row_number integer,
               exam_series_id uuid,
               assessment_id uuid,
               academic_term_id uuid,
               class_section_id uuid,
               subject_id uuid,
               student_id uuid,
               score numeric,
               score_status text,
               remarks text
             )
           ), scoped AS MATERIALIZED (
             SELECT source.*
             FROM source
             JOIN exam_mark_entry_windows mark_window
               ON mark_window.tenant_id = $1
              AND mark_window.id = $4::uuid
              AND mark_window.exam_series_id = source.exam_series_id
              AND mark_window.class_section_id = source.class_section_id
              AND mark_window.subject_id = source.subject_id
              AND mark_window.status = 'open'
              AND (mark_window.opens_at <= NOW() OR mark_window.last_action = 'opened')
              AND mark_window.closes_at >= NOW()
             JOIN exam_series series
               ON series.tenant_id = mark_window.tenant_id
              AND series.id = mark_window.exam_series_id
              AND series.academic_term_id = source.academic_term_id
              AND series.locked_at IS NULL
              AND series.published_at IS NULL
              AND series.status NOT IN ('locked', 'published')
             JOIN exam_assessments assessment
               ON assessment.tenant_id = mark_window.tenant_id
              AND assessment.id = source.assessment_id
              AND assessment.exam_series_id = source.exam_series_id
              AND assessment.subject_id = source.subject_id
             JOIN students student
               ON student.tenant_id = mark_window.tenant_id
              AND student.id::text = source.student_id::text
              AND student.status = 'active'
             WHERE EXISTS (
               SELECT 1
               FROM teacher_subject_assignments assignment
               WHERE assignment.tenant_id = mark_window.tenant_id
                 AND assignment.teacher_user_id = $2::text
                 AND assignment.academic_term_id = source.academic_term_id::text
                 AND assignment.class_section_id = source.class_section_id::text
                 AND assignment.subject_id = source.subject_id::text
                 AND assignment.status = 'active'
                 AND assignment.mark_entry_allowed = TRUE
                 AND assignment.effective_from <= CURRENT_DATE
                 AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
             )
               AND EXISTS (
                 SELECT 1
                 FROM student_class_assignments class_assignment
                 WHERE class_assignment.tenant_id = student.tenant_id
                   AND class_assignment.student_id = student.id::text
                   AND class_assignment.class_section_id = source.class_section_id::text
                   AND class_assignment.status = 'active'
               )
               AND EXISTS (
                 SELECT 1
                 FROM student_subject_enrollments subject_enrollment
                 WHERE subject_enrollment.tenant_id = student.tenant_id
                   AND subject_enrollment.student_id = student.id::text
                   AND subject_enrollment.class_section_id = source.class_section_id::text
                   AND subject_enrollment.subject_id = source.subject_id::text
                   AND subject_enrollment.status = 'active'
               )
           ), previous AS MATERIALIZED (
             SELECT scoped.*,
               mark.id AS previous_mark_id,
               mark.score AS previous_score,
               mark.score_status AS previous_score_status,
               mark.status AS previous_status
             FROM scoped
             LEFT JOIN exam_marks mark
               ON mark.tenant_id = $1
              AND mark.assessment_id = scoped.assessment_id
              AND mark.student_id = scoped.student_id
           ), upserted AS (
             INSERT INTO exam_marks (
               tenant_id, exam_series_id, assessment_id, academic_term_id,
               class_section_id, subject_id, student_id, score, score_status, remarks,
               entered_by_user_id, updated_by_user_id, status
             )
             SELECT $1, exam_series_id, assessment_id, academic_term_id,
               class_section_id, subject_id, student_id, score, score_status, remarks,
               $2::uuid, $2::uuid, 'draft'
             FROM scoped
             ON CONFLICT (tenant_id, assessment_id, student_id)
             DO UPDATE SET
               score = EXCLUDED.score,
               score_status = EXCLUDED.score_status,
               remarks = EXCLUDED.remarks,
               updated_by_user_id = EXCLUDED.updated_by_user_id,
               updated_at = NOW()
             WHERE exam_marks.exam_series_id = EXCLUDED.exam_series_id
               AND exam_marks.academic_term_id = EXCLUDED.academic_term_id
               AND exam_marks.class_section_id = EXCLUDED.class_section_id
               AND exam_marks.subject_id = EXCLUDED.subject_id
               AND exam_marks.entered_by_user_id = $2::uuid
               AND exam_marks.status = 'draft'
             RETURNING *
           ), audits AS (
             INSERT INTO exam_mark_audit_logs (
               tenant_id, mark_id, exam_series_id, assessment_id, student_id,
               action, actor_user_id, previous_score, new_score, metadata
             )
             SELECT $1, mark.id, mark.exam_series_id, mark.assessment_id, mark.student_id,
               CASE
                 WHEN previous.previous_mark_id IS NULL THEN 'grade.created'
                 ELSE 'grade.updated'
               END,
               $2::uuid,
               previous.previous_score,
               mark.score,
               jsonb_build_object(
                 'source', 'teacher_mark_sheet',
                 'source_window_id', $4::text,
                 'row_number', previous.row_number,
                 'previous_score_status', previous.previous_score_status,
                 'new_score_status', mark.score_status
               )
             FROM upserted mark
             JOIN previous
               ON previous.assessment_id = mark.assessment_id
              AND previous.student_id = mark.student_id
             RETURNING id
           )
           SELECT
             mark.id::text,
             mark.student_id::text,
             mark.score::float,
             mark.score_status,
             mark.status
           FROM upserted mark
           ORDER BY mark.student_id`,
          input.tenant_id,
          input.actor_user_id,
          JSON.stringify(input.rows),
          input.source_window_id,
        );
        const savedRows = Array.isArray(savedResult) ? savedResult : [savedResult];

        if (savedRows.length !== input.rows.length) {
          throw new ConflictException(
            'The mark sheet changed, closed, or contains learners outside this teacher assignment. Refresh before retrying.',
          );
        }

        if (!input.submit) {
          return {
            saved_count: savedRows.length,
            submitted_count: 0,
            mark_ids: savedRows.map((row: any) => row.id),
            status: 'draft',
          };
        }

        const firstRow = input.rows[0];
        const stateResult = await tx.$queryRawUnsafe(
          `SELECT
             COUNT(student.id)::integer AS expected_count,
             COUNT(mark.id)::integer AS evidence_count,
             COUNT(mark.id) FILTER (
               WHERE mark.entered_by_user_id IS DISTINCT FROM $2::uuid
             )::integer AS foreign_owner_count,
             COUNT(mark.id) FILTER (
               WHERE mark.status NOT IN ('draft', 'submitted')
             )::integer AS immutable_count,
             COALESCE(
               ARRAY_AGG(mark.id::text ORDER BY student.id)
                 FILTER (WHERE mark.id IS NOT NULL),
               ARRAY[]::text[]
             ) AS mark_ids
           FROM exam_mark_entry_windows mark_window
           JOIN students student
             ON student.tenant_id = mark_window.tenant_id
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
           LEFT JOIN exam_marks mark
             ON mark.tenant_id = mark_window.tenant_id
            AND mark.exam_series_id = mark_window.exam_series_id
            AND mark.assessment_id = $5::uuid
            AND mark.class_section_id = mark_window.class_section_id
            AND mark.subject_id = mark_window.subject_id
            AND mark.student_id::text = student.id::text
           WHERE mark_window.tenant_id = $1
             AND mark_window.id = $3::uuid
             AND mark_window.exam_series_id = $4::uuid
             AND mark_window.class_section_id = $6::uuid
             AND mark_window.subject_id = $7::uuid
             AND mark_window.status = 'open'
             AND (mark_window.opens_at <= NOW() OR mark_window.last_action = 'opened')
             AND mark_window.closes_at >= NOW()`,
          input.tenant_id,
          input.actor_user_id,
          input.source_window_id,
          firstRow.exam_series_id,
          firstRow.assessment_id,
          firstRow.class_section_id,
          firstRow.subject_id,
        );
        const sheetState = (Array.isArray(stateResult) ? stateResult[0] : stateResult) ?? {};
        const expectedCount = Number(sheetState.expected_count ?? 0);
        const evidenceCount = Number(sheetState.evidence_count ?? 0);
        const foreignOwnerCount = Number(sheetState.foreign_owner_count ?? 0);
        const immutableCount = Number(sheetState.immutable_count ?? 0);

        if (expectedCount === 0) {
          throw new ConflictException(
            'No active learners are enrolled for this class and subject. Refresh the academic assignments before submitting.',
          );
        }
        if (evidenceCount !== expectedCount) {
          throw new ConflictException(
            `${expectedCount - evidenceCount} learner mark entr${expectedCount - evidenceCount === 1 ? 'y is' : 'ies are'} still missing.`,
          );
        }
        if (foreignOwnerCount > 0) {
          throw new ConflictException(
            'This sheet contains marks entered by another user. An exams officer must resolve ownership before submission.',
          );
        }
        if (immutableCount > 0) {
          throw new ConflictException(
            'This sheet already contains reviewed or locked marks and cannot be resubmitted.',
          );
        }

        const markIds = Array.isArray(sheetState.mark_ids) ? sheetState.mark_ids : [];
        const submittedResult = await tx.$queryRawUnsafe(
          `WITH submitted AS (
             UPDATE exam_marks
             SET status = 'submitted',
                 submitted_at = COALESCE(submitted_at, NOW()),
                 updated_by_user_id = $2::uuid,
                 updated_at = NOW()
             WHERE tenant_id = $1
               AND id = ANY($3::uuid[])
               AND entered_by_user_id = $2::uuid
               AND status = 'draft'
             RETURNING *
           ), audits AS (
             INSERT INTO exam_mark_audit_logs (
               tenant_id, mark_id, exam_series_id, assessment_id, student_id,
               action, actor_user_id, previous_score, new_score, metadata
             )
             SELECT $1, mark.id, mark.exam_series_id, mark.assessment_id, mark.student_id,
               'grade.submitted', $2::uuid, mark.score, mark.score,
               jsonb_build_object(
                 'source', 'teacher_mark_sheet',
                 'source_window_id', $4::text,
                 'score_status', mark.score_status
               )
             FROM submitted mark
             RETURNING id
           )
           SELECT id::text FROM submitted ORDER BY id`,
          input.tenant_id,
          input.actor_user_id,
          markIds,
          input.source_window_id,
        );
        const newlySubmittedRows = Array.isArray(submittedResult) ? submittedResult : [submittedResult];

        return {
          saved_count: savedRows.length,
          submitted_count: expectedCount,
          newly_submitted_count: newlySubmittedRows.length,
          mark_ids: markIds,
          status: 'submitted',
        };
      },
    );
  }

  async commitBulkMarkImport(input: Record<string, unknown>) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const result = await this.executeSql(
      `WITH source AS MATERIALIZED (
         SELECT *
         FROM jsonb_to_recordset($4::jsonb) AS row(
           row_number integer,
           exam_series_id uuid,
           assessment_id uuid,
           academic_term_id uuid,
           class_section_id uuid,
           subject_id uuid,
           student_id uuid,
           score numeric,
           score_status text,
           remarks text
         )
       ), previous AS MATERIALIZED (
         SELECT source.*,
           mark.id AS previous_mark_id,
           mark.score AS previous_score,
           mark.score_status AS previous_score_status,
           mark.remarks AS previous_remarks,
           mark.status AS previous_status
         FROM source
         LEFT JOIN exam_marks mark
           ON mark.tenant_id = $1
          AND mark.assessment_id = source.assessment_id
          AND mark.student_id = source.student_id
       ), upserted AS (
         INSERT INTO exam_marks (
           tenant_id, exam_series_id, assessment_id, academic_term_id,
           class_section_id, subject_id, student_id, score, score_status, remarks,
           entered_by_user_id, updated_by_user_id
         )
         SELECT $1, exam_series_id, assessment_id, academic_term_id,
           class_section_id, subject_id, student_id, score, score_status, remarks, $2::uuid, $2::uuid
         FROM source
         ON CONFLICT (tenant_id, assessment_id, student_id)
         DO UPDATE SET
           score = EXCLUDED.score,
           score_status = EXCLUDED.score_status,
           remarks = EXCLUDED.remarks,
           updated_by_user_id = EXCLUDED.updated_by_user_id,
           updated_at = NOW()
         WHERE exam_marks.exam_series_id = EXCLUDED.exam_series_id
           AND exam_marks.academic_term_id = EXCLUDED.academic_term_id
           AND exam_marks.class_section_id = EXCLUDED.class_section_id
           AND exam_marks.subject_id = EXCLUDED.subject_id
           AND exam_marks.status = 'draft'
         RETURNING *
       ), batch AS (
         INSERT INTO exam_mark_import_batches (
           tenant_id, file_name, status, total_rows, valid_rows, invalid_rows,
           duplicate_rows, committed_rows, preview_hash, imported_by_user_id,
           metadata
         )
         SELECT $1, $3, 'imported', source_count, source_count, 0, 0,
           CASE WHEN committed_count = source_count THEN committed_count ELSE NULL END,
           $5, $2::uuid, jsonb_build_object('source', 'marks_bulk_upload', 'source_rows', $4::jsonb)
         FROM (SELECT COUNT(*)::integer AS source_count FROM source) source_totals
         CROSS JOIN (SELECT COUNT(*)::integer AS committed_count FROM upserted) committed_totals
         RETURNING *
       ), items AS (
         INSERT INTO exam_mark_import_batch_items (
           tenant_id, batch_id, mark_id, row_number, previous_exists,
           previous_score, previous_score_status, previous_remarks, previous_status,
           imported_score, imported_score_status, imported_remarks, imported_status
         )
         SELECT $1, batch.id, mark.id, previous.row_number,
           previous.previous_mark_id IS NOT NULL,
           previous.previous_score, previous.previous_score_status, previous.previous_remarks, previous.previous_status,
           mark.score, mark.score_status, mark.remarks, mark.status
         FROM batch
         JOIN upserted mark ON TRUE
         JOIN previous
           ON previous.assessment_id = mark.assessment_id
          AND previous.student_id = mark.student_id
         RETURNING *
       ), audits AS (
         INSERT INTO exam_mark_audit_logs (
           tenant_id, mark_id, exam_series_id, assessment_id, student_id,
           action, actor_user_id, previous_score, new_score, metadata
         )
         SELECT $1, mark.id, mark.exam_series_id, mark.assessment_id, mark.student_id,
           'bulk_grade.updated', $2::uuid, previous.previous_score, mark.score,
           jsonb_build_object(
             'bulk_upload', true,
             'batch_id', batch.id,
             'row_number', previous.row_number,
             'previous_score_status', previous.previous_score_status,
             'new_score_status', mark.score_status
           )
         FROM batch
         JOIN upserted mark ON TRUE
         JOIN previous
           ON previous.assessment_id = mark.assessment_id
          AND previous.student_id = mark.student_id
         RETURNING id
       )
       SELECT batch.id::text AS batch_id, batch.file_name, batch.status,
         batch.total_rows, batch.valid_rows, batch.invalid_rows,
         batch.duplicate_rows, batch.committed_rows, batch.imported_at
       FROM batch`,
      [
        input.tenant_id,
        input.actor_user_id,
        input.file_name,
        JSON.stringify(rows),
        input.preview_token,
      ],
    );
    return result.rows[0] ?? null;
  }

  async listMarkImportBatches(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `SELECT id::text, file_name, status, total_rows, valid_rows, invalid_rows,
         duplicate_rows, committed_rows, imported_by_user_id::text,
         imported_at, rolled_back_by_user_id::text, rolled_back_at, rollback_reason
       FROM exam_mark_import_batches
       WHERE tenant_id = $1
       ORDER BY imported_at DESC
       LIMIT $2 OFFSET $3`,
      [input.tenant_id, input.limit, input.offset],
    );
    return result.rows;
  }

  async getExamReadinessStats(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH windows AS (
         SELECT class_section_id, subject_id
         FROM exam_mark_entry_windows
         WHERE tenant_id = $1 AND exam_series_id = $2::uuid
       ), expected AS (
         SELECT mark_window.class_section_id, mark_window.subject_id, COUNT(student.id)::integer AS expected_count
         FROM windows mark_window
         LEFT JOIN students student
           ON student.tenant_id = $1
          AND student.status = 'active'
          AND EXISTS (
            SELECT 1 FROM student_class_assignments class_assignment
            WHERE class_assignment.tenant_id = student.tenant_id
              AND class_assignment.student_id = student.id::text
              AND class_assignment.class_section_id = mark_window.class_section_id::text
              AND class_assignment.status = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM student_subject_enrollments subject_enrollment
            WHERE subject_enrollment.tenant_id = student.tenant_id
              AND subject_enrollment.student_id = student.id::text
              AND subject_enrollment.class_section_id = mark_window.class_section_id::text
              AND subject_enrollment.subject_id = mark_window.subject_id::text
              AND subject_enrollment.status = 'active'
          )
         GROUP BY mark_window.class_section_id, mark_window.subject_id
       ), saved AS (
         SELECT class_section_id, subject_id, COUNT(DISTINCT student_id)::integer AS saved_count
         FROM exam_marks
         WHERE tenant_id = $1 AND exam_series_id = $2::uuid
         GROUP BY class_section_id, subject_id
       )
       SELECT
         (SELECT COUNT(*)::integer FROM exam_marks
          WHERE tenant_id = $1 AND exam_series_id = $2::uuid
            AND status NOT IN ('reviewed', 'locked', 'published')) AS unapproved_count,
         COALESCE(SUM(GREATEST(expected.expected_count - COALESCE(saved.saved_count, 0), 0)), 0)::integer AS missing_count
       FROM expected
       LEFT JOIN saved
         ON saved.class_section_id = expected.class_section_id
        AND saved.subject_id = expected.subject_id`,
      [input.tenant_id, input.exam_series_id],
    );
    return result.rows[0] ?? { unapproved_count: 0, missing_count: 0 };
  }

  async getMarkImportBatch(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `SELECT id::text, file_name, status, total_rows, valid_rows, invalid_rows,
         duplicate_rows, committed_rows, imported_by_user_id::text,
         imported_at, rolled_back_by_user_id::text, rolled_back_at, rollback_reason,
         COALESCE(metadata->'source_rows', '[]'::jsonb) AS source_rows
       FROM exam_mark_import_batches
       WHERE tenant_id = $1 AND id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.batch_id],
    );
    return result.rows[0] ?? null;
  }

  async rollbackMarkImportBatch(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH target AS MATERIALIZED (
         SELECT * FROM exam_mark_import_batches
         WHERE tenant_id = $1 AND id = $2::uuid AND status = 'imported'
         FOR UPDATE
       ), conflicts AS MATERIALIZED (
         SELECT COUNT(*)::integer AS conflict_count
         FROM target
         JOIN exam_mark_import_batch_items item
           ON item.tenant_id = target.tenant_id AND item.batch_id = target.id
         LEFT JOIN exam_marks mark
           ON mark.tenant_id = item.tenant_id AND mark.id = item.mark_id
         WHERE mark.id IS NULL
            OR mark.score IS DISTINCT FROM item.imported_score
            OR mark.score_status IS DISTINCT FROM item.imported_score_status
            OR mark.remarks IS DISTINCT FROM item.imported_remarks
            OR mark.status IS DISTINCT FROM item.imported_status
       ), restored AS (
         UPDATE exam_marks mark
         SET score = item.previous_score,
             score_status = item.previous_score_status,
             remarks = item.previous_remarks,
             status = item.previous_status,
             updated_by_user_id = $3::uuid,
             updated_at = NOW()
         FROM target
         JOIN exam_mark_import_batch_items item
           ON item.tenant_id = target.tenant_id AND item.batch_id = target.id
         WHERE (SELECT conflict_count FROM conflicts) = 0
           AND item.previous_exists
           AND mark.tenant_id = item.tenant_id
           AND mark.id = item.mark_id
         RETURNING mark.id, item.imported_score, mark.score AS restored_score
       ), deleted AS (
         DELETE FROM exam_marks mark
         USING target, exam_mark_import_batch_items item
         WHERE (SELECT conflict_count FROM conflicts) = 0
           AND NOT item.previous_exists
           AND item.tenant_id = target.tenant_id
           AND item.batch_id = target.id
           AND mark.tenant_id = item.tenant_id
           AND mark.id = item.mark_id
         RETURNING mark.id, mark.exam_series_id, mark.assessment_id, mark.student_id, mark.score
       ), restore_audits AS (
         INSERT INTO exam_mark_audit_logs (
           tenant_id, mark_id, action, actor_user_id, previous_score, new_score, reason, metadata
         )
         SELECT $1, restored.id, 'bulk_grade.rollback', $3::uuid,
           restored.imported_score, restored.restored_score, $4,
           jsonb_build_object('batch_id', $2::text, 'operation', 'restore')
         FROM restored
         RETURNING id
       ), delete_audits AS (
         INSERT INTO exam_mark_audit_logs (
           tenant_id, mark_id, exam_series_id, assessment_id, student_id,
           action, actor_user_id, previous_score, reason, metadata
         )
         SELECT $1, deleted.id, deleted.exam_series_id, deleted.assessment_id, deleted.student_id,
           'bulk_grade.rollback', $3::uuid, deleted.score, $4,
           jsonb_build_object('batch_id', $2::text, 'operation', 'delete_imported_row')
         FROM deleted
         RETURNING id
       ), updated_batch AS (
         UPDATE exam_mark_import_batches batch
         SET status = CASE WHEN conflicts.conflict_count = 0 THEN 'rolled_back' ELSE batch.status END,
             rolled_back_by_user_id = CASE WHEN conflicts.conflict_count = 0 THEN $3::uuid ELSE NULL END,
             rolled_back_at = CASE WHEN conflicts.conflict_count = 0 THEN NOW() ELSE NULL END,
             rollback_reason = CASE WHEN conflicts.conflict_count = 0 THEN $4 ELSE NULL END
         FROM target, conflicts
         WHERE batch.tenant_id = target.tenant_id AND batch.id = target.id
         RETURNING batch.*, conflicts.conflict_count
       )
       SELECT id::text, status, conflict_count,
         (SELECT COUNT(*)::integer FROM restored) AS restored_rows,
         (SELECT COUNT(*)::integer FROM deleted) AS deleted_rows,
         rolled_back_at, rollback_reason
       FROM updated_batch`,
      [input.tenant_id, input.batch_id, input.actor_user_id, input.reason],
    );
    return result.rows[0] ?? null;
  }

  async findExistingMark(input: { tenant_id: string; mark_id: string }) {
    const result = await this.executeSql(
      `
        SELECT *
        FROM exam_marks
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
        FOR UPDATE
      `,
      [input.tenant_id, input.mark_id],
    );

    return result.rows[0] ?? null;
  }

  async correctLockedMark(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET score = $3::numeric,
            score_status = $4,
            remarks = COALESCE($5, remarks),
            updated_by_user_id = $6::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [
        input.tenant_id,
        input.mark_id,
        input.score,
        input.score_status ?? 'entered',
        input.remarks ?? null,
        input.actor_user_id,
      ],
    );

    return result.rows[0];
  }

  async createMarkVersion(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_mark_versions (
          tenant_id,
          mark_id,
          original_score,
          original_score_status,
          correction_score,
          correction_score_status,
          corrected_by_user_id,
          reason,
          approval_state,
          first_approver_user_id,
          second_approver_user_id,
          metadata
        )
        VALUES (
          $1,
          $2::uuid,
          $3::numeric,
          $4,
          $5::numeric,
          $6,
          $7::uuid,
          $8,
          $9,
          $10::uuid,
          $11::uuid,
          $12::jsonb
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.mark_id,
        input.original_score,
        input.original_score_status ?? 'entered',
        input.correction_score,
        input.correction_score_status ?? 'entered',
        input.corrected_by_user_id,
        input.reason,
        input.approval_state,
        input.first_approver_user_id ?? null,
        input.second_approver_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0];
  }

  async findPublishedReportCardsForMark(
    input: { tenant_id: string; mark_id: string },
  ): Promise<Array<{ id: string; status?: string }>> {
    const result = await this.executeSql<{ id: string; status?: string }>(
      `
        SELECT DISTINCT
          card.id::text,
          card.status
        FROM exam_marks mark
        JOIN student_report_cards card
          ON card.tenant_id = mark.tenant_id
         AND card.exam_series_id = mark.exam_series_id
         AND card.student_id = mark.student_id
         AND card.status = 'published'
         AND card.is_current = TRUE
        WHERE mark.tenant_id = $1
          AND mark.id = $2::uuid
      `,
      [input.tenant_id, input.mark_id],
    );

    return result.rows;
  }

  async markReportCardsRegenerationRequired(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        WITH target AS MATERIALIZED (
          SELECT card.*
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.id = ANY($2::uuid[])
            AND card.status = 'published'
            AND card.is_current = TRUE
          FOR UPDATE
        ), superseded AS (
          UPDATE student_report_cards card
          SET is_current = FALSE,
              updated_at = NOW()
          FROM target
          WHERE card.tenant_id = target.tenant_id
            AND card.id = target.id
          RETURNING card.id
        ), inserted AS (
          INSERT INTO student_report_cards (
            tenant_id,
            exam_series_id,
            student_id,
            report_snapshot_id,
            status,
            revision_number,
            is_current,
            supersedes_report_card_id,
            grading_policy_id,
            grading_policy_version,
            template_version,
            approved_result_version,
            metadata
          )
          SELECT
            target.tenant_id,
            target.exam_series_id,
            target.student_id,
            target.report_snapshot_id || ':revision:' || (target.revision_number + 1)::text,
            $3,
            target.revision_number + 1,
            TRUE,
            target.id,
            target.grading_policy_id,
            target.grading_policy_version,
            target.template_version,
            target.approved_result_version,
            target.metadata || $4::jsonb
          FROM target
          JOIN superseded ON superseded.id = target.id
          RETURNING *
        )
        SELECT * FROM inserted
      `,
      [
        input.tenant_id,
        input.report_card_ids ?? [],
        input.status,
        JSON.stringify({
          regeneration_required_at: new Date().toISOString(),
          reason: input.reason,
          corrected_mark_id: input.corrected_mark_id,
          actor_user_id: input.actor_user_id,
        }),
      ],
    );
    return result.rows;
  }

  async createReportCardSnapshot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        WITH current_card AS MATERIALIZED (
          SELECT card.*
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.student_id = $3::uuid
            AND card.is_current = TRUE
          LIMIT 1
          FOR UPDATE
        ), superseded AS (
          UPDATE student_report_cards card
          SET is_current = FALSE,
              updated_at = NOW()
          FROM current_card
          WHERE card.tenant_id = current_card.tenant_id
            AND card.id = current_card.id
            AND current_card.status <> 'published'
          RETURNING card.id
        ), next_revision AS (
          SELECT COALESCE(MAX(card.revision_number), 0) + 1 AS revision_number
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.student_id = $3::uuid
        )
        INSERT INTO student_report_cards (
          tenant_id,
          exam_series_id,
          student_id,
          report_snapshot_id,
          status,
          revision_number,
          is_current,
          supersedes_report_card_id,
          published_by_user_id,
          published_at,
          metadata
        )
        SELECT
          $1,
          $2::uuid,
          $3::uuid,
          $4,
          'published',
          next_revision.revision_number,
          TRUE,
          current_card.id,
          $5::uuid,
          NOW(),
          $6::jsonb
        FROM next_revision
        LEFT JOIN current_card ON TRUE
        WHERE current_card.id IS NULL
           OR EXISTS (SELECT 1 FROM superseded)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.student_id,
        input.report_snapshot_id,
        input.actor_user_id,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    if (!result.rows[0]) {
      throw new ConflictException('Published report cards are immutable; generate a controlled revision instead');
    }

    return result.rows[0];
  }

  async createGeneratedReportCardSnapshot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        WITH current_card AS MATERIALIZED (
          SELECT card.*
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.student_id = $3::uuid
            AND card.is_current = TRUE
          LIMIT 1
          FOR UPDATE
        ), updated AS (
          UPDATE student_report_cards card
          SET report_snapshot_id = $4,
              status = $7,
              verification_code = $8,
              grading_policy_id = $9::uuid,
              grading_policy_version = $10::integer,
              template_version = $11::integer,
              approved_result_version = $12,
              metadata = $6::jsonb,
              updated_at = NOW()
          FROM current_card
          WHERE card.tenant_id = current_card.tenant_id
            AND card.id = current_card.id
            AND current_card.status IN (
              'draft_requested',
              'draft_generated',
              'draft',
              'regeneration_required'
            )
          RETURNING card.*
        ), superseded AS (
          UPDATE student_report_cards card
          SET is_current = FALSE,
              updated_at = NOW()
          FROM current_card
          WHERE card.tenant_id = current_card.tenant_id
            AND card.id = current_card.id
            AND current_card.status IN ('published', 'withdrawn')
            AND NOT EXISTS (SELECT 1 FROM updated)
          RETURNING card.id
        ), next_revision AS (
          SELECT COALESCE(MAX(card.revision_number), 0) + 1 AS revision_number
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.student_id = $3::uuid
        ), inserted AS (
        INSERT INTO student_report_cards (
          tenant_id,
          exam_series_id,
          student_id,
          report_snapshot_id,
          status,
          revision_number,
          is_current,
          supersedes_report_card_id,
          grading_policy_id,
          grading_policy_version,
          template_version,
          approved_result_version,
          verification_code,
          published_by_user_id,
          metadata
        )
        SELECT
          $1,
          $2::uuid,
          $3::uuid,
          $4,
          $7,
          next_revision.revision_number,
          TRUE,
          current_card.id,
          $9::uuid,
          $10::integer,
          $11::integer,
          $12,
          $8,
          $5::uuid,
          $6::jsonb
        FROM next_revision
        LEFT JOIN current_card ON TRUE
        WHERE NOT EXISTS (SELECT 1 FROM updated)
          AND (
            current_card.id IS NULL
            OR EXISTS (SELECT 1 FROM superseded)
          )
        RETURNING *
        )
        SELECT * FROM updated
        UNION ALL
        SELECT * FROM inserted
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.student_id,
        input.report_snapshot_id,
        input.actor_user_id,
        JSON.stringify(input.metadata ?? {}),
        input.status ?? 'draft_generated',
        input.verification_code ?? null,
        input.grading_policy_id ?? null,
        input.grading_policy_version ?? null,
        input.template_version ?? 1,
        input.approved_result_version ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new ConflictException(
        'Report card is already under review or approved; recall it before generating another draft',
      );
    }

    return result.rows[0];
  }

  async findGeneratedReportCardForPublication(input: {
    tenant_id: string;
    exam_series_id: string;
    student_id: string;
    report_snapshot_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          card.id::text,
          card.exam_series_id::text,
          card.student_id::text,
          card.report_snapshot_id,
          card.status,
          card.revision_number,
          card.is_current,
          card.supersedes_report_card_id::text,
          card.grading_policy_id::text,
          card.grading_policy_version,
          card.template_version,
          card.approved_result_version,
          card.verification_code,
          card.metadata,
          card.updated_at::text
        FROM student_report_cards card
        WHERE card.tenant_id = $1
          AND card.exam_series_id = $2::uuid
          AND card.student_id = $3::uuid
          AND card.report_snapshot_id = $4
          AND card.status = 'approved'
          AND card.is_current = TRUE
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.student_id,
        input.report_snapshot_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async transitionReportCard(input: {
    tenant_id: string;
    actor_user_id: string;
    actor_role: string;
    report_card_id: string;
    action: string;
    reason?: string;
  }) {
    const result = await this.executeSql(
      `WITH transition AS (
         SELECT
           CASE $4
             WHEN 'submit' THEN ARRAY['draft_generated', 'draft', 'regeneration_required']::text[]
             WHEN 'approve' THEN ARRAY['under_review']::text[]
             WHEN 'recall' THEN ARRAY['under_review']::text[]
             WHEN 'publish' THEN ARRAY['approved']::text[]
             WHEN 'unpublish' THEN ARRAY['published']::text[]
             ELSE ARRAY[]::text[]
           END AS source_statuses,
           CASE $4
             WHEN 'submit' THEN 'under_review'
             WHEN 'approve' THEN 'approved'
             WHEN 'recall' THEN 'draft_generated'
             WHEN 'publish' THEN 'published'
             WHEN 'unpublish' THEN 'withdrawn'
             ELSE NULL
           END AS target_status
       ), updated AS (
       UPDATE student_report_cards card
       SET status = transition.target_status,
           submitted_by_user_id = CASE
             WHEN $4 = 'submit' THEN $2::uuid
             WHEN $4 = 'recall' THEN NULL
             ELSE card.submitted_by_user_id
           END,
           submitted_at = CASE
             WHEN $4 = 'submit' THEN NOW()
             WHEN $4 = 'recall' THEN NULL
             ELSE card.submitted_at
           END,
           approved_by_user_id = CASE
             WHEN $4 = 'approve' THEN $2::uuid
             WHEN $4 = 'recall' THEN NULL
             ELSE card.approved_by_user_id
           END,
           approved_at = CASE
             WHEN $4 = 'approve' THEN NOW()
             WHEN $4 = 'recall' THEN NULL
             ELSE card.approved_at
           END,
           approval_role = CASE
             WHEN $4 = 'approve' THEN $5
             WHEN $4 = 'recall' THEN NULL
             ELSE card.approval_role
           END,
           published_by_user_id = CASE WHEN $4 = 'publish' THEN $2::uuid ELSE card.published_by_user_id END,
           published_at = CASE WHEN $4 = 'publish' THEN NOW() ELSE card.published_at END,
           withdrawn_by_user_id = CASE WHEN $4 = 'unpublish' THEN $2::uuid ELSE NULL END,
           withdrawn_at = CASE WHEN $4 = 'unpublish' THEN NOW() ELSE NULL END,
           workflow_version = card.workflow_version + 1,
           metadata = card.metadata || jsonb_strip_nulls(jsonb_build_object(
             'last_transition', $4::text,
             'transitioned_by', $2::text,
             'transitioned_by_role', $5::text,
             'transitioned_at', NOW(),
             'transition_reason', $6::text
           )),
           updated_at = NOW()
       FROM transition
       WHERE card.tenant_id = $1
         AND card.id = $3::uuid
         AND card.is_current = TRUE
         AND card.status = ANY(transition.source_statuses)
       RETURNING card.*
       ), audit AS (
         INSERT INTO student_report_card_audit_logs (
           tenant_id,
           report_card_id,
           exam_series_id,
           student_id,
           action,
           actor_user_id,
           metadata
         )
         SELECT
           $1,
           updated.id,
           updated.exam_series_id,
           updated.student_id,
           CASE $4
             WHEN 'unpublish' THEN 'report_card.withdrawn'
             WHEN 'submit' THEN 'report_card.submitted'
             WHEN 'approve' THEN 'report_card.approved'
             WHEN 'recall' THEN 'report_card.recalled'
             WHEN 'publish' THEN 'report_card.published'
           END,
           $2::uuid,
           jsonb_strip_nulls(jsonb_build_object(
             'resulting_status', updated.status,
             'actor_role', $5::text,
             'reason', $6::text,
             'workflow_version', updated.workflow_version,
             'grade_event', CASE WHEN $4 = 'publish' THEN 'grade.published' ELSE NULL END
           ))
         FROM updated
         RETURNING id
       )
       SELECT updated.*, (SELECT COUNT(*)::integer FROM audit) AS audit_recorded
       FROM updated`,
      [
        input.tenant_id,
        input.actor_user_id,
        input.report_card_id,
        input.action,
        input.actor_role,
        input.reason ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async updateReportCardComments(input: { tenant_id: string; actor_user_id: string; report_card_id: string; class_teacher_comment: string; principal_comment: string }) {
    const result = await this.executeSql(
      `UPDATE student_report_cards
       SET metadata =
             COALESCE(metadata, '{}'::jsonb)
             || jsonb_strip_nulls(jsonb_build_object(
               'class_teacher_comment', NULLIF($4::text, ''),
               'principal_comment', NULLIF($5::text, '')
             ))
             || jsonb_build_object(
               'comments_updated_by', $2::text,
               'comments_updated_at', NOW(),
               'report_card',
                 COALESCE(metadata->'report_card', '{}'::jsonb)
                 || jsonb_build_object(
                   'template_fields',
                     COALESCE(metadata->'report_card'->'template_fields', '{}'::jsonb)
                     || jsonb_strip_nulls(jsonb_build_object(
                       'class_teacher_comment', NULLIF($4::text, ''),
                       'principal_comment', NULLIF($5::text, '')
                     ))
                 )
             ),
           updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $3::uuid
         AND is_current = TRUE
         AND status IN ('draft_requested', 'draft_generated', 'draft', 'regeneration_required')
       RETURNING *`,
      [input.tenant_id, input.actor_user_id, input.report_card_id, input.class_teacher_comment, input.principal_comment],
    );
    return result.rows[0] ?? null;
  }

  async recordReportCardArtifact(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO report_card_artifacts (
          tenant_id,
          report_card_id,
          artifact_type,
          storage_key,
          checksum_sha256,
          byte_size,
          verification_code,
          generated_by_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::bigint, $7, $8::uuid, $9::jsonb)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.report_card_id,
        input.artifact_type,
        input.storage_key,
        input.checksum_sha256,
        input.byte_size,
        input.verification_code,
        input.generated_by_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0];
  }

  async createReportCardGenerationBatch(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO report_card_generation_batches (
          tenant_id,
          exam_series_id,
          class_section_id,
          stream_name,
          status,
          total_students,
          requested_by_user_id,
          started_at,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::integer, $7::uuid, NOW(), $8::jsonb)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.class_section_id ?? null,
        input.stream_name ?? null,
        input.status ?? 'draft_requested',
        input.total_students ?? 0,
        input.requested_by_user_id,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0];
  }

  async updateReportCardGenerationBatch(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        UPDATE report_card_generation_batches
        SET
          status = $3,
          total_students = $4::integer,
          completed_students = $5::integer,
          failed_students = $6::integer,
          completed_at = CASE WHEN $3 IN ('draft_generated', 'failed') THEN NOW() ELSE completed_at END,
          metadata = metadata || $7::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING
          id::text,
          status,
          COALESCE(metadata->>'queue_status', 'queued') AS queue_status,
          total_students,
          completed_students,
          failed_students
      `,
      [
        input.tenant_id,
        input.batch_id,
        input.status,
        input.total_students ?? 0,
        input.completed_students ?? 0,
        input.failed_students ?? 0,
        JSON.stringify({
          queue_status: input.queue_status ?? 'queued',
        }),
      ],
    );

    return result.rows[0];
  }

  async getReportCardGenerationBatch(input: { tenant_id: string; batch_id: string }) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          status,
          COALESCE(metadata->>'queue_status', 'queued') AS queue_status,
          total_students,
          completed_students,
          failed_students
        FROM report_card_generation_batches
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.batch_id],
    );

    return result.rows[0] ?? null;
  }

  async listStudentsForReportCardBatch(input: {
    tenant_id: string;
    exam_series_id: string;
    class_section_id?: string | null;
    stream_name?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<Array<{ id: string }>> {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 200;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 200) : 200;
    const offset = Math.max(requestedOffset, 0);

    const result = await this.executeSql<{ id: string }>(
      `
        SELECT DISTINCT student.id::text, student.admission_number, student.created_at
        FROM exam_marks mark
        INNER JOIN students student
          ON student.tenant_id = mark.tenant_id
         AND student.id = mark.student_id::text
         AND student.status = 'active'
        LEFT JOIN student_class_assignments assignment
          ON assignment.tenant_id = student.tenant_id
         AND assignment.student_id = student.id::text
         AND assignment.class_section_id = mark.class_section_id::text
         AND assignment.status = 'active'
        LEFT JOIN class_streams stream
          ON stream.tenant_id = assignment.tenant_id
         AND stream.id = assignment.stream_id
        WHERE mark.tenant_id = $1
          AND mark.exam_series_id = $2::uuid
          AND mark.status IN ('locked', 'published')
          AND ($3::uuid IS NULL OR mark.class_section_id = $3::uuid)
          AND ($4::text IS NULL OR stream.name = $4::text)
        ORDER BY student.admission_number ASC, student.created_at ASC
        LIMIT $5::integer
        OFFSET $6::integer
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.class_section_id ?? null,
        input.stream_name ?? null,
        limit,
        offset,
      ],
    );

    return result.rows;
  }

  async getReportCardBatchReadiness(input: {
    tenant_id: string;
    exam_series_id: string;
    class_section_id?: string | null;
    stream_name?: string | null;
  }) {
    const result = await this.executeSql(
      `WITH selected_windows AS (
         SELECT class_section_id, subject_id
         FROM exam_mark_entry_windows
         WHERE tenant_id = $1
           AND exam_series_id = $2::uuid
           AND ($3::uuid IS NULL OR class_section_id = $3::uuid)
       ), expected AS (
         SELECT DISTINCT
           student.id::text AS student_id,
           mark_window.class_section_id,
           mark_window.subject_id
         FROM selected_windows mark_window
         INNER JOIN student_class_assignments assignment
           ON assignment.tenant_id = $1
          AND assignment.class_section_id = mark_window.class_section_id::text
          AND assignment.status = 'active'
         INNER JOIN students student
           ON student.tenant_id = assignment.tenant_id
          AND student.id::text = assignment.student_id::text
          AND student.status = 'active'
         INNER JOIN student_subject_enrollments enrollment
           ON enrollment.tenant_id = student.tenant_id
          AND enrollment.student_id::text = student.id::text
          AND enrollment.class_section_id = mark_window.class_section_id::text
          AND enrollment.subject_id = mark_window.subject_id::text
          AND enrollment.status = 'active'
         LEFT JOIN class_streams stream
           ON stream.tenant_id = assignment.tenant_id
          AND stream.id::text = assignment.stream_id::text
         WHERE ($4::text IS NULL OR stream.name = $4::text)
       ), readiness AS (
         SELECT
           expected.student_id,
           expected.class_section_id,
           expected.subject_id,
           EXISTS (
             SELECT 1
             FROM exam_marks mark
             WHERE mark.tenant_id = $1
               AND mark.exam_series_id = $2::uuid
               AND mark.student_id::text = expected.student_id
               AND mark.class_section_id = expected.class_section_id
               AND mark.subject_id = expected.subject_id
               AND mark.status IN ('locked', 'published')
           ) AS is_ready
         FROM expected
       )
       SELECT
         COUNT(*)::integer AS expected_mark_count,
         COUNT(*) FILTER (WHERE is_ready)::integer AS ready_mark_count,
         COUNT(*) FILTER (WHERE NOT is_ready)::integer AS not_ready_mark_count,
         COUNT(DISTINCT student_id)::integer AS learner_count
       FROM readiness`,
      [
        input.tenant_id,
        input.exam_series_id,
        input.class_section_id ?? null,
        input.stream_name ?? null,
      ],
    );

    return result.rows[0] ?? {
      expected_mark_count: 0,
      ready_mark_count: 0,
      not_ready_mark_count: 0,
      learner_count: 0,
    };
  }

  async findReportCardArtifactByVerificationCode(input: {
    tenant_id: string;
    verification_code: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          card.id::text AS report_card_id,
          jsonb_build_object(
            'id', student.id::text,
            'full_name', concat_ws(' ', student.first_name, student.middle_name, student.last_name),
            'admission_number', student.admission_number
          ) AS student,
          jsonb_build_object(
            'id', series.id::text,
            'name', series.name
          ) AS exam_series,
          array_agg(DISTINCT artifact.artifact_type ORDER BY artifact.artifact_type) AS artifact_types,
          MAX(artifact.generated_at)::text AS generated_at
        FROM report_card_artifacts artifact
        JOIN student_report_cards card
          ON card.tenant_id = artifact.tenant_id
         AND card.id = artifact.report_card_id
        JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id::text
        JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        WHERE artifact.tenant_id = $1
          AND artifact.verification_code = $2
          AND card.status = 'published'
        GROUP BY card.id, student.id, series.id
        LIMIT 1
      `,
      [input.tenant_id, input.verification_code],
    );

    return result.rows[0] ?? null;
  }

  async loadReportCardData(input: {
    tenant_id: string;
    exam_series_id: string;
    student_id: string;
  }): Promise<Record<string, unknown>> {
    const schoolResult = await this.executeSql(
      `
        SELECT
          tenant.name,
          NULLIF(tenant.settings->>'address', '') AS address,
          NULLIF(tenant.settings->>'phone', '') AS phone,
          NULLIF(tenant.settings->>'email', '') AS email,
          COALESCE(
            NULLIF(tenant.settings->>'logo_storage_path', ''),
            NULLIF(tenant.settings->>'logo_url', '')
          ) AS logo_ref,
          NULLIF(tenant.settings->>'motto', '') AS motto
        FROM tenants tenant
        WHERE tenant.tenant_id = $1
        LIMIT 1
      `,
      [input.tenant_id],
    );
    const seriesResult = await this.executeSql(
      `
        SELECT
          series.id::text,
          series.name,
          term.name AS academic_term_name,
          year.name AS academic_year_name
        FROM exam_series series
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id::text = series.academic_term_id::text
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        WHERE series.tenant_id = $1
          AND series.id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.exam_series_id],
    );
    const studentResult = await this.executeSql(
      `
        SELECT
          student.id::text,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS full_name,
          student.admission_number,
          class_section.name AS class_name,
          stream.name AS stream_name
        FROM students student
        LEFT JOIN student_class_assignments assignment
          ON assignment.tenant_id = student.tenant_id
         AND assignment.student_id = student.id::text
         AND assignment.status = 'active'
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = assignment.tenant_id
         AND class_section.id = assignment.class_section_id
        LEFT JOIN class_streams stream
          ON stream.tenant_id = assignment.tenant_id
         AND stream.id = assignment.stream_id
        WHERE student.tenant_id = $1
          AND student.id = $2::text
        LIMIT 1
      `,
      [input.tenant_id, input.student_id],
    );
    const gradingPolicyResult = await this.executeSql(
      `
        SELECT
          policy.id::text,
          policy.name,
          policy.reporting_mode,
          policy.version,
          policy.effective_from::text,
          policy.effective_to::text,
          policy.scope
        FROM exam_grading_policies policy
        WHERE policy.tenant_id = $1
          AND policy.status = 'active'
          AND (policy.exam_series_id = $2::uuid OR policy.exam_series_id IS NULL)
          AND (policy.effective_from IS NULL OR policy.effective_from <= NOW())
          AND (policy.effective_to IS NULL OR policy.effective_to > NOW())
        ORDER BY
          (policy.exam_series_id = $2::uuid) DESC,
          policy.version DESC,
          policy.activated_at DESC NULLS LAST,
          policy.created_at DESC
        LIMIT 1
      `,
      [input.tenant_id, input.exam_series_id],
    );
    const subjectsResult = await this.executeSql(
      `
        WITH selected_policy AS (
          SELECT policy.id, policy.version
          FROM exam_grading_policies policy
          WHERE policy.tenant_id = $1
            AND policy.status = 'active'
            AND (policy.exam_series_id = $2::uuid OR policy.exam_series_id IS NULL)
            AND (policy.effective_from IS NULL OR policy.effective_from <= NOW())
            AND (policy.effective_to IS NULL OR policy.effective_to > NOW())
          ORDER BY
            (policy.exam_series_id = $2::uuid) DESC,
            policy.version DESC,
            policy.activated_at DESC NULLS LAST,
            policy.created_at DESC
          LIMIT 1
        )
        SELECT
          mark.subject_id::text,
          COALESCE(subject.name, assessment.name, 'Subject') AS subject_name,
          mark.score::float AS score,
          mark.score_status,
          assessment.max_score::float AS max_score,
          CASE
            WHEN mark.score_status = 'entered' AND assessment.max_score > 0
              THEN ROUND((mark.score / assessment.max_score) * 100, 2)::float
            ELSE NULL
          END AS percentage,
          COALESCE(policy_boundary.label, legacy_boundary.label) AS grade_label,
          policy_boundary.points::float AS points,
          policy_boundary.descriptor,
          policy_boundary.is_pass,
          COALESCE(
            mark.remarks,
            policy_boundary.remark,
            policy_boundary.descriptor,
            legacy_boundary.remarks
          ) AS remarks
        FROM exam_marks mark
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark.tenant_id
         AND subject.id = mark.subject_id::text
        LEFT JOIN selected_policy policy ON TRUE
        LEFT JOIN LATERAL (
          SELECT boundary.*
          FROM exam_grading_policy_boundaries boundary
          WHERE boundary.tenant_id = mark.tenant_id
            AND boundary.grading_policy_id = policy.id
            AND mark.score_status = 'entered'
            AND assessment.max_score > 0
            AND boundary.min_score <= ((mark.score / assessment.max_score) * 100)
          ORDER BY boundary.min_score DESC
          LIMIT 1
        ) policy_boundary ON TRUE
        LEFT JOIN exam_grade_boundaries legacy_boundary
          ON legacy_boundary.tenant_id = mark.tenant_id
         AND legacy_boundary.exam_series_id = mark.exam_series_id
         AND policy.id IS NULL
         AND mark.score_status = 'entered'
         AND assessment.max_score > 0
         AND ((mark.score / assessment.max_score) * 100)
           BETWEEN legacy_boundary.min_score AND legacy_boundary.max_score
        WHERE mark.tenant_id = $1
          AND mark.exam_series_id = $2::uuid
          AND mark.student_id = $3::uuid
          AND mark.status IN ('locked', 'published')
        ORDER BY subject.name NULLS LAST, assessment.name
      `,
      [input.tenant_id, input.exam_series_id, input.student_id],
    );

    return {
      school: schoolResult.rows[0] ?? null,
      exam_series: seriesResult.rows[0] ?? null,
      student: studentResult.rows[0] ?? null,
      grading_policy: gradingPolicyResult.rows[0] ?? null,
      subjects: subjectsResult.rows,
      attendance: null,
    };
  }

  async listReportCards(input: {
    tenant_id: string;
    student_id?: string;
    status_in?: string[];
    limit?: number;
    offset?: number;
  }) {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 25;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 50) : 25;
    const offset = Math.max(requestedOffset, 0);
    const params: unknown[] = [input.tenant_id, input.student_id ?? null, limit, offset];
    const statusClause = input.status_in?.length ? 'AND card.status = ANY($5::text[])' : '';
    if (input.status_in?.length) params.push(input.status_in);

    const result = await this.executeSql(
      `
        SELECT
          card.id::text,
          card.tenant_id,
          card.exam_series_id::text,
          card.student_id::text,
          card.report_snapshot_id,
          card.status,
          card.verification_code,
          card.published_by_user_id::text,
          card.revision_number,
          card.is_current,
          card.supersedes_report_card_id::text,
          card.grading_policy_id::text,
          card.grading_policy_version,
          card.template_version,
          card.approved_result_version,
          card.submitted_by_user_id::text,
          card.submitted_at::text,
          card.approved_by_user_id::text,
          card.approved_at::text,
          card.approval_role,
          card.withdrawn_by_user_id::text,
          card.withdrawn_at::text,
          card.workflow_version,
          card.published_at::text,
          card.metadata,
          card.created_at::text,
          card.updated_at::text,
          series.name AS exam_series_name,
          term.name AS term,
          year.name AS academic_year,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number
        FROM student_report_cards card
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id::text = series.academic_term_id::text
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        LEFT JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id::text
        WHERE card.tenant_id = $1
          AND ($2::uuid IS NULL OR card.student_id = $2::uuid)
          AND card.is_current = TRUE
          ${statusClause}
        ORDER BY card.published_at DESC NULLS LAST, card.created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      params,
    );

    return result.rows;
  }

  async listGuardianReportCards(input: {
    tenant_id: string;
    guardian_user_id: string;
    student_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 25;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 50) : 25;
    const offset = Math.max(requestedOffset, 0);
    const result = await this.executeSql(
      `
        SELECT
          card.id::text,
          card.tenant_id,
          card.exam_series_id::text,
          card.student_id::text,
          card.report_snapshot_id,
          card.status,
          card.verification_code,
          card.published_at::text,
          card.revision_number,
          card.grading_policy_id::text,
          card.grading_policy_version,
          card.template_version,
          card.approved_result_version,
          card.metadata,
          card.created_at::text,
          card.updated_at::text,
          series.name AS exam_series_name,
          term.name AS term,
          year.name AS academic_year,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number
        FROM student_report_cards card
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = card.tenant_id
         AND guardian.student_id = card.student_id::text
         AND guardian.user_id = $2::uuid
         AND guardian.status = 'active'
        INNER JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id::text
         AND student.status <> 'archived'
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id::text = series.academic_term_id::text
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        WHERE card.tenant_id = $1
          AND card.status = 'published'
          AND card.is_current = TRUE
          AND ($3::uuid IS NULL OR card.student_id = $3::uuid)
        ORDER BY card.published_at DESC NULLS LAST, card.created_at DESC
        LIMIT $4::integer
        OFFSET $5::integer
      `,
      [input.tenant_id, input.guardian_user_id, input.student_id ?? null, limit, offset],
    );

    return result.rows;
  }

  async listStudentReportCards(input: {
    tenant_id: string;
    student_id: string;
    limit?: number;
    offset?: number;
  }) {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 25;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 50) : 25;
    const offset = Math.max(requestedOffset, 0);
    const result = await this.executeSql(
      `
        SELECT
          card.id::text,
          card.tenant_id,
          card.exam_series_id::text,
          card.student_id::text,
          card.report_snapshot_id,
          card.status,
          card.verification_code,
          card.published_at::text,
          card.revision_number,
          card.grading_policy_id::text,
          card.grading_policy_version,
          card.template_version,
          card.approved_result_version,
          card.metadata,
          card.created_at::text,
          card.updated_at::text,
          series.name AS exam_series_name,
          term.name AS term,
          year.name AS academic_year,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number
        FROM student_report_cards card
        INNER JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id::text
         AND student.status <> 'archived'
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id::text = series.academic_term_id::text
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        WHERE card.tenant_id = $1
          AND card.student_id = $2::uuid
          AND card.status = 'published'
          AND card.is_current = TRUE
        ORDER BY card.published_at DESC NULLS LAST, card.created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      [input.tenant_id, input.student_id, limit, offset],
    );

    return result.rows;
  }

  async findReportCardForGuardian(input: {
    tenant_id: string;
    report_card_id: string;
    guardian_user_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT card.*
        FROM student_report_cards card
        JOIN student_guardians guardian
          ON guardian.tenant_id = card.tenant_id
         AND guardian.student_id = card.student_id::text
         AND guardian.user_id = $3::uuid
         AND guardian.status = 'active'
        WHERE card.tenant_id = $1
          AND card.id = $2::uuid
          AND card.status = 'published'
          AND card.is_current = TRUE
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.report_card_id,
        input.guardian_user_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findReportCardForStudent(input: {
    tenant_id: string;
    report_card_id: string;
    student_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT card.*
        FROM student_report_cards card
        INNER JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id::text
         AND student.status <> 'archived'
        WHERE card.tenant_id = $1
          AND card.id = $2::uuid
          AND card.student_id = $3::uuid
          AND card.status = 'published'
          AND card.is_current = TRUE
        LIMIT 1
      `,
      [
        input.tenant_id,
        input.report_card_id,
        input.student_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findAssessmentScope(input: { tenant_id: string; assessment_id: string }) {
    const result = await this.executeSql(
      `
        SELECT
          assessment.id::text,
          assessment.exam_series_id::text,
          series.academic_term_id::text,
          assessment.subject_id::text,
          COALESCE(entry_window.class_section_id::text, '') AS class_section_id,
          assessment.max_score::text
        FROM exam_assessments assessment
        JOIN exam_series series
          ON series.tenant_id = assessment.tenant_id
         AND series.id = assessment.exam_series_id
        LEFT JOIN exam_mark_entry_windows entry_window
          ON entry_window.tenant_id = assessment.tenant_id
         AND entry_window.exam_series_id = assessment.exam_series_id
         AND entry_window.subject_id = assessment.subject_id
        WHERE assessment.tenant_id = $1
          AND assessment.id = $2::uuid
        ORDER BY entry_window.created_at DESC NULLS LAST
        LIMIT 1
      `,
      [input.tenant_id, input.assessment_id],
    );

    return result.rows[0] ?? null;
  }

  async findStudentMarkEligibility(input: {
    tenant_id: string;
    student_id: string;
    class_section_id: string;
    subject_id: string;
  }) {
    const result = await this.executeSql(
      `SELECT student.id::text
       FROM students student
       WHERE student.tenant_id = $1
         AND student.id::text = $2::text
         AND student.status = 'active'
         AND EXISTS (
           SELECT 1
           FROM student_class_assignments class_assignment
           WHERE class_assignment.tenant_id = student.tenant_id
             AND class_assignment.student_id = student.id::text
             AND class_assignment.class_section_id = $3::text
             AND class_assignment.status = 'active'
         )
         AND EXISTS (
           SELECT 1
           FROM student_subject_enrollments subject_enrollment
           WHERE subject_enrollment.tenant_id = student.tenant_id
             AND subject_enrollment.student_id = student.id::text
             AND subject_enrollment.class_section_id = $3::text
             AND subject_enrollment.subject_id = $4::text
             AND subject_enrollment.status = 'active'
         )
       LIMIT 1`,
      [
        input.tenant_id,
        input.student_id,
        input.class_section_id,
        input.subject_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findGradeBoundaryForScore(input: {
    tenant_id: string;
    exam_series_id: string;
    score: number;
  }) {
    const result = await this.executeSql(
      `
        WITH configured AS (
          SELECT
            id::text,
            label,
            min_score,
            max_score,
            remarks
          FROM exam_grade_boundaries
          WHERE tenant_id = $1
            AND exam_series_id = $2::uuid
        ),
        matches AS (
          SELECT *
          FROM configured
          WHERE $3::numeric BETWEEN min_score AND max_score
        )
        SELECT
          (SELECT COUNT(*)::int FROM configured) AS configured_count,
          (SELECT COUNT(*)::int FROM matches) AS match_count,
          (
            SELECT jsonb_build_object(
              'id', id,
              'label', label,
              'min_score', min_score::float,
              'max_score', max_score::float,
              'remarks', remarks
            )
            FROM matches
            ORDER BY min_score DESC, max_score ASC
            LIMIT 1
          ) AS boundary
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.score,
      ],
    );

    return result.rows[0] ?? {
      configured_count: 0,
      match_count: 0,
      boundary: null,
    };
  }

  async listMarkSheets(input: {
    tenant_id: string;
    teacher_user_id?: string;
    exam_series_id?: string;
    class_section_id?: string;
    subject_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    const result = await this.executeSql(
      `
        SELECT
          mark_window.id::text,
          mark_window.exam_series_id::text,
          COALESCE(series.name, 'Exam series') AS exam_series_name,
          mark_window.subject_id::text,
          COALESCE(subject.name, subject.code, 'Subject') AS subject_name,
          mark_window.class_section_id::text,
          COALESCE(class_section.custom_label, class_section.name, 'Class') AS class_name,
          mark_window.opens_at::text,
          mark_window.closes_at::text,
          mark_window.status,
          COUNT(mark.id)::int AS mark_count,
          COUNT(mark.id) FILTER (WHERE mark.status = 'draft')::int AS draft_mark_count,
          COUNT(mark.id) FILTER (WHERE mark.status = 'submitted')::int AS submitted_mark_count,
          COUNT(mark.id) FILTER (WHERE mark.status = 'reviewed')::int AS reviewed_mark_count,
          COUNT(mark.id) FILTER (WHERE mark.status = 'locked')::int AS locked_mark_count,
          COUNT(mark.id) FILTER (WHERE mark.status = 'published')::int AS published_mark_count,
          MAX(mark.updated_at)::text AS last_marked_at
        FROM exam_mark_entry_windows mark_window
        INNER JOIN exam_series series
          ON series.tenant_id = mark_window.tenant_id
         AND series.id = mark_window.exam_series_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark_window.tenant_id
         AND subject.id = mark_window.subject_id::text
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = mark_window.tenant_id
         AND class_section.id = mark_window.class_section_id::text
        LEFT JOIN exam_marks mark
          ON mark.tenant_id = mark_window.tenant_id
         AND mark.exam_series_id = mark_window.exam_series_id
         AND mark.subject_id = mark_window.subject_id
         AND mark.class_section_id = mark_window.class_section_id
        WHERE mark_window.tenant_id = $1
          AND ($2::uuid IS NULL OR mark_window.exam_series_id = $2::uuid)
          AND ($3::uuid IS NULL OR mark_window.class_section_id = $3::uuid)
          AND ($4::uuid IS NULL OR mark_window.subject_id = $4::uuid)
          AND (
            $5::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM exam_series series
              JOIN teacher_subject_assignments assignment
                ON assignment.tenant_id = series.tenant_id
               AND assignment.academic_term_id = series.academic_term_id::text
               AND assignment.class_section_id = mark_window.class_section_id::text
               AND assignment.subject_id = mark_window.subject_id::text
               AND assignment.teacher_user_id = $5::text
               AND assignment.status = 'active'
              WHERE series.tenant_id = mark_window.tenant_id
                AND series.id = mark_window.exam_series_id
            )
          )
        GROUP BY mark_window.id, series.name, subject.name, subject.code,
          class_section.custom_label, class_section.name
        ORDER BY mark_window.closes_at DESC, mark_window.opens_at DESC
        LIMIT $6::integer
        OFFSET $7::integer
      `,
      [
        input.tenant_id,
        input.exam_series_id ?? null,
        input.class_section_id ?? null,
        input.subject_id ?? null,
        input.teacher_user_id ?? null,
        limit,
        offset,
      ],
    );

    return result.rows;
  }

  async lockMarkSheet(input: {
    tenant_id: string;
    mark_sheet_id: string;
    actor_user_id: string;
  }) {
    const result = await this.executeSql(
      `
        UPDATE exam_mark_entry_windows
        SET status = 'closed',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING
          id::text,
          exam_series_id::text,
          subject_id::text,
          class_section_id::text,
          opens_at::text,
          closes_at::text,
          status,
          updated_at::text,
          $3::text AS locked_by_user_id
      `,
      [
        input.tenant_id,
        input.mark_sheet_id,
        input.actor_user_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async submitMarks(input: { tenant_id: string; actor_user_id: string; mark_ids: string[]; restrict_to_actor?: boolean }) {
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET status = 'submitted',
            submitted_at = COALESCE(submitted_at, NOW()),
            updated_by_user_id = $3::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = ANY($2::uuid[])
          AND status IN ('draft', 'submitted')
          AND ($4::boolean = FALSE OR entered_by_user_id = $3::uuid)
        RETURNING id::text
      `,
      [input.tenant_id, input.mark_ids, input.actor_user_id, Boolean(input.restrict_to_actor)],
    );

    return {
      submitted_count: result.rows.length,
      mark_ids: result.rows.map((row: any) => row.id),
      submitted_by_user_id: input.actor_user_id,
    };
  }

  async appendMarkAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO exam_mark_audit_logs (
          tenant_id,
          mark_id,
          exam_series_id,
          assessment_id,
          student_id,
          action,
          actor_user_id,
          previous_score,
          new_score,
          reason,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7::uuid, $8::numeric, $9::numeric, $10, $11::jsonb)
      `,
      [
        input.tenant_id,
        input.mark_id ?? null,
        input.exam_series_id ?? null,
        input.assessment_id ?? null,
        input.student_id ?? null,
        input.action,
        input.actor_user_id ?? null,
        input.previous_score ?? null,
        input.new_score ?? null,
        input.reason ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async appendReportCardAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO student_report_card_audit_logs (
          tenant_id,
          report_card_id,
          exam_series_id,
          student_id,
          action,
          actor_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6::uuid, $7::jsonb)
      `,
      [
        input.tenant_id,
        input.report_card_id ?? null,
        input.exam_series_id ?? null,
        input.student_id ?? null,
        input.action,
        input.actor_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async getExamSettings(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          lock_after_deadline,
          grace_period_hours,
          include_school_logo,
          include_principal_signature,
          include_official_stamp,
          block_results_for_fee_balances,
          fee_balance_block_threshold::float,
          show_student_rank_to_parents,
          updated_by_user_id::text,
          created_at::text,
          updated_at::text
        FROM exam_settings
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );

    return result.rows[0] ?? null;
  }

  async transitionMarkWindow(input: { tenant_id: string; actor_user_id: string; mark_window_id: string; action: string; reason?: string }) {
    const result = await this.executeSql(
      `WITH window_scope AS (
         SELECT id, exam_series_id, class_section_id, subject_id
         FROM exam_mark_entry_windows
         WHERE tenant_id = $1 AND id = $3::uuid
       ), mark_state AS (
         SELECT
           COUNT(mark.id)::integer AS total_marks,
           COUNT(mark.id) FILTER (WHERE mark.status NOT IN ('reviewed', 'locked', 'published'))::integer AS blockers,
           COUNT(mark.id) FILTER (WHERE mark.status = 'published')::integer AS published_marks
         FROM window_scope
         LEFT JOIN exam_marks mark
           ON mark.tenant_id = $1
          AND mark.exam_series_id = window_scope.exam_series_id
          AND mark.class_section_id = window_scope.class_section_id
          AND mark.subject_id = window_scope.subject_id
       ), changed_marks AS (
         UPDATE exam_marks mark
         SET status = CASE WHEN $4 = 'return' THEN 'draft' ELSE 'locked' END,
             updated_by_user_id = $2::uuid,
             locked_at = CASE WHEN $4 = 'lock' THEN NOW() ELSE NULL END,
             updated_at = NOW()
         FROM window_scope, mark_state
         WHERE mark.tenant_id = $1
           AND mark.exam_series_id = window_scope.exam_series_id
           AND mark.class_section_id = window_scope.class_section_id
           AND mark.subject_id = window_scope.subject_id
           AND (($4 = 'lock' AND mark.status = 'reviewed' AND mark_state.blockers = 0)
             OR ($4 = 'return' AND mark.status IN ('submitted', 'reviewed', 'locked') AND mark_state.published_marks = 0))
         RETURNING mark.id
       ), changed_summary AS (
         SELECT COUNT(*)::integer AS affected_marks FROM changed_marks
       )
       UPDATE exam_mark_entry_windows mark_window
       SET status = CASE WHEN $4 = 'lock' THEN 'closed' ELSE 'open' END,
           opens_at = CASE WHEN $4 = 'open' THEN LEAST(mark_window.opens_at, NOW()) ELSE mark_window.opens_at END,
           last_action = CASE WHEN $4 = 'return' THEN 'returned' WHEN $4 = 'lock' THEN 'locked' ELSE 'opened' END,
           last_action_at = NOW(),
           last_action_by_user_id = $2::uuid,
           return_reason = CASE WHEN $4 = 'return' THEN $5 ELSE NULL END,
           updated_at = NOW()
       FROM mark_state, changed_summary
       WHERE mark_window.tenant_id = $1
         AND mark_window.id = $3::uuid
         AND (
           $4 = 'open'
           OR ($4 = 'lock' AND mark_state.total_marks > 0 AND mark_state.blockers = 0)
           OR ($4 = 'return' AND mark_state.total_marks > 0 AND mark_state.published_marks = 0)
         )
       RETURNING mark_window.*, mark_window.last_action AS workflow_status, changed_summary.affected_marks`,
      [input.tenant_id, input.actor_user_id, input.mark_window_id, input.action, input.reason ?? null],
    );
    return result.rows[0] ?? null;
  }

  async findMarkWindowRecipients(input: { tenant_id: string; mark_window_id: string }) {
    const result = await this.executeSql(
      `SELECT
         mark_window.id::text,
         COALESCE(class_section.name, mark_window.class_section_id::text) AS class_name,
         COALESCE(subject.name, mark_window.subject_id::text) AS subject_name,
         mark_window.closes_at::text,
         COALESCE(array_remove(array_agg(DISTINCT assignment.teacher_user_id::text), NULL), ARRAY[]::text[]) AS recipient_user_ids
       FROM exam_mark_entry_windows mark_window
       INNER JOIN exam_series series
         ON series.tenant_id = mark_window.tenant_id AND series.id = mark_window.exam_series_id
       LEFT JOIN teacher_subject_assignments assignment
         ON assignment.tenant_id = mark_window.tenant_id
        AND assignment.academic_term_id = series.academic_term_id::text
        AND assignment.class_section_id = mark_window.class_section_id::text
        AND assignment.subject_id = mark_window.subject_id::text
        AND assignment.status = 'active'
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = mark_window.tenant_id AND class_section.id = mark_window.class_section_id::text
       LEFT JOIN subjects subject
         ON subject.tenant_id = mark_window.tenant_id AND subject.id = mark_window.subject_id::text
       WHERE mark_window.tenant_id = $1 AND mark_window.id = $2::uuid
       GROUP BY mark_window.id, class_section.name, subject.name
       LIMIT 1`,
      [input.tenant_id, input.mark_window_id],
    );
    return result.rows[0] ?? null;
  }

  async processResultBatch(input: { tenant_id: string; actor_user_id: string; batch_id: string; mode: 'aggregates' | 'rankings' }) {
    const result = await this.executeSql(
      `WITH batch_scope AS (
         SELECT id, exam_series_id, class_section_id
         FROM report_card_generation_batches
         WHERE tenant_id = $1 AND id = $3::uuid
       ), scores AS (
         SELECT
           batch_scope.id AS batch_id,
           batch_scope.exam_series_id,
           batch_scope.class_section_id,
           mark.student_id,
           ROUND(SUM(mark.score)::numeric, 2) AS raw_total,
           COUNT(*)::integer AS assessment_count,
           ROUND(AVG((mark.score / assessment.max_score) * 100)::numeric, 2) AS average_percentage
         FROM batch_scope
         INNER JOIN exam_marks mark
           ON mark.tenant_id = $1
          AND mark.exam_series_id = batch_scope.exam_series_id
          AND (batch_scope.class_section_id IS NULL OR mark.class_section_id = batch_scope.class_section_id)
          AND mark.status IN ('reviewed', 'locked', 'published')
         INNER JOIN exam_assessments assessment
           ON assessment.tenant_id = mark.tenant_id
          AND assessment.id = mark.assessment_id
          AND assessment.max_score > 0
         GROUP BY batch_scope.id, batch_scope.exam_series_id, batch_scope.class_section_id, mark.student_id
       ), ranked AS (
         SELECT scores.*,
           CASE WHEN $4 = 'rankings'
             THEN DENSE_RANK() OVER (ORDER BY average_percentage DESC, raw_total DESC)::integer
             ELSE NULL
           END AS class_rank
         FROM scores
       ), removed AS (
         DELETE FROM exam_result_snapshots
         WHERE tenant_id = $1 AND batch_id = $3::uuid
         RETURNING id
       ), imported AS (
         INSERT INTO exam_result_snapshots (
           tenant_id, batch_id, exam_series_id, class_section_id, student_id,
           raw_total, assessment_count, average_percentage, grade_label,
           class_rank, processed_by_user_id
         )
         SELECT
           $1, ranked.batch_id, ranked.exam_series_id, ranked.class_section_id, ranked.student_id,
           ranked.raw_total, ranked.assessment_count, ranked.average_percentage, boundary.label,
           ranked.class_rank, $2::uuid
         FROM ranked
         CROSS JOIN (SELECT COUNT(*) FROM removed) cleanup
         LEFT JOIN LATERAL (
           SELECT label
           FROM exam_grade_boundaries
           WHERE tenant_id = $1
             AND exam_series_id = ranked.exam_series_id
             AND ranked.average_percentage BETWEEN min_score AND max_score
           ORDER BY min_score DESC
           LIMIT 1
         ) boundary ON TRUE
         RETURNING id, class_rank
       ), summary AS (
         SELECT COUNT(*)::integer AS aggregate_count, COUNT(class_rank)::integer AS ranked_count
         FROM imported
       ), updated AS (
         UPDATE report_card_generation_batches batch
         SET metadata = jsonb_set(
               batch.metadata,
               '{results_processing}',
               jsonb_build_object(
                 'mode', $4::text,
                 'aggregate_count', summary.aggregate_count,
                 'ranked_count', summary.ranked_count,
                 'processed_at', NOW(),
                 'processed_by_user_id', $2::text
               ),
               TRUE
             ),
             updated_at = NOW()
         FROM summary
         WHERE batch.tenant_id = $1
           AND batch.id = $3::uuid
           AND EXISTS (SELECT 1 FROM batch_scope)
         RETURNING batch.id::text, batch.metadata->'results_processing'->>'processed_at' AS processed_at
       )
       SELECT updated.id AS batch_id, summary.aggregate_count, summary.ranked_count, updated.processed_at
       FROM updated CROSS JOIN summary`,
      [input.tenant_id, input.actor_user_id, input.batch_id, input.mode],
    );
    return result.rows[0] ?? null;
  }

  async clearResultProcessing(input: { tenant_id: string; actor_user_id: string; batch_id: string }) {
    const result = await this.executeSql(
      `WITH removed AS (
         DELETE FROM exam_result_snapshots
         WHERE tenant_id = $1 AND batch_id = $3::uuid
         RETURNING id
       ), summary AS (
         SELECT COUNT(*)::integer AS removed_count FROM removed
       )
       UPDATE report_card_generation_batches batch
       SET metadata = batch.metadata - 'results_processing', updated_at = NOW()
       FROM summary
       WHERE batch.tenant_id = $1 AND batch.id = $3::uuid
       RETURNING batch.id::text AS batch_id, summary.removed_count, $2::text AS cleared_by_user_id`,
      [input.tenant_id, input.actor_user_id, input.batch_id],
    );
    return result.rows[0] ?? null;
  }

  async getResultBroadsheet(input: { tenant_id: string; batch_id: string }) {
    const result = await this.executeSql(
      `SELECT
         batch.id::text AS batch_id,
         batch.exam_series_id::text,
         COALESCE(series.name, 'Exam series') AS exam_series_name,
         COALESCE(result_rows.rows, '[]'::jsonb) AS rows
       FROM report_card_generation_batches batch
       LEFT JOIN exam_series series
         ON series.tenant_id = batch.tenant_id AND series.id = batch.exam_series_id
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(to_jsonb(output_row) ORDER BY output_row.class_rank NULLS LAST, output_row.admission_number) AS rows
         FROM (
           SELECT
             snapshot.student_id::text,
             student.admission_number,
             concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
             snapshot.raw_total::float,
             snapshot.assessment_count,
             snapshot.average_percentage::float,
             snapshot.grade_label,
             snapshot.class_rank,
             snapshot.processed_at::text
           FROM exam_result_snapshots snapshot
           INNER JOIN students student
             ON student.tenant_id = snapshot.tenant_id AND student.id = snapshot.student_id
           WHERE snapshot.tenant_id = $1 AND snapshot.batch_id = batch.id
           ORDER BY snapshot.class_rank NULLS LAST, student.admission_number
           LIMIT 5000
         ) output_row
       ) result_rows ON TRUE
       WHERE batch.tenant_id = $1 AND batch.id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.batch_id],
    );
    return result.rows[0] ?? null;
  }

  async upsertExamSettings(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_settings (
          tenant_id,
          lock_after_deadline,
          grace_period_hours,
          include_school_logo,
          include_principal_signature,
          include_official_stamp,
          block_results_for_fee_balances,
          fee_balance_block_threshold,
          show_student_rank_to_parents,
          updated_by_user_id
        )
        VALUES ($1, $2::boolean, $3::integer, $4::boolean, $5::boolean, $6::boolean, $7::boolean, $8::numeric, $9::boolean, $10::uuid)
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          lock_after_deadline = EXCLUDED.lock_after_deadline,
          grace_period_hours = EXCLUDED.grace_period_hours,
          include_school_logo = EXCLUDED.include_school_logo,
          include_principal_signature = EXCLUDED.include_principal_signature,
          include_official_stamp = EXCLUDED.include_official_stamp,
          block_results_for_fee_balances = EXCLUDED.block_results_for_fee_balances,
          fee_balance_block_threshold = EXCLUDED.fee_balance_block_threshold,
          show_student_rank_to_parents = EXCLUDED.show_student_rank_to_parents,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = NOW()
        RETURNING
          id::text,
          tenant_id,
          lock_after_deadline,
          grace_period_hours,
          include_school_logo,
          include_principal_signature,
          include_official_stamp,
          block_results_for_fee_balances,
          fee_balance_block_threshold::float,
          show_student_rank_to_parents,
          updated_by_user_id::text,
          created_at::text,
          updated_at::text
      `,
      [
        input.tenant_id,
        input.lock_after_deadline,
        input.grace_period_hours,
        input.include_school_logo,
        input.include_principal_signature,
        input.include_official_stamp,
        input.block_results_for_fee_balances,
        input.fee_balance_block_threshold,
        input.show_student_rank_to_parents,
        input.updated_by_user_id ?? null,
      ],
    );

    return result.rows[0];
  }

  async appendExamSettingsAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO exam_settings_audit_logs (
          tenant_id,
          action,
          actor_user_id,
          previous_settings,
          new_settings,
          metadata
        )
        VALUES ($1, $2, $3::uuid, $4::jsonb, $5::jsonb, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.action,
        input.actor_user_id ?? null,
        JSON.stringify(input.previous_settings ?? {}),
        JSON.stringify(input.new_settings ?? {}),
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

  async listMarks(input: {
    tenant_id: string;
    status_in?: string[];
    department_id?: string;
    department_ids?: string[];
    limit?: number;
    offset?: number;
  }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    const departmentIds = Array.isArray(input.department_ids)
      ? input.department_ids.filter((departmentId) => typeof departmentId === 'string' && departmentId.trim()).map((departmentId) => departmentId.trim())
      : [];
    
    let query = `
      SELECT m.*
      FROM exam_marks m
    `;
    const params: any[] = [input.tenant_id];
    let paramIndex = 2;
    
    if (input.department_id || departmentIds.length > 0) {
      query += ` JOIN subjects s ON s.id = m.subject_id AND s.tenant_id = m.tenant_id `;
    }
    query += ` WHERE m.tenant_id = $1 `;
    
    if (departmentIds.length > 0) {
      query += ` AND s.department_id = ANY($${paramIndex}::uuid[]) `;
      params.push(departmentIds);
      paramIndex++;
    } else if (input.department_id) {
      query += ` AND s.department_id = $${paramIndex}::uuid `;
      params.push(input.department_id);
      paramIndex++;
    }
    
    if (input.status_in && input.status_in.length > 0) {
      query += ` AND m.status = ANY($${paramIndex}::text[]) `;
      params.push(input.status_in);
      paramIndex++;
    }
    
    query += ` ORDER BY m.updated_at DESC LIMIT $${paramIndex}::integer OFFSET $${paramIndex + 1}::integer `;
    params.push(limit, offset);
    
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async moderateMarks(input: {
    tenant_id: string;
    mark_ids: string[];
    action: 'approve' | 'return_for_correction';
    actor_user_id: string;
    department_ids?: string[];
  }) {
    const status = input.action === 'approve' ? 'reviewed' : 'draft';
    const departmentIds = Array.isArray(input.department_ids)
      ? input.department_ids.filter((departmentId) => typeof departmentId === 'string' && departmentId.trim()).map((departmentId) => departmentId.trim())
      : [];
    const departmentJoin = departmentIds.length > 0
      ? `
        FROM subjects subject
        WHERE mark.tenant_id = $1
          AND subject.id = mark.subject_id::text
          AND subject.tenant_id = mark.tenant_id
          AND subject.department_id = ANY($6::uuid[])
      `
      : `
        WHERE tenant_id = $1
      `;
    const statusPredicate = departmentIds.length > 0
      ? `
          AND mark.id = ANY($2::uuid[])
          AND (
            ($5::text = 'approve' AND mark.status = 'submitted')
            OR ($5::text = 'return_for_correction' AND mark.status IN ('submitted', 'reviewed'))
          )
      `
      : `
          AND id = ANY($2::uuid[])
          AND (
            ($5::text = 'approve' AND status = 'submitted')
            OR ($5::text = 'return_for_correction' AND status IN ('submitted', 'reviewed'))
          )
      `;
    const result = await this.executeSql(
      `
        UPDATE exam_marks${departmentIds.length > 0 ? ' mark' : ''}
        SET status = $3,
            updated_by_user_id = $4::uuid,
            reviewed_at = CASE WHEN $3 = 'reviewed' THEN NOW() ELSE reviewed_at END,
            updated_at = NOW()
        ${departmentJoin}
        ${statusPredicate}
        RETURNING ${departmentIds.length > 0 ? 'mark.*' : '*'}
      `,
      departmentIds.length > 0
        ? [input.tenant_id, input.mark_ids, status, input.actor_user_id, input.action, departmentIds]
        : [input.tenant_id, input.mark_ids, status, input.actor_user_id, input.action]
    );
    return result.rows;
  }

  async listDepartmentsLedByUser(input: { tenant_id: string; user_id: string }) {
    const result = await this.executeSql(
      `
        SELECT department.id::text
        FROM academics_departments department
        WHERE department.tenant_id = $1
          AND department.head_of_department_user_id = $2::uuid
          AND department.is_active = true
        ORDER BY department.name ASC
      `,
      [input.tenant_id, input.user_id],
    );

    return result.rows.map((row: Record<string, unknown>) => String(row.id));
  }

  async lockMarks(input: {
    tenant_id: string;
    mark_ids: string[];
    actor_user_id: string;
  }) {
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET status = 'locked',
            updated_by_user_id = $3::uuid,
            locked_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = ANY($2::uuid[])
          AND status = 'reviewed'
        RETURNING *
      `,
      [input.tenant_id, input.mark_ids, input.actor_user_id]
    );
    return result.rows;
  }

  async publishExamSeries(input: {
    tenant_id: string;
    exam_series_id: string;
    actor_user_id: string;
    actor_role: string;
  }) {
    const result = await this.executeSql(
      `
        WITH readiness AS MATERIALIZED (
          SELECT
            COUNT(*)::integer AS total_count,
            COUNT(*) FILTER (WHERE card.status = 'approved')::integer AS approved_count,
            COUNT(*) FILTER (WHERE card.status = 'published')::integer AS already_published_count,
            COUNT(*) FILTER (WHERE card.status NOT IN ('approved', 'published'))::integer AS blocked_count
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.is_current = TRUE
        ), release_allowed AS (
          SELECT 1
          FROM readiness
          WHERE total_count > 0
            AND blocked_count = 0
        ), published_cards AS (
          UPDATE student_report_cards card
          SET status = 'published',
              published_by_user_id = $3::uuid,
              published_at = NOW(),
              withdrawn_by_user_id = NULL,
              withdrawn_at = NULL,
              workflow_version = card.workflow_version + 1,
              metadata = card.metadata || jsonb_build_object(
                'last_transition', 'publish',
                'transitioned_by', $3::text,
                'transitioned_by_role', $4::text,
                'transitioned_at', NOW()
              ),
              updated_at = NOW()
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.is_current = TRUE
            AND card.status = 'approved'
            AND EXISTS (SELECT 1 FROM release_allowed)
          RETURNING
            card.id::text,
            card.exam_series_id::text,
            card.student_id::text,
            card.status,
            card.workflow_version,
            card.updated_at::text
        ), report_card_audits AS (
          INSERT INTO student_report_card_audit_logs (
            tenant_id,
            report_card_id,
            exam_series_id,
            student_id,
            action,
            actor_user_id,
            metadata
          )
          SELECT
            $1,
            published_cards.id::uuid,
            published_cards.exam_series_id::uuid,
            published_cards.student_id::uuid,
            'report_card.published',
            $3::uuid,
            jsonb_build_object(
              'resulting_status', 'published',
              'actor_role', $4::text,
              'workflow_version', published_cards.workflow_version,
              'grade_event', 'grade.published',
              'release_mode', 'exam_series'
            )
          FROM published_cards
          RETURNING id
        ), published_marks AS (
          UPDATE exam_marks mark
          SET status = 'published',
              updated_by_user_id = $3::uuid,
              published_at = NOW(),
              updated_at = NOW()
          WHERE mark.tenant_id = $1
            AND mark.exam_series_id = $2::uuid
            AND mark.status IN ('locked', 'reviewed')
            AND EXISTS (SELECT 1 FROM release_allowed)
          RETURNING mark.id
        ), published_series AS (
          UPDATE exam_series series
          SET status = 'published',
              published_at = NOW(),
              updated_at = NOW()
          WHERE series.tenant_id = $1
            AND series.id = $2::uuid
            AND EXISTS (SELECT 1 FROM release_allowed)
          RETURNING series.id
        )
        SELECT
          readiness.total_count,
          readiness.approved_count,
          readiness.already_published_count,
          readiness.blocked_count,
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(published_cards)) FROM published_cards),
            '[]'::jsonb
          ) AS published_cards,
          (SELECT COUNT(*)::integer FROM published_marks) AS published_marks_count,
          (SELECT COUNT(*)::integer FROM report_card_audits) AS audit_count,
          EXISTS (SELECT 1 FROM published_series) AS series_published
        FROM readiness
      `,
      [input.tenant_id, input.exam_series_id, input.actor_user_id, input.actor_role],
    );
    return result.rows[0] ?? null;
  }

  async unpublishExamSeries(input: {
    tenant_id: string;
    exam_series_id: string;
    actor_user_id: string;
    actor_role: string;
    reason: string;
  }) {
    const result = await this.executeSql(
      `
        WITH target_series AS MATERIALIZED (
          SELECT series.id
          FROM exam_series series
          WHERE series.tenant_id = $1
            AND series.id = $2::uuid
            AND series.status = 'published'
          FOR UPDATE
        ), readiness AS MATERIALIZED (
          SELECT
            COUNT(*)::integer AS total_count,
            COUNT(*) FILTER (WHERE card.status = 'published')::integer AS published_count
          FROM student_report_cards card
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.is_current = TRUE
            AND EXISTS (SELECT 1 FROM target_series)
        ), withdrawn_cards AS (
          UPDATE student_report_cards card
          SET status = 'withdrawn',
              published_at = NULL,
              withdrawn_by_user_id = $3::uuid,
              withdrawn_at = NOW(),
              workflow_version = card.workflow_version + 1,
              metadata = card.metadata || jsonb_build_object(
                'last_transition', 'unpublish',
                'transitioned_by', $3::text,
                'transitioned_by_role', $4::text,
                'transition_reason', $5::text,
                'transitioned_at', NOW()
              ),
              updated_at = NOW()
          WHERE card.tenant_id = $1
            AND card.exam_series_id = $2::uuid
            AND card.is_current = TRUE
            AND card.status = 'published'
            AND EXISTS (SELECT 1 FROM target_series)
          RETURNING
            card.id::text,
            card.exam_series_id::text,
            card.student_id::text,
            card.status,
            card.workflow_version,
            card.updated_at::text
        ), report_card_audits AS (
          INSERT INTO student_report_card_audit_logs (
            tenant_id,
            report_card_id,
            exam_series_id,
            student_id,
            action,
            actor_user_id,
            metadata
          )
          SELECT
            $1,
            withdrawn_cards.id::uuid,
            withdrawn_cards.exam_series_id::uuid,
            withdrawn_cards.student_id::uuid,
            'report_card.withdrawn',
            $3::uuid,
            jsonb_build_object(
              'resulting_status', 'withdrawn',
              'actor_role', $4::text,
              'reason', $5::text,
              'workflow_version', withdrawn_cards.workflow_version,
              'grade_event', 'grade.withdrawn',
              'release_mode', 'exam_series'
            )
          FROM withdrawn_cards
          RETURNING id
        ), withdrawn_marks AS (
          UPDATE exam_marks mark
          SET status = 'locked',
              updated_by_user_id = $3::uuid,
              published_at = NULL,
              locked_at = COALESCE(mark.locked_at, NOW()),
              updated_at = NOW()
          WHERE mark.tenant_id = $1
            AND mark.exam_series_id = $2::uuid
            AND mark.status = 'published'
            AND EXISTS (SELECT 1 FROM target_series)
          RETURNING mark.id
        ), withdrawn_series AS (
          UPDATE exam_series series
          SET status = 'locked',
              published_at = NULL,
              updated_at = NOW()
          WHERE series.tenant_id = $1
            AND series.id = $2::uuid
            AND series.status = 'published'
            AND EXISTS (SELECT 1 FROM withdrawn_cards)
          RETURNING series.id
        )
        SELECT
          readiness.total_count,
          readiness.published_count,
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(withdrawn_cards)) FROM withdrawn_cards),
            '[]'::jsonb
          ) AS withdrawn_cards,
          (SELECT COUNT(*)::integer FROM withdrawn_marks) AS relocked_marks_count,
          (SELECT COUNT(*)::integer FROM report_card_audits) AS audit_count,
          EXISTS (SELECT 1 FROM withdrawn_series) AS series_withdrawn
        FROM readiness
        WHERE EXISTS (SELECT 1 FROM target_series)
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.actor_user_id,
        input.actor_role,
        input.reason,
      ],
    );
    return result.rows[0] ?? null;
  }

  async createTimetableSlot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_timetable_slots (
          tenant_id,
          exam_series_id,
          assessment_id,
          date,
          start_time,
          end_time,
          room_name
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::date, $5::time, $6::time, $7)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.assessment_id ?? null,
        input.date,
        input.start_time,
        input.end_time,
        input.room_name ?? null,
      ],
    );
    return result.rows[0];
  }

  async updateTimetableSlot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        UPDATE exam_timetable_slots
        SET
          date = COALESCE($3::date, date),
          start_time = COALESCE($4::time, start_time),
          end_time = COALESCE($5::time, end_time),
          room_name = COALESCE($6, room_name),
          status = COALESCE($7, status),
          updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [
        input.tenant_id,
        input.timetable_slot_id,
        input.date ?? null,
        input.start_time ?? null,
        input.end_time ?? null,
        input.room_name ?? null,
        input.status ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async assignInvigilator(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_invigilators (
          tenant_id,
          timetable_slot_id,
          staff_user_id,
          role
        )
        VALUES ($1, $2::uuid, $3::uuid, $4)
        ON CONFLICT (tenant_id, timetable_slot_id, staff_user_id) DO NOTHING
        RETURNING *
      `,
      [
        input.tenant_id,
        input.timetable_slot_id,
        input.staff_user_id,
        input.role ?? 'invigilator',
      ],
    );
    if (!result.rows[0]) {
      throw new ConflictException('Staff member is already assigned to this timetable slot');
    }

    return result.rows[0];
  }

  async autoAssignInvigilators(tenantId: string) {
    const result = await this.executeSql(
      `WITH unassigned_slots AS (
         SELECT slot.*,
                row_number() OVER (ORDER BY slot.date, slot.start_time, slot.id) AS assignment_order
         FROM exam_timetable_slots slot
         WHERE slot.tenant_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM exam_invigilators assigned
             WHERE assigned.tenant_id = slot.tenant_id
               AND assigned.timetable_slot_id = slot.id
               AND assigned.status <> 'replaced'
           )
         ORDER BY slot.date, slot.start_time, slot.id
         LIMIT 200
       ), active_staff AS (
         SELECT profile.user_id,
                row_number() OVER (ORDER BY profile.display_name, profile.id) AS assignment_order
         FROM staff_profiles profile
         WHERE profile.tenant_id = $1
           AND profile.status = 'active'
           AND profile.user_id IS NOT NULL
         ORDER BY profile.display_name, profile.id
         LIMIT 200
       ), conflict_free_pairs AS (
         SELECT slot.id AS timetable_slot_id, staff.user_id AS staff_user_id
         FROM unassigned_slots slot
         INNER JOIN active_staff staff USING (assignment_order)
         WHERE NOT EXISTS (
           SELECT 1
           FROM exam_invigilators existing
           INNER JOIN exam_timetable_slots occupied
             ON occupied.tenant_id = existing.tenant_id
            AND occupied.id = existing.timetable_slot_id
           WHERE existing.tenant_id = $1
             AND existing.staff_user_id = staff.user_id
             AND existing.status <> 'replaced'
             AND occupied.date = slot.date
             AND occupied.start_time < slot.end_time
             AND occupied.end_time > slot.start_time
         )
       )
       INSERT INTO exam_invigilators (tenant_id, timetable_slot_id, staff_user_id, role, status)
       SELECT $1, timetable_slot_id, staff_user_id, 'invigilator', 'assigned'
       FROM conflict_free_pairs
       ON CONFLICT (tenant_id, timetable_slot_id, staff_user_id) DO NOTHING
       RETURNING *`,
      [tenantId],
    );
    return result.rows;
  }

  async findInvigilatorAssignmentScope(input: {
    tenant_id: string;
    timetable_slot_id: string;
    staff_user_id: string;
  }) {
    const result = await this.executeSql<{
      staff_name: string;
      slot_label: string;
      existing_assignment_id: string | null;
    }>(
      `
        SELECT
          profile.display_name AS staff_name,
          concat_ws(' ', slot.date::text, slot.start_time::text, COALESCE(slot.room_name, '')) AS slot_label,
          assignment.id::text AS existing_assignment_id
        FROM exam_timetable_slots slot
        INNER JOIN staff_profiles profile
          ON profile.tenant_id = slot.tenant_id
         AND profile.user_id = $3::uuid
         AND profile.status = 'active'
        LEFT JOIN exam_invigilators assignment
          ON assignment.tenant_id = slot.tenant_id
         AND assignment.timetable_slot_id = slot.id
         AND assignment.staff_user_id = profile.user_id
        WHERE slot.tenant_id = $1
          AND slot.id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.timetable_slot_id, input.staff_user_id],
    );

    return result.rows[0] ?? null;
  }

  async updateInvigilatorStatus(input: { tenant_id: string; assignment_id: string; status: string }) {
    const result = await this.executeSql(
      `UPDATE exam_invigilators
       SET status = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.assignment_id, input.status],
    );
    return result.rows[0] ?? null;
  }

  async findInvigilatorAssignmentById(input: { tenant_id: string; assignment_id: string }) {
    const result = await this.executeSql<{
      id: string;
      staff_user_id: string;
      staff_name: string;
      slot_label: string;
    }>(
      `SELECT assignment.id::text, assignment.staff_user_id::text,
              profile.display_name AS staff_name,
              concat_ws(' ', slot.date::text, slot.start_time::text, COALESCE(slot.room_name, '')) AS slot_label
       FROM exam_invigilators assignment
       INNER JOIN staff_profiles profile
         ON profile.tenant_id = assignment.tenant_id AND profile.user_id = assignment.staff_user_id
       INNER JOIN exam_timetable_slots slot
         ON slot.tenant_id = assignment.tenant_id AND slot.id = assignment.timetable_slot_id
       WHERE assignment.tenant_id = $1 AND assignment.id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.assignment_id],
    );
    return result.rows[0] ?? null;
  }

  async replaceInvigilator(input: { tenant_id: string; assignment_id: string; replacement_staff_user_id: string; role: string }) {
    const result = await this.executeSql(
      `WITH current_assignment AS (
         SELECT timetable_slot_id
         FROM exam_invigilators
         WHERE tenant_id = $1 AND id = $2::uuid
         FOR UPDATE
       ), replacement AS (
         INSERT INTO exam_invigilators (tenant_id, timetable_slot_id, staff_user_id, role, status)
         SELECT $1, current_assignment.timetable_slot_id, profile.user_id, $4, 'assigned'
         FROM current_assignment
         INNER JOIN staff_profiles profile
           ON profile.tenant_id = $1 AND profile.user_id = $3::uuid AND profile.status = 'active'
         ON CONFLICT (tenant_id, timetable_slot_id, staff_user_id)
         DO UPDATE SET role = EXCLUDED.role, status = 'assigned', updated_at = NOW()
         RETURNING *
       ), replaced AS (
         UPDATE exam_invigilators original
         SET status = 'replaced', updated_at = NOW()
         WHERE original.tenant_id = $1 AND original.id = $2::uuid
           AND EXISTS (SELECT 1 FROM replacement)
         RETURNING original.id::text AS replaced_assignment_id
       )
       SELECT replacement.*, replaced.replaced_assignment_id
       FROM replacement CROSS JOIN replaced`,
      [input.tenant_id, input.assignment_id, input.replacement_staff_user_id, input.role],
    );
    return result.rows[0] ?? null;
  }

  async markAttendance(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_attendance_records (
          tenant_id,
          timetable_slot_id,
          student_id,
          status,
          remarks,
          recorded_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::uuid)
        ON CONFLICT (tenant_id, timetable_slot_id, student_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks,
          recorded_by_user_id = EXCLUDED.recorded_by_user_id,
          updated_at = NOW()
        WHERE exam_attendance_records.locked_at IS NULL
        RETURNING *
      `,
      [
        input.tenant_id,
        input.timetable_slot_id,
        input.student_id,
        input.status,
        input.remarks ?? null,
        input.actor_user_id,
      ],
    );
    return result.rows[0] ?? null;
  }

  async bulkImportExamAttendance(input: { tenant_id: string; actor_user_id: string; rows: Array<Record<string, unknown>> }) {
    const result = await this.executeSql(
      `WITH source AS (
         SELECT *
         FROM jsonb_to_recordset($3::jsonb) AS row_data(
           row_number integer,
           timetable_slot_id text,
           admission_number text,
           student_id text,
           status text,
           remarks text
         )
       ), resolved AS (
         SELECT
           source.*,
           slot.id AS resolved_slot_id,
           student.id AS resolved_student_id,
           existing.locked_at,
           CASE
             WHEN slot.id IS NULL THEN 'Timetable slot was not found for this school'
             WHEN student.id IS NULL THEN 'Student was not found for this school'
             WHEN existing.locked_at IS NOT NULL THEN 'Attendance record is locked and cannot be changed'
             ELSE NULL
           END AS validation_error
         FROM source
         LEFT JOIN exam_timetable_slots slot
           ON slot.tenant_id = $1 AND slot.id = source.timetable_slot_id::uuid
         LEFT JOIN students student
           ON student.tenant_id = $1
          AND student.status = 'active'
          AND (
            (source.student_id IS NOT NULL AND student.id = source.student_id::uuid)
            OR (source.student_id IS NULL AND lower(student.admission_number) = lower(source.admission_number))
          )
         LEFT JOIN exam_attendance_records existing
           ON existing.tenant_id = $1
          AND existing.timetable_slot_id = slot.id
          AND existing.student_id = student.id
       ), imported AS (
         INSERT INTO exam_attendance_records (
           tenant_id, timetable_slot_id, student_id, status, remarks, recorded_by_user_id
         )
         SELECT $1, resolved_slot_id, resolved_student_id, status, remarks, $2::uuid
         FROM resolved
         WHERE validation_error IS NULL
         ON CONFLICT (tenant_id, timetable_slot_id, student_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           recorded_by_user_id = EXCLUDED.recorded_by_user_id,
           updated_at = NOW()
         WHERE exam_attendance_records.locked_at IS NULL
         RETURNING id::text, timetable_slot_id, student_id
       )
       SELECT
         resolved.row_number,
         CASE WHEN imported.id IS NOT NULL THEN 'committed' ELSE 'invalid' END AS status,
         imported.id AS attendance_id,
         CASE
           WHEN resolved.validation_error IS NOT NULL THEN ARRAY[resolved.validation_error]::text[]
           WHEN imported.id IS NULL THEN ARRAY['Attendance record was locked while the import was running']::text[]
           ELSE ARRAY[]::text[]
         END AS errors
       FROM resolved
       LEFT JOIN imported
         ON imported.timetable_slot_id = resolved.resolved_slot_id
        AND imported.student_id = resolved.resolved_student_id
       ORDER BY resolved.row_number`,
      [input.tenant_id, input.actor_user_id, JSON.stringify(input.rows)],
    );
    return result.rows;
  }

  async lockExamAttendance(input: { tenant_id: string; attendance_id: string; actor_user_id: string }) {
    const result = await this.executeSql(
      `UPDATE exam_attendance_records
       SET locked_at = COALESCE(locked_at, NOW()),
           locked_by_user_id = COALESCE(locked_by_user_id, $3::uuid),
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.attendance_id, input.actor_user_id],
    );
    return result.rows[0] ?? null;
  }

  async createAttendanceSpecialCase(input: { tenant_id: string; attendance_id: string; case_type: string; description: string; actor_user_id: string }) {
    const result = await this.executeSql(
      `INSERT INTO exam_student_cases (
         tenant_id, exam_series_id, student_id, case_type, description, reported_by_user_id
       )
       SELECT attendance.tenant_id, slot.exam_series_id, attendance.student_id, $3, $4, $5::uuid
       FROM exam_attendance_records attendance
       INNER JOIN exam_timetable_slots slot
         ON slot.tenant_id = attendance.tenant_id AND slot.id = attendance.timetable_slot_id
       WHERE attendance.tenant_id = $1 AND attendance.id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.attendance_id, input.case_type, input.description, input.actor_user_id],
    );
    return result.rows[0] ?? null;
  }

  async findExamAttendanceScope(input: {
    tenant_id: string;
    timetable_slot_id: string;
    student_id: string;
  }) {
    const result = await this.executeSql<{
      student_name: string;
      slot_label: string;
    }>(
      `
        SELECT
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          concat_ws(' ', slot.date::text, slot.start_time::text, COALESCE(slot.room_name, '')) AS slot_label
        FROM exam_timetable_slots slot
        INNER JOIN students student
          ON student.tenant_id = slot.tenant_id
         AND student.id = $3::uuid
         AND student.status = 'active'
        WHERE slot.tenant_id = $1
          AND slot.id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.timetable_slot_id, input.student_id],
    );

    return result.rows[0] ?? null;
  }

  async listExamAbsenceGuardianRecipients(input: { tenant_id: string; attendance_ids: string[] }) {
    const result = await this.executeSql<{
      attendance_id: string;
      guardian_user_id: string;
      student_name: string;
      slot_label: string;
    }>(
      `SELECT attendance.id::text AS attendance_id,
              guardian.user_id::text AS guardian_user_id,
              concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
              concat_ws(' ', slot.date::text, slot.start_time::text, COALESCE(slot.room_name, '')) AS slot_label
       FROM exam_attendance_records attendance
       INNER JOIN students student
         ON student.tenant_id = attendance.tenant_id AND student.id = attendance.student_id
       INNER JOIN exam_timetable_slots slot
         ON slot.tenant_id = attendance.tenant_id AND slot.id = attendance.timetable_slot_id
       INNER JOIN student_guardians guardian
         ON guardian.tenant_id = attendance.tenant_id
        AND guardian.student_id = attendance.student_id
        AND guardian.status = 'active'
        AND guardian.user_id IS NOT NULL
       WHERE attendance.tenant_id = $1
         AND attendance.id = ANY($2::uuid[])
         AND attendance.status = 'absent'
       ORDER BY attendance.id, guardian.is_primary DESC, guardian.created_at`,
      [input.tenant_id, input.attendance_ids],
    );
    return result.rows;
  }

  async findStudentCaseScope(input: {
    tenant_id: string;
    exam_series_id: string;
    student_id: string;
  }) {
    const result = await this.executeSql<{
      exam_series_name: string;
      student_name: string;
    }>(
      `
        SELECT
          series.name AS exam_series_name,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name
        FROM exam_series series
        INNER JOIN students student
          ON student.tenant_id = series.tenant_id
         AND student.id = $3::uuid
        WHERE series.tenant_id = $1
          AND series.id = $2::uuid
          AND student.status <> 'archived'
        LIMIT 1
      `,
      [input.tenant_id, input.exam_series_id, input.student_id],
    );

    return result.rows[0] ?? null;
  }

  async reportStudentCase(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO exam_student_cases (
          tenant_id,
          exam_series_id,
          student_id,
          case_type,
          description,
          reported_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.exam_series_id,
        input.student_id,
        input.case_type,
        input.description,
        input.actor_user_id,
      ],
    );
    return result.rows[0];
  }

  async resolveStudentCase(input: { tenant_id: string; case_id: string; resolution: string }) {
    const result = await this.executeSql(
      `UPDATE exam_student_cases
       SET status = 'resolved', resolution = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'resolved'
       RETURNING *`,
      [input.tenant_id, input.case_id, input.resolution],
    );
    return result.rows[0] ?? null;
  }

  async findStudentCaseById(input: { tenant_id: string; case_id: string }) {
    const result = await this.executeSql(
      `SELECT student_case.*,
              concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name
       FROM exam_student_cases student_case
       INNER JOIN students student
         ON student.tenant_id = student_case.tenant_id AND student.id = student_case.student_id
       WHERE student_case.tenant_id = $1
         AND student_case.id = $2::uuid
         AND student_case.status <> 'resolved'
       LIMIT 1`,
      [input.tenant_id, input.case_id],
    );
    return result.rows[0] ?? null;
  }

  async getTimetableSlots(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_timetable_slots WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY date ASC, start_time ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getInvigilators(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_invigilators WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.timetable_slot_id) {
      query += ` AND timetable_slot_id = $${paramCount}::uuid`;
      params.push(filters.timetable_slot_id);
      paramCount++;
    }
    
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getAttendance(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_attendance_records WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.timetable_slot_id) {
      query += ` AND timetable_slot_id = $${paramCount}::uuid`;
      params.push(filters.timetable_slot_id);
      paramCount++;
    }
    
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getStudentCases(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_student_cases WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getExamSeries(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_series WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    query += ` ORDER BY starts_on DESC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getExamAssessments(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_assessments WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY name ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getGradingPolicies(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_grading_policies WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    query += ` ORDER BY name ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getGradingPolicy(input: { tenant_id: string; policy_id: string }) {
    const result = await this.executeSql(
      `SELECT *
       FROM exam_grading_policies
       WHERE tenant_id = $1
         AND id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.policy_id],
    );
    return result.rows[0] ?? null;
  }

  async getGradingPolicyImpact(input: { tenant_id: string; policy_id: string }) {
    const result = await this.executeSql(
      `SELECT
         policy.id::text,
         policy.exam_series_id::text,
         policy.scope,
         policy.version,
         policy.status,
         (
           SELECT COUNT(*)::integer
           FROM exam_series series
           WHERE series.tenant_id = policy.tenant_id
             AND (
               series.id = policy.exam_series_id
               OR policy.exam_series_id IS NULL
             )
             AND series.ends_on >= CURRENT_DATE
         ) AS future_exam_count,
         (
           SELECT COUNT(*)::integer
           FROM exam_series series
           WHERE series.tenant_id = policy.tenant_id
             AND (
               series.id = policy.exam_series_id
               OR policy.exam_series_id IS NULL
             )
             AND series.ends_on < CURRENT_DATE
         ) AS existing_exam_count,
         (
           SELECT COUNT(*)::integer
           FROM student_report_cards card
           WHERE card.tenant_id = policy.tenant_id
             AND card.grading_policy_id = policy.id
         ) AS report_card_count,
         (
           SELECT COUNT(*)::integer
           FROM student_report_cards card
           WHERE card.tenant_id = policy.tenant_id
             AND card.grading_policy_id = policy.id
             AND card.status = 'published'
         ) AS published_report_count
       FROM exam_grading_policies policy
       WHERE policy.tenant_id = $1
         AND policy.id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.policy_id],
    );
    return result.rows[0] ?? null;
  }

  async createGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH source AS (
         SELECT id, version
         FROM exam_grading_policies
         WHERE tenant_id = $1
           AND id = $9::uuid
       ), created AS (
         INSERT INTO exam_grading_policies (
           tenant_id,
           exam_series_id,
           name,
           reporting_mode,
           status,
           version,
           effective_from,
           effective_to,
           supersedes_policy_id,
           scope,
           created_by_user_id
         )
         SELECT
           $1,
           $2::uuid,
           $3,
           $4,
           'draft',
           COALESCE(source.version + 1, 1),
           $5::timestamptz,
           $6::timestamptz,
           source.id,
           $7::jsonb,
           $8::uuid
         FROM (SELECT 1) seed
         LEFT JOIN source ON TRUE
         WHERE $9::uuid IS NULL OR source.id IS NOT NULL
         RETURNING *
       ), copied_boundaries AS (
         INSERT INTO exam_grading_policy_boundaries (
           tenant_id,
           grading_policy_id,
           label,
           min_score,
           max_score,
           points,
           descriptor,
           remark,
           is_pass
         )
         SELECT
           boundary.tenant_id,
           created.id,
           boundary.label,
           boundary.min_score,
           boundary.max_score,
           boundary.points,
           boundary.descriptor,
           boundary.remark,
           boundary.is_pass
         FROM created
         JOIN source ON TRUE
         JOIN exam_grading_policy_boundaries boundary
           ON boundary.tenant_id = $1
          AND boundary.grading_policy_id = source.id
         RETURNING id
       ), copied_weightings AS (
         INSERT INTO exam_subject_weightings (
           tenant_id,
           grading_policy_id,
           subject_id,
           weight,
           is_compulsory
         )
         SELECT
           weighting.tenant_id,
           created.id,
           weighting.subject_id,
           weighting.weight,
           weighting.is_compulsory
         FROM created
         JOIN source ON TRUE
         JOIN exam_subject_weightings weighting
           ON weighting.tenant_id = $1
          AND weighting.grading_policy_id = source.id
         RETURNING id
       )
       SELECT created.*
       FROM created`,
      [
        input.tenant_id,
        input.exam_series_id ?? null,
        input.name,
        input.reporting_mode,
        input.effective_from ?? null,
        input.effective_to ?? null,
        JSON.stringify(input.scope ?? {}),
        input.actor_user_id,
        input.supersedes_policy_id ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async transitionGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH target AS (
         SELECT id, exam_series_id, status, scope, effective_from
         FROM exam_grading_policies
         WHERE tenant_id = $1
           AND id = $2::uuid
         FOR UPDATE
       ), replaced AS (
         UPDATE exam_grading_policies policy
         SET status = 'replaced',
             effective_to = COALESCE(target.effective_from, NOW()),
             updated_at = NOW()
         FROM target
         WHERE $3 = 'active'
           AND policy.tenant_id = $1
           AND policy.status = 'active'
           AND policy.id <> target.id
           AND policy.exam_series_id IS NOT DISTINCT FROM target.exam_series_id
           AND policy.scope = target.scope
         RETURNING policy.id
       )
       UPDATE exam_grading_policies policy
       SET status = $3,
           validated_at = CASE
             WHEN $3 = 'validated' THEN NOW()
             ELSE policy.validated_at
           END,
           activated_at = CASE
             WHEN $3 = 'active' THEN NOW()
             ELSE policy.activated_at
           END,
           effective_from = CASE
             WHEN $3 = 'active' THEN COALESCE(policy.effective_from, NOW())
             ELSE policy.effective_from
           END,
           effective_to = CASE
             WHEN $3 = 'archived' THEN COALESCE(policy.effective_to, NOW())
             ELSE policy.effective_to
           END,
           updated_at = NOW()
       FROM target
       WHERE policy.tenant_id = $1
         AND policy.id = target.id
         AND (
           (target.status = 'draft' AND $3 IN ('validated', 'archived'))
           OR (target.status = 'validated' AND $3 IN ('draft', 'scheduled', 'active', 'archived'))
           OR (target.status = 'scheduled' AND $3 IN ('draft', 'active', 'archived'))
           OR (target.status = 'active' AND $3 = 'archived')
           OR (target.status = 'replaced' AND $3 = 'archived')
           OR target.status = $3
         )
       RETURNING policy.*`,
      [input.tenant_id, input.policy_id, input.status],
    );
    return result.rows[0] ?? null;
  }

  async updateGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `UPDATE exam_grading_policies
       SET
         name = COALESCE($3, name),
         reporting_mode = COALESCE($4, reporting_mode),
         exam_series_id = COALESCE($5::uuid, exam_series_id),
         effective_from = COALESCE($6::timestamptz, effective_from),
         effective_to = COALESCE($7::timestamptz, effective_to),
         scope = COALESCE($8::jsonb, scope),
         updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2::uuid
         AND status = 'draft'
       RETURNING *`,
      [
        input.tenant_id,
        input.policy_id,
        input.name ?? null,
        input.reporting_mode ?? null,
        input.exam_series_id ?? null,
        input.effective_from ?? null,
        input.effective_to ?? null,
        input.scope === undefined ? null : JSON.stringify(input.scope),
      ],
    );
    return result.rows[0] ?? null;
  }

  async deleteDraftGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `DELETE FROM exam_grading_policies
       WHERE tenant_id = $1 AND id = $2::uuid AND status = 'draft'
       RETURNING *`,
      [input.tenant_id, input.policy_id],
    );
    return result.rows[0] ?? null;
  }

  async getGradingPolicyBoundaries(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `SELECT boundary.* FROM exam_grading_policy_boundaries boundary
       JOIN exam_grading_policies policy ON policy.tenant_id = boundary.tenant_id AND policy.id = boundary.grading_policy_id
       WHERE boundary.tenant_id = $1 AND boundary.grading_policy_id = $2::uuid
       ORDER BY boundary.max_score DESC, boundary.min_score DESC`,
      [input.tenant_id, input.policy_id],
    );
    return result.rows;
  }

  async getGradingPolicyBoundary(input: { tenant_id: string; boundary_id: string }) {
    const result = await this.executeSql(
      `SELECT
         boundary.*,
         policy.status AS policy_status
       FROM exam_grading_policy_boundaries boundary
       JOIN exam_grading_policies policy
         ON policy.tenant_id = boundary.tenant_id
        AND policy.id = boundary.grading_policy_id
       WHERE boundary.tenant_id = $1
         AND boundary.id = $2::uuid
       LIMIT 1`,
      [input.tenant_id, input.boundary_id],
    );
    return result.rows[0] ?? null;
  }

  async createGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `INSERT INTO exam_grading_policy_boundaries (
         tenant_id,
         grading_policy_id,
         label,
         min_score,
         max_score,
         points,
         descriptor,
         remark,
         is_pass
       )
       SELECT $1, policy.id, $3, $4, $5, $6, $7, $8, $9
       FROM exam_grading_policies policy
       WHERE policy.tenant_id = $1
         AND policy.id = $2::uuid
         AND policy.status = 'draft'
       RETURNING *`,
      [
        input.tenant_id,
        input.policy_id,
        input.label,
        input.min_score,
        input.max_score,
        input.points ?? null,
        input.descriptor ?? null,
        input.remark ?? null,
        input.is_pass ?? false,
      ],
    );
    return result.rows[0] ?? null;
  }

  async updateGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `UPDATE exam_grading_policy_boundaries boundary
       SET label = COALESCE($3, boundary.label),
           min_score = COALESCE($4, boundary.min_score),
           max_score = COALESCE($5, boundary.max_score),
           points = CASE WHEN $6::boolean THEN $7::numeric ELSE boundary.points END,
           descriptor = CASE WHEN $8::boolean THEN $9::text ELSE boundary.descriptor END,
           remark = CASE WHEN $10::boolean THEN $11::text ELSE boundary.remark END,
           is_pass = CASE WHEN $12::boolean THEN $13::boolean ELSE boundary.is_pass END
       FROM exam_grading_policies policy
       WHERE boundary.tenant_id = $1
         AND boundary.id = $2::uuid
         AND policy.tenant_id = boundary.tenant_id
         AND policy.id = boundary.grading_policy_id
         AND policy.status = 'draft'
       RETURNING boundary.*`,
      [
        input.tenant_id,
        input.boundary_id,
        input.label ?? null,
        input.min_score ?? null,
        input.max_score ?? null,
        input.points !== undefined,
        input.points ?? null,
        input.descriptor !== undefined,
        input.descriptor ?? null,
        input.remark !== undefined,
        input.remark ?? null,
        input.is_pass !== undefined,
        input.is_pass ?? false,
      ],
    );
    return result.rows[0] ?? null;
  }

  async deleteGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `DELETE FROM exam_grading_policy_boundaries boundary
       USING exam_grading_policies policy
       WHERE boundary.tenant_id = $1
         AND boundary.id = $2::uuid
         AND policy.tenant_id = boundary.tenant_id
         AND policy.id = boundary.grading_policy_id
         AND policy.status = 'draft'
       RETURNING boundary.*`,
      [input.tenant_id, input.boundary_id],
    );
    return result.rows[0] ?? null;
  }

  async getAuditLogs(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_mark_audit_logs WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT 100`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getSubjectWeightings(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_subject_weightings WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.grading_policy_id) {
      query += ` AND grading_policy_id = $${paramCount}::uuid`;
      params.push(filters.grading_policy_id);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async deleteSubjectWeighting(input: { tenant_id: string; actor_user_id: string; weighting_id: string }) {
    const result = await this.executeSql(
      `DELETE FROM exam_subject_weightings
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING id::text, subject_id::text, weight, is_compulsory`,
      [input.tenant_id, input.weighting_id],
    );

    return result.rows[0] ?? null;
  }

  async getAssessmentComponents(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_assessment_components WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.assessment_id) {
      query += ` AND assessment_id = $${paramCount}::uuid`;
      params.push(filters.assessment_id);
      paramCount++;
    }
    
    query += ` ORDER BY component_name ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async createAssessmentComponent(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `INSERT INTO exam_assessment_components (
         tenant_id, assessment_id, component_code, component_name, max_score, weight
       )
       SELECT $1, assessment.id, $3, $4, $5, $6
       FROM exam_assessments assessment
       WHERE assessment.tenant_id = $1 AND assessment.id = $2::uuid
       RETURNING *`,
      [
        input.tenant_id,
        input.assessment_id,
        input.component_code,
        input.component_name,
        input.max_score,
        input.weight,
      ],
    );
    return result.rows[0] ?? null;
  }

  async updateAssessmentComponent(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `UPDATE exam_assessment_components
       SET component_code = COALESCE($3, component_code),
           component_name = COALESCE($4, component_name),
           max_score = COALESCE($5, max_score),
           weight = COALESCE($6, weight)
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [
        input.tenant_id,
        input.component_id,
        input.component_code ?? null,
        input.component_name ?? null,
        input.max_score ?? null,
        input.weight ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async deleteAssessmentComponent(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `DELETE FROM exam_assessment_components
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.component_id],
    );
    return result.rows[0] ?? null;
  }

  async getMarkEntryWindows(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT
      mark_window.*,
      COALESCE(class_section.name, mark_window.class_section_id::text) AS class_name,
      COALESCE(subject.name, mark_window.subject_id::text) AS subject_name,
      COALESCE(mark_window.last_action, mark_window.status) AS workflow_status,
      COALESCE(student_counts.expected_count, 0)::integer AS expected_count,
      COALESCE(mark_counts.saved_count, 0)::integer AS saved_count,
      COALESCE(mark_counts.submitted_count, 0)::integer AS submitted_count,
      GREATEST(COALESCE(student_counts.expected_count, 0) - COALESCE(mark_counts.saved_count, 0), 0)::integer AS missing_count,
      COALESCE(teacher_assignments.teacher_user_ids, ARRAY[]::text[]) AS teacher_user_ids
      FROM exam_mark_entry_windows mark_window
      LEFT JOIN class_sections class_section
        ON class_section.tenant_id = mark_window.tenant_id AND class_section.id = mark_window.class_section_id::text
      LEFT JOIN subjects subject
        ON subject.tenant_id = mark_window.tenant_id AND subject.id = mark_window.subject_id::text
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS expected_count FROM students student
        WHERE student.tenant_id = mark_window.tenant_id
          AND student.status = 'active'
          AND EXISTS (
            SELECT 1 FROM student_class_assignments class_assignment
            WHERE class_assignment.tenant_id = student.tenant_id
              AND class_assignment.student_id = student.id::text
              AND class_assignment.class_section_id = mark_window.class_section_id::text
              AND class_assignment.status = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM student_subject_enrollments subject_enrollment
            WHERE subject_enrollment.tenant_id = student.tenant_id
              AND subject_enrollment.student_id = student.id::text
              AND subject_enrollment.class_section_id = mark_window.class_section_id::text
              AND subject_enrollment.subject_id = mark_window.subject_id::text
              AND subject_enrollment.status = 'active'
          )
      ) student_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT mark.student_id)::integer AS saved_count,
          COUNT(DISTINCT mark.student_id) FILTER (WHERE mark.status IN ('submitted', 'reviewed', 'locked', 'published'))::integer AS submitted_count
        FROM exam_marks mark
        WHERE mark.tenant_id = mark_window.tenant_id
          AND mark.exam_series_id = mark_window.exam_series_id
          AND mark.class_section_id = mark_window.class_section_id
          AND mark.subject_id = mark_window.subject_id
      ) mark_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT array_agg(DISTINCT assignment.teacher_user_id::text) AS teacher_user_ids
        FROM exam_series series
        JOIN teacher_subject_assignments assignment
          ON assignment.tenant_id = series.tenant_id
         AND assignment.academic_term_id = series.academic_term_id::text
         AND assignment.class_section_id = mark_window.class_section_id::text
         AND assignment.subject_id = mark_window.subject_id::text
         AND assignment.status = 'active'
        WHERE series.tenant_id = mark_window.tenant_id AND series.id = mark_window.exam_series_id
      ) teacher_assignments ON TRUE
      WHERE mark_window.tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND mark_window.exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY mark_window.opens_at ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getMarks(tenantId: string, filters: Record<string, any> = {}) {
    const candidateLimit = Number(filters.limit);
    const candidateOffset = Number(filters.offset);
    const limit = Number.isInteger(candidateLimit) && candidateLimit > 0 ? Math.min(candidateLimit, 100) : 100;
    const offset = Number.isInteger(candidateOffset) && candidateOffset >= 0 ? candidateOffset : 0;
    const query = `
      SELECT
        mark.id::text,
        mark_window.id::text AS mark_entry_window_id,
        mark_window.exam_series_id::text,
        series.name AS exam_series_name,
        series.academic_term_id::text,
        assessment.id::text AS assessment_id,
        assessment.name AS assessment_name,
        assessment.max_score::float AS max_score,
        assessment.weight::float AS assessment_weight,
        mark_window.class_section_id::text,
        COALESCE(class_section.name, mark_window.class_section_id::text) AS class_name,
        mark_window.subject_id::text,
        COALESCE(subject.name, mark_window.subject_id::text) AS subject_name,
        student.id::text AS student_id,
        student.admission_number,
        NULLIF(BTRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '') AS student_name,
        mark.score::float AS score,
        COALESCE(mark.score_status, 'not_assessed') AS score_status,
        mark.remarks,
        COALESCE(mark.status, 'draft') AS status,
        mark.entered_by_user_id::text,
        mark.updated_at::text,
        mark_window.opens_at::text,
        mark_window.closes_at::text
      FROM exam_mark_entry_windows mark_window
      JOIN exam_series series
        ON series.tenant_id = mark_window.tenant_id
       AND series.id = mark_window.exam_series_id
      JOIN exam_assessments assessment
        ON assessment.tenant_id = mark_window.tenant_id
       AND assessment.exam_series_id = mark_window.exam_series_id
       AND assessment.subject_id = mark_window.subject_id
      JOIN students student
        ON student.tenant_id = mark_window.tenant_id
       AND student.status = 'active'
       AND EXISTS (
         SELECT 1 FROM student_class_assignments class_assignment
         WHERE class_assignment.tenant_id = student.tenant_id
           AND class_assignment.student_id = student.id::text
           AND class_assignment.class_section_id = mark_window.class_section_id::text
           AND class_assignment.status = 'active'
       )
       AND EXISTS (
         SELECT 1 FROM student_subject_enrollments subject_enrollment
         WHERE subject_enrollment.tenant_id = student.tenant_id
           AND subject_enrollment.student_id = student.id::text
           AND subject_enrollment.class_section_id = mark_window.class_section_id::text
           AND subject_enrollment.subject_id = mark_window.subject_id::text
           AND subject_enrollment.status = 'active'
       )
      LEFT JOIN class_sections class_section
        ON class_section.tenant_id = mark_window.tenant_id
       AND class_section.id = mark_window.class_section_id::text
      LEFT JOIN subjects subject
        ON subject.tenant_id = mark_window.tenant_id
       AND subject.id = mark_window.subject_id::text
      LEFT JOIN exam_marks mark
        ON mark.tenant_id = mark_window.tenant_id
       AND mark.exam_series_id = mark_window.exam_series_id
       AND mark.assessment_id = assessment.id
       AND mark.class_section_id = mark_window.class_section_id
       AND mark.subject_id = mark_window.subject_id
       AND mark.student_id::text = student.id::text
      WHERE mark_window.tenant_id = $1
        AND ($2::uuid IS NULL OR mark_window.exam_series_id = $2::uuid)
        AND ($3::text IS NULL OR student.id::text = $3::text)
        AND (
          $4::uuid IS NULL
          OR EXISTS (
            SELECT 1
            FROM teacher_subject_assignments assignment
            WHERE assignment.tenant_id = mark_window.tenant_id
              AND assignment.academic_term_id = series.academic_term_id::text
              AND assignment.class_section_id = mark_window.class_section_id::text
              AND assignment.subject_id = mark_window.subject_id::text
              AND assignment.teacher_user_id = $4::text
              AND assignment.status = 'active'
          )
        )
        AND ($5::uuid IS NULL OR mark_window.class_section_id = $5::uuid)
        AND ($8::uuid IS NULL OR mark_window.subject_id = $8::uuid)
        AND ($9::uuid IS NULL OR assessment.id = $9::uuid)
        AND mark_window.status = 'open'
        AND (mark_window.opens_at <= NOW() OR mark_window.last_action = 'opened')
        AND mark_window.closes_at >= NOW()
      ORDER BY
        class_section.name NULLS LAST,
        subject.name NULLS LAST,
        assessment.name,
        student.admission_number NULLS LAST,
        student.created_at ASC
      LIMIT $6::integer
      OFFSET $7::integer`;
    const params: any[] = [
      tenantId,
      filters.exam_series_id ?? null,
      filters.student_id ?? null,
      filters.teacher_user_id ?? null,
      filters.class_section_id ?? null,
      limit,
      offset,
      filters.subject_id ?? null,
      filters.assessment_id ?? null,
    ];
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getMarkVersions(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_mark_versions WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.approval_state) {
      query += ` AND approval_state = $${paramCount}`;
      params.push(filters.approval_state);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT 500`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getReportCardBatches(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT batch.*,
      batch.metadata->'results_processing'->>'mode' AS processing_mode,
      batch.metadata->'results_processing'->>'processed_at' AS processed_at,
      COALESCE((batch.metadata->'results_processing'->>'aggregate_count')::integer, 0) AS snapshot_count,
      COALESCE((batch.metadata->'results_processing'->>'ranked_count')::integer, 0) AS ranked_count
      FROM report_card_generation_batches batch WHERE batch.tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND batch.exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY batch.created_at DESC LIMIT 100`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getReportCards(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM student_report_cards WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT 500`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getExamDashboardStats(tenantId: string) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM exam_series WHERE tenant_id = $1) AS total_series,
        (SELECT COUNT(*) FROM exam_marks WHERE tenant_id = $1 AND status = 'draft') AS draft_marks,
        (SELECT COUNT(*) FROM student_report_cards WHERE tenant_id = $1 AND status = 'published') AS published_reports,
        (SELECT COUNT(*) FROM exam_mark_versions WHERE tenant_id = $1 AND approval_state = 'pending') AS pending_moderations
    `;
    const result = await this.executeSql(query, [tenantId]);
    return result.rows[0];
  }

  async resolveAcademicInterventionScope(input: {
    tenant_id: string;
    student_id?: string;
    exam_series_id?: string;
    subject_id?: string;
    subject_name?: string;
    class_section_id?: string;
    class_name?: string;
    owner_user_id?: string;
    owner_name?: string;
    hod_user_id?: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          student.id AS student_id,
          NULLIF(BTRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '') AS student_name,
          student.admission_number,
          series.id::text AS exam_series_id,
          series.name AS exam_series_name,
          subject.id AS subject_id,
          subject.name AS subject_name,
          section.id AS class_section_id,
          section.name AS class_name,
          owner.user_id::text AS owner_user_id,
          owner.display_name AS owner_name,
          COALESCE(explicit_hod.user_id, department_hod.user_id)::text AS hod_user_id,
          COALESCE(explicit_hod.display_name, department_hod.display_name) AS hod_name
        FROM (SELECT 1) seed
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM students candidate
          WHERE candidate.tenant_id = $1
            AND $2::text IS NOT NULL
            AND candidate.id = $2::text
            AND candidate.deleted_at IS NULL
          LIMIT 1
        ) student ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM exam_series candidate
          WHERE candidate.tenant_id = $1
            AND $3::text IS NOT NULL
            AND candidate.id::text = $3::text
          LIMIT 1
        ) series ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM subjects candidate
          WHERE candidate.tenant_id = $1
            AND (
              ($4::text IS NOT NULL AND candidate.id = $4::text)
              OR (
                $4::text IS NULL
                AND $5::text IS NOT NULL
                AND LOWER(BTRIM(candidate.name)) = LOWER(BTRIM($5::text))
              )
            )
            AND COALESCE(candidate.status, 'active') = 'active'
          ORDER BY candidate.updated_at DESC, candidate.id
          LIMIT 1
        ) subject ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM class_sections candidate
          WHERE candidate.tenant_id = $1
            AND (
              ($6::text IS NOT NULL AND candidate.id = $6::text)
              OR (
                $6::text IS NULL
                AND $7::text IS NOT NULL
                AND LOWER(BTRIM(candidate.name)) = LOWER(BTRIM($7::text))
              )
            )
            AND COALESCE(candidate.status, 'active') = 'active'
            AND COALESCE(candidate.is_active, TRUE) = TRUE
          ORDER BY candidate.updated_at DESC, candidate.id
          LIMIT 1
        ) section ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM staff_profiles candidate
          WHERE candidate.tenant_id = $1
            AND candidate.user_id IS NOT NULL
            AND (
              ($8::text IS NOT NULL AND candidate.user_id::text = $8::text)
              OR (
                $8::text IS NULL
                AND $9::text IS NOT NULL
                AND LOWER(BTRIM(candidate.display_name)) = LOWER(BTRIM($9::text))
              )
            )
            AND candidate.status = 'active'
          ORDER BY candidate.updated_at DESC, candidate.id
          LIMIT 1
        ) owner ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.*
          FROM staff_profiles candidate
          WHERE candidate.tenant_id = $1
            AND candidate.user_id IS NOT NULL
            AND $10::text IS NOT NULL
            AND candidate.user_id::text = $10::text
            AND candidate.status = 'active'
          LIMIT 1
        ) explicit_hod ON TRUE
        LEFT JOIN academics_departments department
          ON department.tenant_id = $1
         AND department.id = subject.department_id
         AND department.is_active = TRUE
        LEFT JOIN staff_profiles department_hod
          ON department_hod.tenant_id = department.tenant_id
         AND department_hod.user_id = department.head_of_department_user_id
         AND department_hod.status = 'active'
      `,
      [
        input.tenant_id,
        input.student_id ?? null,
        input.exam_series_id ?? null,
        input.subject_id ?? null,
        input.subject_name ?? null,
        input.class_section_id ?? null,
        input.class_name ?? null,
        input.owner_user_id ?? null,
        input.owner_name ?? null,
        input.hod_user_id ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async canStaffManageAcademicInterventionScope(input: {
    tenant_id: string;
    user_id: string;
    class_section_id?: string | null;
    subject_id?: string | null;
  }): Promise<boolean> {
    const result = await this.executeSql(
      `
        SELECT EXISTS (
          SELECT 1
          FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $2
            AND assignment.status = 'active'
            AND ($3::text IS NULL OR assignment.class_section_id::text = $3)
            AND ($4::text IS NULL OR assignment.subject_id::text = $4)
          UNION ALL
          SELECT 1
          FROM academics_class_teachers assignment
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $2
            AND assignment.is_active = TRUE
            AND COALESCE(assignment.status, 'active') = 'active'
            AND ($3::text IS NULL OR assignment.class_section_id::text = $3)
            AND $4::text IS NULL
        ) AS allowed
      `,
      [
        input.tenant_id,
        input.user_id,
        input.class_section_id ?? null,
        input.subject_id ?? null,
      ],
    );
    return result.rows[0]?.allowed === true;
  }

  async createAcademicIntervention(input: {
    tenant_id: string;
    student_id?: string | null;
    exam_series_id?: string | null;
    subject_id?: string | null;
    class_section_id?: string | null;
    scope_type: string;
    source: string;
    trigger_reason: string;
    baseline: Record<string, unknown>;
    plan: string;
    target: Record<string, unknown>;
    owner_user_id?: string | null;
    hod_user_id?: string | null;
    priority: string;
    starts_on?: string | null;
    due_on?: string | null;
    actor_user_id: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO academic_interventions (
          tenant_id, student_id, exam_series_id, subject_id, class_section_id,
          scope_type, source, trigger_reason, baseline, plan, target,
          owner_user_id, hod_user_id, priority, status, starts_on, due_on,
          created_by_user_id, updated_by_user_id
        )
        VALUES (
          $1, $2, $3::uuid, $4, $5,
          $6, $7, $8, $9::jsonb, $10, $11::jsonb,
          $12::uuid, $13::uuid, $14, 'planned', $15::date, $16::date,
          $17::uuid, $17::uuid
        )
        RETURNING
          id::text, tenant_id, student_id, exam_series_id::text, subject_id,
          class_section_id, scope_type, source, trigger_reason, baseline, plan,
          target, owner_user_id::text, hod_user_id::text, priority, status,
          starts_on::text, due_on::text, completed_at::text, outcome,
          created_by_user_id::text, created_at::text, updated_at::text
      `,
      [
        input.tenant_id,
        input.student_id ?? null,
        input.exam_series_id ?? null,
        input.subject_id ?? null,
        input.class_section_id ?? null,
        input.scope_type,
        input.source,
        input.trigger_reason,
        JSON.stringify(input.baseline),
        input.plan,
        JSON.stringify(input.target),
        input.owner_user_id ?? null,
        input.hod_user_id ?? null,
        input.priority,
        input.starts_on ?? null,
        input.due_on ?? null,
        input.actor_user_id,
      ],
    );
    return result.rows[0] ?? null;
  }

  async findAcademicIntervention(input: { tenant_id: string; intervention_id: string }) {
    const result = await this.executeSql(
      `
        SELECT
          intervention.*,
          intervention.id::text AS id,
          intervention.exam_series_id::text AS exam_series_id,
          intervention.owner_user_id::text AS owner_user_id,
          intervention.hod_user_id::text AS hod_user_id
        FROM academic_interventions intervention
        WHERE intervention.tenant_id = $1
          AND intervention.id::text = $2
        LIMIT 1
      `,
      [input.tenant_id, input.intervention_id],
    );
    return result.rows[0] ?? null;
  }

  async listAcademicInterventions(input: {
    tenant_id: string;
    statuses?: string[];
    student_id?: string;
    owner_user_id?: string;
    hod_user_id?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(Math.trunc(Number(input.limit ?? 100)), 1), 250);
    const scopeParams: unknown[] = [
      input.tenant_id,
      input.statuses?.length ? input.statuses : null,
      input.student_id ?? null,
      input.owner_user_id ?? null,
      input.hod_user_id ?? null,
    ];
    const metricsResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE status IN ('planned', 'active', 'monitoring'))::integer AS active_interventions,
          COUNT(DISTINCT student_id) FILTER (WHERE student_id IS NOT NULL)::integer AS students_targeted,
          COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed,
          COUNT(*) FILTER (
            WHERE status IN ('planned', 'active', 'monitoring')
              AND due_on IS NOT NULL
              AND due_on < CURRENT_DATE
          )::integer AS overdue
        FROM academic_interventions
        WHERE tenant_id = $1
          AND ($2::text[] IS NULL OR status = ANY($2::text[]))
          AND ($3::text IS NULL OR student_id = $3::text)
          AND ($4::text IS NULL OR owner_user_id::text = $4::text)
          AND ($5::text IS NULL OR hod_user_id::text = $5::text)
      `,
      scopeParams,
    );
    const params: unknown[] = [
      ...scopeParams,
      limit,
    ];
    const listResult = await this.executeSql(
      `
        SELECT
          intervention.id::text,
          intervention.scope_type,
          intervention.student_id,
          NULLIF(BTRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '') AS student_name,
          student.admission_number,
          intervention.exam_series_id::text,
          series.name AS exam_series_name,
          intervention.class_section_id,
          section.name AS class_name,
          intervention.subject_id,
          subject.name AS subject_name,
          intervention.source,
          intervention.trigger_reason,
          intervention.baseline,
          intervention.plan,
          intervention.target,
          intervention.owner_user_id::text,
          owner.display_name AS owner_name,
          intervention.hod_user_id::text,
          hod.display_name AS hod_name,
          intervention.priority,
          intervention.status,
          intervention.starts_on::text,
          intervention.due_on::text,
          intervention.completed_at::text,
          intervention.outcome,
          intervention.created_by_user_id::text,
          intervention.created_at::text,
          intervention.updated_at::text,
          COUNT(update.id)::integer AS update_count,
          MAX(update.recorded_at)::text AS latest_update_at,
          COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'id', update.id::text,
                'update_type', update.update_type,
                'notes', update.notes,
                'score', update.score,
                'score_status', update.score_status,
                'metadata', update.metadata,
                'recorded_by_user_id', update.recorded_by_user_id::text,
                'recorded_at', update.recorded_at
              )
              ORDER BY update.recorded_at DESC
            ) FILTER (WHERE update.id IS NOT NULL),
            '[]'::jsonb
          ) AS updates
        FROM academic_interventions intervention
        LEFT JOIN students student
          ON student.tenant_id = intervention.tenant_id
         AND student.id = intervention.student_id
        LEFT JOIN exam_series series
          ON series.tenant_id = intervention.tenant_id
         AND series.id = intervention.exam_series_id
        LEFT JOIN class_sections section
          ON section.tenant_id = intervention.tenant_id
         AND section.id = intervention.class_section_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = intervention.tenant_id
         AND subject.id = intervention.subject_id
        LEFT JOIN staff_profiles owner
          ON owner.tenant_id = intervention.tenant_id
         AND owner.user_id = intervention.owner_user_id
        LEFT JOIN staff_profiles hod
          ON hod.tenant_id = intervention.tenant_id
         AND hod.user_id = intervention.hod_user_id
        LEFT JOIN academic_intervention_updates update
          ON update.tenant_id = intervention.tenant_id
         AND update.intervention_id = intervention.id
        WHERE intervention.tenant_id = $1
          AND ($2::text[] IS NULL OR intervention.status = ANY($2::text[]))
          AND ($3::text IS NULL OR intervention.student_id = $3::text)
          AND ($4::text IS NULL OR intervention.owner_user_id::text = $4::text)
          AND ($5::text IS NULL OR intervention.hod_user_id::text = $5::text)
        GROUP BY
          intervention.id, student.id, series.id, section.id, subject.id, owner.id, hod.id
        ORDER BY
          CASE intervention.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,
          intervention.due_on ASC NULLS LAST,
          intervention.created_at DESC
        LIMIT $6::integer
      `,
      params,
    );
    const metrics = metricsResult.rows[0] ?? {};
    const items = listResult.rows.map((row: any) => ({
      ...row,
      student_name: row.student_name ?? 'Class or subject intervention',
      class: row.class_name ?? 'All applicable classes',
      subject: row.subject_name ?? 'Cross-subject',
      intervention_type: row.source,
      teacher: row.owner_name ?? 'Owner not assigned',
      start_date: row.starts_on ?? row.created_at,
      status_label: String(row.status ?? '').replace(/_/g, ' '),
    }));
    return {
      metrics: {
        active_interventions: Number(metrics.active_interventions ?? 0),
        students_targeted: Number(metrics.students_targeted ?? 0),
        completed: Number(metrics.completed ?? 0),
        overdue: Number(metrics.overdue ?? 0),
      },
      items,
      academicinterventionsList: items,
    };
  }

  async addAcademicInterventionUpdate(input: {
    tenant_id: string;
    intervention_id: string;
    actor_user_id: string;
    update_type: string;
    notes: string;
    score?: number | null;
    score_status?: string | null;
    metadata: Record<string, unknown>;
    status?: string | null;
    outcome?: Record<string, unknown> | null;
  }) {
    const result = await this.executeSql(
      `
        WITH target AS MATERIALIZED (
          SELECT *
          FROM academic_interventions
          WHERE tenant_id = $1
            AND id::text = $2
          FOR UPDATE
        ),
        history AS (
          INSERT INTO academic_intervention_updates (
            tenant_id, intervention_id, update_type, notes, score, score_status,
            metadata, recorded_by_user_id
          )
          SELECT
            target.tenant_id, target.id, $4, $5, $6::numeric, $7,
            $8::jsonb, $3::uuid
          FROM target
          RETURNING *
        ),
        updated AS (
          UPDATE academic_interventions intervention
          SET status = COALESCE($9, intervention.status),
              outcome = CASE
                WHEN $10::jsonb IS NULL THEN intervention.outcome
                ELSE intervention.outcome || $10::jsonb
              END,
              completed_at = CASE
                WHEN $9 = 'completed' THEN COALESCE(intervention.completed_at, NOW())
                WHEN $9 IS NOT NULL AND $9 <> 'completed' THEN NULL
                ELSE intervention.completed_at
              END,
              updated_by_user_id = $3::uuid,
              updated_at = NOW()
          FROM target
          WHERE intervention.tenant_id = target.tenant_id
            AND intervention.id = target.id
          RETURNING intervention.*
        )
        SELECT
          updated.*,
          updated.id::text AS id,
          updated.exam_series_id::text AS exam_series_id,
          updated.owner_user_id::text AS owner_user_id,
          updated.hod_user_id::text AS hod_user_id,
          history.id::text AS update_id,
          history.update_type,
          history.notes,
          history.score,
          history.score_status,
          history.metadata AS update_metadata,
          history.recorded_at::text
        FROM updated
        CROSS JOIN history
      `,
      [
        input.tenant_id,
        input.intervention_id,
        input.actor_user_id,
        input.update_type,
        input.notes,
        input.score ?? null,
        input.score_status ?? null,
        JSON.stringify(input.metadata),
        input.status ?? null,
        input.outcome ? JSON.stringify(input.outcome) : null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async listAcademicInterventionRecipients(input: {
    tenant_id: string;
    intervention_id: string;
  }) {
    const result = await this.executeSql(
      `
        SELECT DISTINCT recipient.user_id::text AS user_id, recipient.display_name
        FROM academic_interventions intervention
        CROSS JOIN LATERAL (
          VALUES (intervention.owner_user_id), (intervention.hod_user_id)
        ) recipient_id(user_id)
        JOIN staff_profiles recipient
          ON recipient.tenant_id = intervention.tenant_id
         AND recipient.user_id = recipient_id.user_id
         AND recipient.status = 'active'
        WHERE intervention.tenant_id = $1
          AND intervention.id::text = $2
          AND recipient_id.user_id IS NOT NULL
      `,
      [input.tenant_id, input.intervention_id],
    );
    return result.rows;
  }

  private analyticsMarkScope(alias: string, scope: ExamAnalyticsScope): string {
    if (scope.level === 'school') {
      return 'TRUE';
    }

    if (!scope.actor_user_id) {
      throw new ConflictException('An authenticated staff identity is required for scoped analytics');
    }

    if (scope.level === 'department') {
      return `
        EXISTS (
          SELECT 1
          FROM subjects scoped_subject
          JOIN academics_department_hod_appointments hod_appointment
            ON hod_appointment.tenant_id = scoped_subject.tenant_id
           AND hod_appointment.department_id::text = scoped_subject.department_id::text
          WHERE scoped_subject.tenant_id = ${alias}.tenant_id
            AND scoped_subject.id::text = ${alias}.subject_id::text
            AND hod_appointment.teacher_user_id::text = $2
            AND hod_appointment.status = 'active'
            AND (
              hod_appointment.effective_from IS NULL
              OR hod_appointment.effective_from::date <= CURRENT_DATE
            )
            AND (
              hod_appointment.effective_to IS NULL
              OR hod_appointment.effective_to::date >= CURRENT_DATE
            )
        )
      `;
    }

    return `
      (
        EXISTS (
          SELECT 1
          FROM teacher_subject_assignments teacher_assignment
          WHERE teacher_assignment.tenant_id = ${alias}.tenant_id
            AND teacher_assignment.teacher_user_id::text = $2
            AND teacher_assignment.class_section_id::text = ${alias}.class_section_id::text
            AND teacher_assignment.subject_id::text = ${alias}.subject_id::text
            AND teacher_assignment.status = 'active'
            AND (
              teacher_assignment.effective_from IS NULL
              OR teacher_assignment.effective_from::date <= CURRENT_DATE
            )
            AND (
              teacher_assignment.effective_to IS NULL
              OR teacher_assignment.effective_to::date >= CURRENT_DATE
            )
        )
        OR EXISTS (
          SELECT 1
          FROM academics_class_teachers class_teacher
          WHERE class_teacher.tenant_id = ${alias}.tenant_id
            AND class_teacher.teacher_user_id::text = $2
            AND class_teacher.class_section_id::text = ${alias}.class_section_id::text
            AND class_teacher.is_active = TRUE
            AND class_teacher.status = 'active'
            AND (
              class_teacher.effective_from IS NULL
              OR class_teacher.effective_from::date <= CURRENT_DATE
            )
            AND (
              class_teacher.effective_to IS NULL
              OR class_teacher.effective_to::date >= CURRENT_DATE
            )
        )
      )
    `;
  }

  private analyticsWindowScope(alias: string, scope: ExamAnalyticsScope): string {
    if (scope.level === 'school') {
      return 'TRUE';
    }

    if (!scope.actor_user_id) {
      throw new ConflictException('An authenticated staff identity is required for scoped analytics');
    }

    if (scope.level === 'department') {
      return `
        EXISTS (
          SELECT 1
          FROM subjects scoped_subject
          JOIN academics_department_hod_appointments hod_appointment
            ON hod_appointment.tenant_id = scoped_subject.tenant_id
           AND hod_appointment.department_id::text = scoped_subject.department_id::text
          WHERE scoped_subject.tenant_id = ${alias}.tenant_id
            AND scoped_subject.id::text = ${alias}.subject_id::text
            AND hod_appointment.teacher_user_id::text = $2
            AND hod_appointment.status = 'active'
            AND (
              hod_appointment.effective_from IS NULL
              OR hod_appointment.effective_from::date <= CURRENT_DATE
            )
            AND (
              hod_appointment.effective_to IS NULL
              OR hod_appointment.effective_to::date >= CURRENT_DATE
            )
        )
      `;
    }

    return `
      (
        EXISTS (
          SELECT 1
          FROM teacher_subject_assignments teacher_assignment
          WHERE teacher_assignment.tenant_id = ${alias}.tenant_id
            AND teacher_assignment.teacher_user_id::text = $2
            AND teacher_assignment.class_section_id::text = ${alias}.class_section_id::text
            AND teacher_assignment.subject_id::text = ${alias}.subject_id::text
            AND teacher_assignment.status = 'active'
            AND (
              teacher_assignment.effective_from IS NULL
              OR teacher_assignment.effective_from::date <= CURRENT_DATE
            )
            AND (
              teacher_assignment.effective_to IS NULL
              OR teacher_assignment.effective_to::date >= CURRENT_DATE
            )
        )
        OR EXISTS (
          SELECT 1
          FROM academics_class_teachers class_teacher
          WHERE class_teacher.tenant_id = ${alias}.tenant_id
            AND class_teacher.teacher_user_id::text = $2
            AND class_teacher.class_section_id::text = ${alias}.class_section_id::text
            AND class_teacher.is_active = TRUE
            AND class_teacher.status = 'active'
            AND (
              class_teacher.effective_from IS NULL
              OR class_teacher.effective_from::date <= CURRENT_DATE
            )
            AND (
              class_teacher.effective_to IS NULL
              OR class_teacher.effective_to::date >= CURRENT_DATE
            )
        )
      )
    `;
  }

  private analyticsSeriesScope(alias: string, scope: ExamAnalyticsScope): string {
    if (scope.level === 'school') {
      return 'TRUE';
    }

    return `
      EXISTS (
        SELECT 1
        FROM exam_mark_entry_windows scoped_window
        WHERE scoped_window.tenant_id = ${alias}.tenant_id
          AND scoped_window.exam_series_id = ${alias}.id
          AND ${this.analyticsWindowScope('scoped_window', scope)}
      )
    `;
  }

  async getAnalytics(
    tenantId: string,
    scope: ExamAnalyticsScope = {
      level: 'school',
      actor_user_id: null,
      role: 'system',
    },
  ) {
    const queryParams = scope.level === 'school'
      ? [tenantId]
      : [tenantId, scope.actor_user_id];
    const markScope = this.analyticsMarkScope('mark', scope);
    const examMarksScope = this.analyticsMarkScope('exam_marks', scope);
    const windowScope = this.analyticsWindowScope('mark_window', scope);
    const seriesScope = this.analyticsSeriesScope('exam_series', scope);
    const kpiResult = await this.executeSql(
      `
        WITH final_entered_marks AS (
          SELECT
            mark.id,
            (mark.score / assessment.max_score) * 100.0 AS percentage
          FROM exam_marks mark
          JOIN exam_assessments assessment
            ON assessment.tenant_id = mark.tenant_id
           AND assessment.id = mark.assessment_id
          WHERE mark.tenant_id = $1
            AND ${markScope}
            AND mark.status IN ('locked', 'published')
            AND mark.score_status = 'entered'
            AND mark.score IS NOT NULL
            AND assessment.max_score > 0
            AND EXISTS (
              SELECT 1
              FROM student_report_cards card
              WHERE card.tenant_id = mark.tenant_id
                AND card.exam_series_id = mark.exam_series_id
                AND card.student_id::text = mark.student_id::text
                AND card.is_current = TRUE
                AND card.status IN ('approved', 'published')
            )
        ),
        expected_marks AS (
          SELECT DISTINCT
            student.id AS student_id,
            mark_window.exam_series_id,
            assessment.id AS assessment_id
          FROM students student
          JOIN student_class_assignments class_assignment
            ON class_assignment.tenant_id = student.tenant_id
           AND class_assignment.student_id = student.id
           AND class_assignment.status = 'active'
          JOIN exam_mark_entry_windows mark_window
            ON mark_window.tenant_id = class_assignment.tenant_id
           AND mark_window.class_section_id::text = class_assignment.class_section_id
           AND mark_window.status = 'open'
          JOIN student_subject_enrollments subject_enrollment
            ON subject_enrollment.tenant_id = student.tenant_id
           AND subject_enrollment.student_id = student.id
           AND subject_enrollment.class_section_id = mark_window.class_section_id::text
           AND subject_enrollment.subject_id = mark_window.subject_id::text
           AND subject_enrollment.status = 'active'
          JOIN exam_assessments assessment
            ON assessment.tenant_id = mark_window.tenant_id
           AND assessment.exam_series_id = mark_window.exam_series_id
           AND assessment.subject_id = mark_window.subject_id
          WHERE student.tenant_id = $1
            AND student.status = 'active'
            AND ${windowScope}
        ),
        expected_mark_evidence AS (
          SELECT
            expected.student_id,
            expected.exam_series_id,
            expected.assessment_id,
            mark.id AS mark_id,
            mark.score_status
          FROM expected_marks expected
          LEFT JOIN exam_marks mark
            ON mark.tenant_id = $1
           AND mark.exam_series_id = expected.exam_series_id
           AND mark.assessment_id = expected.assessment_id
           AND mark.student_id::text = expected.student_id
        )
        SELECT
          (SELECT ROUND(AVG(percentage), 2)::numeric FROM final_entered_marks) AS school_average,
          (
            SELECT COUNT(*)::integer
            FROM exam_marks
            WHERE tenant_id = $1
              AND ${examMarksScope}
              AND status = 'submitted'
          ) AS pending_reviews,
          (
            SELECT COUNT(*)::integer
            FROM expected_mark_evidence
            WHERE mark_id IS NULL
               OR score_status IN ('not_assessed', 'incomplete')
          ) AS missing_marks_alerts,
          (
            SELECT COUNT(*)::integer
            FROM exam_series
            WHERE tenant_id = $1
              AND ${seriesScope}
              AND status IN ('draft', 'submitted', 'reviewed')
              AND CURRENT_DATE BETWEEN starts_on AND ends_on
          ) AS active_exams,
          (SELECT COUNT(*)::integer FROM final_entered_marks) AS final_mark_count,
          (
            SELECT COUNT(*)::integer
            FROM exam_marks
            WHERE tenant_id = $1
              AND ${examMarksScope}
              AND status IN ('locked', 'published')
              AND score_status <> 'entered'
              AND EXISTS (
                SELECT 1
                FROM student_report_cards card
                WHERE card.tenant_id = exam_marks.tenant_id
                  AND card.exam_series_id = exam_marks.exam_series_id
                  AND card.student_id::text = exam_marks.student_id::text
                  AND card.is_current = TRUE
                  AND card.status IN ('approved', 'published')
              )
          ) AS explicit_evidence_count,
          (
            SELECT COUNT(*)::integer
            FROM expected_mark_evidence
            WHERE mark_id IS NULL
               OR score_status IN ('not_assessed', 'incomplete')
          ) AS missing_or_incomplete_count
      `,
      queryParams,
    );
    const kpiRow = kpiResult.rows[0] ?? {};
    const kpis = {
      school_average:
        kpiRow.school_average === null || kpiRow.school_average === undefined
          ? null
          : Number(kpiRow.school_average),
      pending_reviews: Number(kpiRow.pending_reviews ?? 0),
      missing_marks_alerts: Number(kpiRow.missing_marks_alerts ?? 0),
      active_exams: Number(kpiRow.active_exams ?? 0),
    };
    const dataQuality = {
      final_mark_count: Number(kpiRow.final_mark_count ?? 0),
      explicit_evidence_count: Number(kpiRow.explicit_evidence_count ?? 0),
      missing_or_incomplete_count: Number(kpiRow.missing_or_incomplete_count ?? 0),
    };

    const trendsResult = await this.executeSql(
      `
        SELECT
          series.id::text AS exam_series_id,
          series.name AS exam_series_name,
          series.starts_on::text AS starts_on,
          ROUND(AVG((mark.score / assessment.max_score) * 100.0), 2)::numeric AS average_score
        FROM exam_series series
        JOIN exam_marks mark
          ON mark.tenant_id = series.tenant_id
         AND mark.exam_series_id = series.id
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE series.tenant_id = $1
          AND ${markScope}
          AND mark.status IN ('locked', 'published')
          AND mark.score_status = 'entered'
          AND mark.score IS NOT NULL
          AND assessment.max_score > 0
          AND EXISTS (
            SELECT 1
            FROM student_report_cards card
            WHERE card.tenant_id = mark.tenant_id
              AND card.exam_series_id = mark.exam_series_id
              AND card.student_id::text = mark.student_id::text
              AND card.is_current = TRUE
              AND card.status IN ('approved', 'published')
          )
        GROUP BY series.id, series.name, series.starts_on
        ORDER BY series.starts_on ASC, series.id ASC
      `,
      queryParams,
    );
    const trends = trendsResult.rows.map((row: any) => ({
      exam_series_id: row.exam_series_id,
      exam_series_name: row.exam_series_name,
      starts_on: row.starts_on,
      average_score: Number(row.average_score),
    }));

    const subjectPerformanceResult = await this.executeSql(
      `
        WITH final_marks AS (
          SELECT
            mark.tenant_id,
            mark.exam_series_id,
            subject.id AS subject_id,
            subject.name AS subject_name,
            series.ends_on,
            (mark.score / assessment.max_score) * 100.0 AS percentage
          FROM exam_marks mark
          JOIN exam_assessments assessment
            ON assessment.tenant_id = mark.tenant_id
           AND assessment.id = mark.assessment_id
          JOIN exam_series series
            ON series.tenant_id = mark.tenant_id
           AND series.id = mark.exam_series_id
          JOIN subjects subject
            ON subject.tenant_id = mark.tenant_id
           AND subject.id = mark.subject_id::text
          WHERE mark.tenant_id = $1
            AND ${markScope}
            AND mark.status IN ('locked', 'published')
            AND mark.score_status = 'entered'
            AND mark.score IS NOT NULL
            AND assessment.max_score > 0
            AND EXISTS (
              SELECT 1
              FROM student_report_cards card
              WHERE card.tenant_id = mark.tenant_id
                AND card.exam_series_id = mark.exam_series_id
                AND card.student_id::text = mark.student_id::text
                AND card.is_current = TRUE
                AND card.status IN ('approved', 'published')
            )
        ),
        graded_marks AS (
          SELECT
            final_mark.*,
            boundary.label AS grade_label,
            COALESCE(boundary.is_pass, final_mark.percentage >= 50.0) AS is_pass
          FROM final_marks final_mark
          LEFT JOIN LATERAL (
            SELECT policy.id
            FROM exam_grading_policies policy
            WHERE policy.tenant_id = final_mark.tenant_id
              AND (policy.exam_series_id = final_mark.exam_series_id OR policy.exam_series_id IS NULL)
              AND policy.status IN ('active', 'replaced', 'archived')
              AND (policy.effective_from IS NULL OR policy.effective_from::date <= final_mark.ends_on)
              AND (policy.effective_to IS NULL OR policy.effective_to::date >= final_mark.ends_on)
            ORDER BY
              (policy.exam_series_id = final_mark.exam_series_id) DESC,
              policy.version DESC,
              policy.activated_at DESC NULLS LAST
            LIMIT 1
          ) selected_policy ON TRUE
          LEFT JOIN LATERAL (
            SELECT policy_boundary.label, policy_boundary.is_pass
            FROM exam_grading_policy_boundaries policy_boundary
            WHERE policy_boundary.tenant_id = final_mark.tenant_id
              AND policy_boundary.grading_policy_id = selected_policy.id
              AND policy_boundary.min_score <= final_mark.percentage
            ORDER BY policy_boundary.min_score DESC
            LIMIT 1
          ) boundary ON TRUE
        )
        SELECT
          subject_id,
          subject_name,
          ROUND(AVG(percentage), 2)::numeric AS mean_score,
          ROUND(AVG(CASE WHEN is_pass THEN 100.0 ELSE 0.0 END), 2)::numeric AS pass_rate,
          COUNT(*) FILTER (
            WHERE UPPER(grade_label) = 'EE' OR grade_label ILIKE '%exceed%'
          )::integer AS ee_count,
          COUNT(*) FILTER (
            WHERE UPPER(grade_label) = 'ME' OR grade_label ILIKE '%meet%'
          )::integer AS me_count,
          COUNT(*) FILTER (
            WHERE UPPER(grade_label) = 'AE' OR grade_label ILIKE '%approach%'
          )::integer AS ae_count,
          COUNT(*) FILTER (
            WHERE UPPER(grade_label) = 'BE' OR grade_label ILIKE '%below%'
          )::integer AS be_count
        FROM graded_marks
        GROUP BY subject_id, subject_name
        ORDER BY subject_name ASC
      `,
      queryParams,
    );
    const subjectPerformance = subjectPerformanceResult.rows.map((row: any) => ({
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      mean_score: Number(row.mean_score),
      pass_rate: Number(row.pass_rate),
      ee_count: Number(row.ee_count ?? 0),
      me_count: Number(row.me_count ?? 0),
      ae_count: Number(row.ae_count ?? 0),
      be_count: Number(row.be_count ?? 0),
    }));

    const topPerformersResult = await this.executeSql(
      `
        SELECT
          student.id AS student_id,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number,
          ROUND(AVG((mark.score / assessment.max_score) * 100.0), 2)::numeric AS average_percentage,
          COUNT(mark.id)::integer AS assessments_taken
        FROM students student
        JOIN exam_marks mark
          ON mark.tenant_id = student.tenant_id
         AND mark.student_id::text = student.id
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE student.tenant_id = $1
          AND student.status = 'active'
          AND ${markScope}
          AND mark.status IN ('locked', 'published')
          AND mark.score_status = 'entered'
          AND mark.score IS NOT NULL
          AND assessment.max_score > 0
          AND EXISTS (
            SELECT 1
            FROM student_report_cards card
            WHERE card.tenant_id = mark.tenant_id
              AND card.exam_series_id = mark.exam_series_id
              AND card.student_id::text = mark.student_id::text
              AND card.is_current = TRUE
              AND card.status IN ('approved', 'published')
          )
        GROUP BY
          student.id,
          student.first_name,
          student.middle_name,
          student.last_name,
          student.admission_number
        ORDER BY average_percentage DESC, student_name ASC
        LIMIT 10
      `,
      queryParams,
    );
    const topPerformers = topPerformersResult.rows.map((row: any) => ({
      student_id: row.student_id,
      student_name: row.student_name,
      admission_number: row.admission_number,
      average_percentage: Number(row.average_percentage),
      assessments_taken: Number(row.assessments_taken),
    }));

    const topImproversResult = await this.executeSql(
      `
        WITH student_series_averages AS (
          SELECT
            mark.student_id::text AS student_id,
            mark.exam_series_id,
            series.name AS exam_series_name,
            series.starts_on AS exam_series_date,
            AVG((mark.score / assessment.max_score) * 100.0) AS average_percentage
          FROM exam_marks mark
          JOIN exam_assessments assessment
            ON assessment.tenant_id = mark.tenant_id
           AND assessment.id = mark.assessment_id
          JOIN exam_series series
            ON series.tenant_id = mark.tenant_id
           AND series.id = mark.exam_series_id
          WHERE mark.tenant_id = $1
            AND ${markScope}
            AND mark.status IN ('locked', 'published')
            AND mark.score_status = 'entered'
            AND mark.score IS NOT NULL
            AND assessment.max_score > 0
            AND EXISTS (
              SELECT 1
              FROM student_report_cards card
              WHERE card.tenant_id = mark.tenant_id
                AND card.exam_series_id = mark.exam_series_id
                AND card.student_id::text = mark.student_id::text
                AND card.is_current = TRUE
                AND card.status IN ('approved', 'published')
            )
          GROUP BY
            mark.student_id,
            mark.exam_series_id,
            series.name,
            series.starts_on
        ),
        ranked_student_averages AS (
          SELECT
            student_id,
            exam_series_id,
            exam_series_name,
            exam_series_date,
            average_percentage,
            ROW_NUMBER() OVER (
              PARTITION BY student_id
              ORDER BY exam_series_date DESC, exam_series_id DESC
            ) AS rank
          FROM student_series_averages
        )
        SELECT
          student.id AS student_id,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number,
          latest.exam_series_name AS latest_exam_series,
          ROUND(latest.average_percentage::numeric, 2) AS latest_average,
          previous.exam_series_name AS previous_exam_series,
          ROUND(previous.average_percentage::numeric, 2) AS previous_average,
          ROUND((latest.average_percentage - previous.average_percentage)::numeric, 2) AS improvement
        FROM ranked_student_averages latest
        JOIN ranked_student_averages previous
          ON previous.student_id = latest.student_id
         AND previous.rank = 2
        JOIN students student
          ON student.tenant_id = $1
         AND student.id = latest.student_id
        WHERE latest.rank = 1
          AND student.status = 'active'
          AND latest.average_percentage > previous.average_percentage
        ORDER BY improvement DESC, student_name ASC
        LIMIT 10
      `,
      queryParams,
    );
    const topImprovers = topImproversResult.rows.map((row: any) => ({
      student_id: row.student_id,
      student_name: row.student_name,
      admission_number: row.admission_number,
      latest_exam_series: row.latest_exam_series,
      latest_average: Number(row.latest_average),
      previous_exam_series: row.previous_exam_series,
      previous_average: Number(row.previous_average),
      improvement: Number(row.improvement),
    }));

    const atRiskStudentsResult = await this.executeSql(
      `
        SELECT
          student.id AS student_id,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          student.admission_number,
          ROUND(AVG((mark.score / assessment.max_score) * 100.0), 2)::numeric AS average_percentage,
          COUNT(mark.id)::integer AS assessments_taken
        FROM students student
        JOIN exam_marks mark
          ON mark.tenant_id = student.tenant_id
         AND mark.student_id::text = student.id
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE student.tenant_id = $1
          AND student.status = 'active'
          AND ${markScope}
          AND mark.status IN ('locked', 'published')
          AND mark.score_status = 'entered'
          AND mark.score IS NOT NULL
          AND assessment.max_score > 0
          AND EXISTS (
            SELECT 1
            FROM student_report_cards card
            WHERE card.tenant_id = mark.tenant_id
              AND card.exam_series_id = mark.exam_series_id
              AND card.student_id::text = mark.student_id::text
              AND card.is_current = TRUE
              AND card.status IN ('approved', 'published')
          )
        GROUP BY
          student.id,
          student.first_name,
          student.middle_name,
          student.last_name,
          student.admission_number
        HAVING AVG((mark.score / assessment.max_score) * 100.0) < 50.0
        ORDER BY average_percentage ASC, student_name ASC
        LIMIT 10
      `,
      queryParams,
    );
    const atRiskStudents = atRiskStudentsResult.rows.map((row: any) => ({
      student_id: row.student_id,
      student_name: row.student_name,
      admission_number: row.admission_number,
      average_percentage: Number(row.average_percentage),
      assessments_taken: Number(row.assessments_taken),
    }));

    return {
      scope: {
        level: scope.level,
        role: scope.role,
      },
      kpis,
      trends,
      subjectPerformance,
      studentProgress: {
        topPerformers,
        topImprovers,
        atRiskStudents,
      },
      data_quality: dataQuality,
    };
  }

}
