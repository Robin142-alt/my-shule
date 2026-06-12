import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
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
        VALUES ($1, $2::uuid, $3, $4::date, $5::date, $6::uuid)
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
          AND teacher_user_id = $2::uuid
          AND academic_term_id = $3::uuid
          AND class_section_id = $4::uuid
          AND subject_id = $5::uuid
          AND status = 'active'
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
          $10::uuid,
          $10::uuid
        )
        ON CONFLICT (tenant_id, assessment_id, student_id)
        DO UPDATE SET
          score = EXCLUDED.score,
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
        input.remarks ?? null,
        input.actor_user_id,
      ],
    );

    return result.rows[0];
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
            remarks = COALESCE($4, remarks),
            updated_by_user_id = $5::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [
        input.tenant_id,
        input.mark_id,
        input.score,
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
          correction_score,
          corrected_by_user_id,
          reason,
          approval_state,
          first_approver_user_id,
          second_approver_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3::numeric, $4::numeric, $5::uuid, $6, $7, $8::uuid, $9::uuid, $10::jsonb)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.mark_id,
        input.original_score,
        input.correction_score,
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
        WHERE mark.tenant_id = $1
          AND mark.id = $2::uuid
      `,
      [input.tenant_id, input.mark_id],
    );

    return result.rows;
  }

  async markReportCardsRegenerationRequired(input: Record<string, unknown>) {
    await this.executeSql(
      `
        UPDATE student_report_cards
        SET
          status = $3,
          metadata = metadata || $4::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = ANY($2::uuid[])
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
  }

  async createReportCardSnapshot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO student_report_cards (
          tenant_id,
          exam_series_id,
          student_id,
          report_snapshot_id,
          status,
          published_by_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, 'published', $5::uuid, $6::jsonb)
        ON CONFLICT (tenant_id, exam_series_id, student_id)
        DO UPDATE SET
          report_snapshot_id = EXCLUDED.report_snapshot_id,
          status = 'published',
          published_by_user_id = EXCLUDED.published_by_user_id,
          published_at = NOW(),
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        WHERE student_report_cards.status <> 'published'
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
      throw new ConflictException('Published report cards are immutable; generate a corrected version instead');
    }

    if (!result.rows[0]) {
      throw new ConflictException('Existing exam mark scope does not match the submitted exam scope');
    }

    return result.rows[0];
  }

  async createGeneratedReportCardSnapshot(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO student_report_cards (
          tenant_id,
          exam_series_id,
          student_id,
          report_snapshot_id,
          status,
          verification_code,
          published_by_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $7, $8, $5::uuid, $6::jsonb)
        ON CONFLICT (tenant_id, exam_series_id, student_id)
        DO UPDATE SET
          report_snapshot_id = EXCLUDED.report_snapshot_id,
          status = EXCLUDED.status,
          verification_code = EXCLUDED.verification_code,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        WHERE student_report_cards.status <> 'published'
        RETURNING *
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
      ],
    );

    return result.rows[0];
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
        SELECT id::text
        FROM students
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR NULLIF(metadata->>'class_section_id', '')::uuid = $2::uuid)
          AND ($3::text IS NULL OR metadata->>'stream_name' = $3::text)
        ORDER BY admission_number ASC, created_at ASC
        LIMIT $4::integer
        OFFSET $5::integer
      `,
      [input.tenant_id, input.class_section_id ?? null, input.stream_name ?? null, limit, offset],
    );

    return result.rows;
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
         AND student.id = card.student_id
        JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        WHERE artifact.tenant_id = $1
          AND artifact.verification_code = $2
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
         AND term.id = series.academic_term_id
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
          class_section.custom_label AS stream_name
        FROM students student
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = student.tenant_id
         AND class_section.id = NULLIF(student.metadata->>'class_section_id', '')::uuid
        WHERE student.tenant_id = $1
          AND student.id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.student_id],
    );
    const subjectsResult = await this.executeSql(
      `
        SELECT
          mark.subject_id::text,
          COALESCE(subject.name, assessment.name, 'Subject') AS subject_name,
          mark.score::float AS score,
          assessment.max_score::float AS max_score,
          boundary.label AS grade_label,
          COALESCE(mark.remarks, boundary.remarks) AS remarks
        FROM exam_marks mark
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark.tenant_id
         AND subject.id = mark.subject_id
        LEFT JOIN exam_grade_boundaries boundary
          ON boundary.tenant_id = mark.tenant_id
         AND boundary.exam_series_id = mark.exam_series_id
         AND mark.score BETWEEN boundary.min_score AND boundary.max_score
        WHERE mark.tenant_id = $1
          AND mark.exam_series_id = $2::uuid
          AND mark.student_id = $3::uuid
        ORDER BY subject.name NULLS LAST, assessment.name
      `,
      [input.tenant_id, input.exam_series_id, input.student_id],
    );

    return {
      exam_series: seriesResult.rows[0] ?? null,
      student: studentResult.rows[0] ?? null,
      subjects: subjectsResult.rows,
      attendance: null,
    };
  }

  async listReportCards(input: {
    tenant_id: string;
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
          card.published_by_user_id::text,
          card.published_at::text,
          card.metadata,
          card.created_at::text,
          card.updated_at::text
        FROM student_report_cards card
        WHERE card.tenant_id = $1
          AND ($2::uuid IS NULL OR card.student_id = $2::uuid)
        ORDER BY card.published_at DESC NULLS LAST, card.created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      [input.tenant_id, input.student_id ?? null, limit, offset],
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
         AND guardian.student_id = card.student_id
         AND guardian.user_id = $3::uuid
         AND guardian.status = 'active'
        WHERE card.tenant_id = $1
          AND card.id = $2::uuid
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
          window.id::text,
          window.exam_series_id::text,
          window.subject_id::text,
          window.class_section_id::text,
          window.opens_at::text,
          window.closes_at::text,
          window.status,
          COUNT(mark.id)::int AS mark_count,
          MAX(mark.updated_at)::text AS last_marked_at
        FROM exam_mark_entry_windows window
        LEFT JOIN exam_marks mark
          ON mark.tenant_id = window.tenant_id
         AND mark.exam_series_id = window.exam_series_id
         AND mark.subject_id = window.subject_id
         AND mark.class_section_id = window.class_section_id
        WHERE window.tenant_id = $1
          AND ($2::uuid IS NULL OR window.exam_series_id = $2::uuid)
          AND ($3::uuid IS NULL OR window.class_section_id = $3::uuid)
          AND ($4::uuid IS NULL OR window.subject_id = $4::uuid)
          AND (
            $5::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM exam_series series
              JOIN teacher_subject_assignments assignment
                ON assignment.tenant_id = series.tenant_id
               AND assignment.academic_term_id = series.academic_term_id
               AND assignment.class_section_id = window.class_section_id
               AND assignment.subject_id = window.subject_id
               AND assignment.teacher_user_id = $5::uuid
               AND assignment.status = 'active'
              WHERE series.tenant_id = window.tenant_id
                AND series.id = window.exam_series_id
            )
          )
        GROUP BY window.id
        ORDER BY window.closes_at DESC, window.opens_at DESC
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
    limit?: number;
    offset?: number;
  }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    
    let query = `
      SELECT m.*
      FROM exam_marks m
    `;
    const params: any[] = [input.tenant_id];
    let paramIndex = 2;
    
    if (input.department_id) {
      query += ` JOIN subjects s ON s.id = m.subject_id AND s.tenant_id = m.tenant_id `;
    }
    query += ` WHERE m.tenant_id = $1 `;
    
    if (input.department_id) {
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
  }) {
    const status = input.action === 'approve' ? 'reviewed' : 'draft';
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET status = $3,
            updated_by_user_id = $4::uuid,
            reviewed_at = CASE WHEN $3 = 'reviewed' THEN NOW() ELSE reviewed_at END,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = ANY($2::uuid[])
        RETURNING *
      `,
      [input.tenant_id, input.mark_ids, status, input.actor_user_id]
    );
    return result.rows;
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
  }) {
    await this.executeSql(
      `
        UPDATE exam_series
        SET status = 'published',
            published_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
      `,
      [input.tenant_id, input.exam_series_id]
    );
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET status = 'published',
            updated_by_user_id = $3::uuid,
            published_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND exam_series_id = $2::uuid AND status IN ('locked', 'reviewed')
        RETURNING *
      `,
      [input.tenant_id, input.exam_series_id, input.actor_user_id]
    );
    return result.rows;
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
        RETURNING *
      `,
      [
        input.tenant_id,
        input.timetable_slot_id,
        input.staff_user_id,
        input.role ?? 'invigilator',
      ],
    );
    return result.rows[0];
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
    return result.rows[0];
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

  async getAuditLogs(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_marks_audit_logs WHERE tenant_id = $1`;
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

  async getMarkEntryWindows(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_mark_entry_windows WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY opens_at ASC`;
    const result = await this.executeSql(query, params);
    return result.rows;
  }

  async getMarks(tenantId: string, filters: Record<string, any> = {}) {
    let query = `SELECT * FROM exam_marks WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }

    if (filters.student_id) {
      query += ` AND student_id = $${paramCount}::uuid`;
      params.push(filters.student_id);
      paramCount++;
    }
    
    query += ` ORDER BY updated_at DESC LIMIT 1000`;
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
    let query = `SELECT * FROM report_card_generation_batches WHERE tenant_id = $1`;
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

}
