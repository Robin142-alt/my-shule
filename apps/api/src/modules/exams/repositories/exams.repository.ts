import { ConflictException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class ExamsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createSeries(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
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

  async createAssessment(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query<{ id: string; status?: string }>(
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
    await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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

    const result = await this.databaseService.query<{ id: string }>(
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
    const result = await this.databaseService.query(
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
    const seriesResult = await this.databaseService.query(
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
    const studentResult = await this.databaseService.query(
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
    const subjectsResult = await this.databaseService.query(
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

    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
      `
        SELECT
          assessment.id::text,
          assessment.exam_series_id::text,
          series.academic_term_id::text,
          assessment.subject_id::text,
          COALESCE(window.class_section_id::text, '') AS class_section_id,
          assessment.max_score::text
        FROM exam_assessments assessment
        JOIN exam_series series
          ON series.tenant_id = assessment.tenant_id
         AND series.id = assessment.exam_series_id
        LEFT JOIN exam_mark_entry_windows window
          ON window.tenant_id = assessment.tenant_id
         AND window.exam_series_id = assessment.exam_series_id
         AND window.subject_id = assessment.subject_id
        WHERE assessment.tenant_id = $1
          AND assessment.id = $2::uuid
        ORDER BY window.created_at DESC NULLS LAST
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    await this.databaseService.query(
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
    await this.databaseService.query(
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
}
