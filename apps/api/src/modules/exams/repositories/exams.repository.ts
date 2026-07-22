import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

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
          window.id::text,
          window.exam_series_id::text,
          window.subject_id::text,
          window.class_section_id::text,
          window.opens_at::text,
          window.closes_at::text,
          window.status
        FROM exam_mark_entry_windows window
        JOIN exam_series series
          ON series.tenant_id = window.tenant_id
         AND series.id = window.exam_series_id
        WHERE window.tenant_id = $1
          AND window.exam_series_id = $2::uuid
          AND series.academic_term_id = $3::uuid
          AND window.class_section_id = $4::uuid
          AND window.subject_id = $5::uuid
          AND window.status = 'open'
          AND window.opens_at <= NOW()
          AND window.closes_at >= NOW()
        ORDER BY window.created_at DESC
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
           remarks text
         )
       ), previous AS MATERIALIZED (
         SELECT source.*,
           mark.id AS previous_mark_id,
           mark.score AS previous_score,
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
           class_section_id, subject_id, student_id, score, remarks,
           entered_by_user_id, updated_by_user_id
         )
         SELECT $1, exam_series_id, assessment_id, academic_term_id,
           class_section_id, subject_id, student_id, score, remarks, $2::uuid, $2::uuid
         FROM source
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
           previous_score, previous_remarks, previous_status,
           imported_score, imported_remarks, imported_status
         )
         SELECT $1, batch.id, mark.id, previous.row_number,
           previous.previous_mark_id IS NOT NULL,
           previous.previous_score, previous.previous_remarks, previous.previous_status,
           mark.score, mark.remarks, mark.status
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
           jsonb_build_object('bulk_upload', true, 'batch_id', batch.id, 'row_number', previous.row_number)
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
         SELECT window.class_section_id, window.subject_id, COUNT(student.id)::integer AS expected_count
         FROM windows window
         LEFT JOIN students student
           ON student.tenant_id = $1
          AND student.status = 'active'
          AND EXISTS (
            SELECT 1 FROM student_class_assignments class_assignment
            WHERE class_assignment.tenant_id = student.tenant_id
              AND class_assignment.student_id = student.id::text
              AND class_assignment.class_section_id = window.class_section_id::text
              AND class_assignment.status = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM student_subject_enrollments subject_enrollment
            WHERE subject_enrollment.tenant_id = student.tenant_id
              AND subject_enrollment.student_id = student.id::text
              AND subject_enrollment.class_section_id = window.class_section_id::text
              AND subject_enrollment.subject_id = window.subject_id::text
              AND subject_enrollment.status = 'active'
          )
         GROUP BY window.class_section_id, window.subject_id
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
            OR mark.remarks IS DISTINCT FROM item.imported_remarks
            OR mark.status IS DISTINCT FROM item.imported_status
       ), restored AS (
         UPDATE exam_marks mark
         SET score = item.previous_score,
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
          card.verification_code,
          card.metadata,
          card.updated_at::text
        FROM student_report_cards card
        WHERE card.tenant_id = $1
          AND card.exam_series_id = $2::uuid
          AND card.student_id = $3::uuid
          AND card.report_snapshot_id = $4
          AND card.status = 'approved'
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

  async transitionReportCard(input: { tenant_id: string; actor_user_id: string; report_card_id: string; action: string }) {
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
       )
       UPDATE student_report_cards card
       SET status = transition.target_status,
           published_by_user_id = CASE WHEN $4 = 'publish' THEN $2::uuid ELSE card.published_by_user_id END,
           published_at = CASE WHEN $4 = 'publish' THEN NOW() ELSE card.published_at END,
           metadata = card.metadata || CASE
             WHEN $4 = 'unpublish' THEN jsonb_build_object('withdrawn_at', NOW(), 'withdrawn_by', $2::text)
             WHEN $4 = 'publish' THEN jsonb_build_object('published_by', $2::text)
             ELSE jsonb_build_object('last_transition', $4::text, 'transitioned_by', $2::text, 'transitioned_at', NOW())
           END,
           updated_at = NOW()
       FROM transition
       WHERE card.tenant_id = $1
         AND card.id = $3::uuid
         AND card.status = ANY(transition.source_statuses)
       RETURNING card.*`,
      [input.tenant_id, input.actor_user_id, input.report_card_id, input.action],
    );
    return result.rows[0] ?? null;
  }

  async updateReportCardComments(input: { tenant_id: string; actor_user_id: string; report_card_id: string; class_teacher_comment: string; principal_comment: string }) {
    const result = await this.executeSql(
      `UPDATE student_report_cards
       SET metadata = metadata || jsonb_build_object(
             'class_teacher_comment', $4::text,
             'principal_comment', $5::text,
             'comments_updated_by', $2::text,
             'comments_updated_at', NOW()
           ),
           updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $3::uuid
         AND status NOT IN ('published', 'withdrawn')
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
        FROM students student
        LEFT JOIN student_class_assignments assignment
          ON assignment.tenant_id = student.tenant_id
         AND assignment.student_id = student.id::text
         AND assignment.status = 'active'
        LEFT JOIN class_streams stream
          ON stream.tenant_id = assignment.tenant_id
         AND stream.id = assignment.stream_id
        WHERE student.tenant_id = $1
          AND student.status = 'active'
          AND ($2::uuid IS NULL OR assignment.class_section_id = $2::text)
          AND ($3::text IS NULL OR stream.name = $3::text)
        ORDER BY student.admission_number ASC, student.created_at ASC
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
         AND subject.id = mark.subject_id::text
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
          card.published_at::text,
          card.metadata,
          card.created_at::text,
          card.updated_at::text
        FROM student_report_cards card
        WHERE card.tenant_id = $1
          AND ($2::uuid IS NULL OR card.student_id = $2::uuid)
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
         AND guardian.student_id = card.student_id
         AND guardian.user_id = $2::uuid
         AND guardian.status = 'active'
        INNER JOIN students student
          ON student.tenant_id = card.tenant_id
         AND student.id = card.student_id
         AND student.status <> 'archived'
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id = series.academic_term_id
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        WHERE card.tenant_id = $1
          AND card.status = 'published'
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
         AND student.id = card.student_id
         AND student.status <> 'archived'
        LEFT JOIN exam_series series
          ON series.tenant_id = card.tenant_id
         AND series.id = card.exam_series_id
        LEFT JOIN academic_terms term
          ON term.tenant_id = series.tenant_id
         AND term.id = series.academic_term_id
        LEFT JOIN academic_years year
          ON year.tenant_id = term.tenant_id
         AND year.id = term.academic_year_id
        WHERE card.tenant_id = $1
          AND card.student_id = $2::uuid
          AND card.status = 'published'
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
         AND student.id = card.student_id
         AND student.status <> 'archived'
        WHERE card.tenant_id = $1
          AND card.id = $2::uuid
          AND card.student_id = $3::uuid
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
               AND assignment.academic_term_id = series.academic_term_id::text
               AND assignment.class_section_id = window.class_section_id::text
               AND assignment.subject_id = window.subject_id::text
               AND assignment.teacher_user_id = $5::text
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

  async submitMarks(input: { tenant_id: string; actor_user_id: string; mark_ids: string[]; restrict_to_actor?: boolean }) {
    const result = await this.executeSql(
      `
        UPDATE exam_marks
        SET status = 'submitted',
            updated_by_user_id = $3::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND mark.id = ANY($2::uuid[])
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
       UPDATE exam_mark_entry_windows window
       SET status = CASE WHEN $4 = 'lock' THEN 'closed' ELSE 'open' END,
           last_action = CASE WHEN $4 = 'return' THEN 'returned' WHEN $4 = 'lock' THEN 'locked' ELSE 'opened' END,
           last_action_at = NOW(),
           last_action_by_user_id = $2::uuid,
           return_reason = CASE WHEN $4 = 'return' THEN $5 ELSE NULL END,
           updated_at = NOW()
       FROM mark_state, changed_summary
       WHERE window.tenant_id = $1
         AND window.id = $3::uuid
         AND (
           $4 = 'open'
           OR ($4 = 'lock' AND mark_state.total_marks > 0 AND mark_state.blockers = 0)
           OR ($4 = 'return' AND mark_state.total_marks > 0 AND mark_state.published_marks = 0)
         )
       RETURNING window.*, window.last_action AS workflow_status, changed_summary.affected_marks`,
      [input.tenant_id, input.actor_user_id, input.mark_window_id, input.action, input.reason ?? null],
    );
    return result.rows[0] ?? null;
  }

  async findMarkWindowRecipients(input: { tenant_id: string; mark_window_id: string }) {
    const result = await this.executeSql(
      `SELECT
         window.id::text,
         COALESCE(class_section.name, window.class_section_id::text) AS class_name,
         COALESCE(subject.name, window.subject_id::text) AS subject_name,
         window.closes_at::text,
         COALESCE(array_remove(array_agg(DISTINCT assignment.teacher_user_id::text), NULL), ARRAY[]::text[]) AS recipient_user_ids
       FROM exam_mark_entry_windows window
       INNER JOIN exam_series series
         ON series.tenant_id = window.tenant_id AND series.id = window.exam_series_id
       LEFT JOIN teacher_subject_assignments assignment
         ON assignment.tenant_id = window.tenant_id
        AND assignment.academic_term_id = series.academic_term_id::text
        AND assignment.class_section_id = window.class_section_id::text
        AND assignment.subject_id = window.subject_id::text
        AND assignment.status = 'active'
       LEFT JOIN class_sections class_section
         ON class_section.tenant_id = window.tenant_id AND class_section.id = window.class_section_id::text
       LEFT JOIN subjects subject
         ON subject.tenant_id = window.tenant_id AND subject.id = window.subject_id::text
       WHERE window.tenant_id = $1 AND window.id = $2::uuid
       GROUP BY window.id, class_section.name, subject.name
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

  async createGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `INSERT INTO exam_grading_policies (
         tenant_id,
         exam_series_id,
         name,
         reporting_mode,
         status,
         created_by_user_id
       )
       VALUES ($1, $2::uuid, $3, $4, 'draft', $5::uuid)
       RETURNING *`,
      [
        input.tenant_id,
        input.exam_series_id ?? null,
        input.name,
        input.reporting_mode,
        input.actor_user_id,
      ],
    );
    return result.rows[0];
  }

  async transitionGradingPolicy(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `WITH target AS (
         SELECT id, exam_series_id
         FROM exam_grading_policies
         WHERE tenant_id = $1 AND id = $2::uuid
       ), retired AS (
         UPDATE exam_grading_policies policy
         SET status = 'retired', updated_at = NOW()
         FROM target
         WHERE $3 = 'active'
           AND policy.tenant_id = $1
           AND policy.status = 'active'
           AND policy.id <> target.id
           AND policy.exam_series_id IS NOT DISTINCT FROM target.exam_series_id
         RETURNING policy.id
       )
       UPDATE exam_grading_policies policy
       SET status = $3, updated_at = NOW()
       FROM target
       WHERE policy.tenant_id = $1 AND policy.id = target.id
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
         updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING *`,
      [input.tenant_id, input.policy_id, input.name ?? null, input.reporting_mode ?? null],
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

  async createGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `INSERT INTO exam_grading_policy_boundaries (tenant_id, grading_policy_id, label, min_score, max_score, points, descriptor)
       SELECT $1, policy.id, $3, $4, $5, $6, $7 FROM exam_grading_policies policy
       WHERE policy.tenant_id = $1 AND policy.id = $2::uuid RETURNING *`,
      [input.tenant_id, input.policy_id, input.label, input.min_score, input.max_score, input.points ?? null, input.descriptor ?? null],
    );
    return result.rows[0] ?? null;
  }

  async updateGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `UPDATE exam_grading_policy_boundaries
       SET label = COALESCE($3, label), min_score = COALESCE($4, min_score), max_score = COALESCE($5, max_score),
           points = COALESCE($6, points), descriptor = COALESCE($7, descriptor)
       WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [input.tenant_id, input.boundary_id, input.label ?? null, input.min_score ?? null, input.max_score ?? null, input.points ?? null, input.descriptor ?? null],
    );
    return result.rows[0] ?? null;
  }

  async deleteGradingPolicyBoundary(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `DELETE FROM exam_grading_policy_boundaries WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [input.tenant_id, input.boundary_id],
    );
    return result.rows[0] ?? null;
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
      window.*,
      COALESCE(class_section.name, window.class_section_id::text) AS class_name,
      COALESCE(subject.name, window.subject_id::text) AS subject_name,
      COALESCE(window.last_action, window.status) AS workflow_status,
      COALESCE(student_counts.expected_count, 0)::integer AS expected_count,
      COALESCE(mark_counts.saved_count, 0)::integer AS saved_count,
      COALESCE(mark_counts.submitted_count, 0)::integer AS submitted_count,
      GREATEST(COALESCE(student_counts.expected_count, 0) - COALESCE(mark_counts.saved_count, 0), 0)::integer AS missing_count,
      COALESCE(teacher_assignments.teacher_user_ids, ARRAY[]::text[]) AS teacher_user_ids
      FROM exam_mark_entry_windows window
      LEFT JOIN class_sections class_section
        ON class_section.tenant_id = window.tenant_id AND class_section.id = window.class_section_id::text
      LEFT JOIN subjects subject
        ON subject.tenant_id = window.tenant_id AND subject.id = window.subject_id::text
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS expected_count FROM students student
        WHERE student.tenant_id = window.tenant_id
          AND student.status = 'active'
          AND EXISTS (
            SELECT 1 FROM student_class_assignments class_assignment
            WHERE class_assignment.tenant_id = student.tenant_id
              AND class_assignment.student_id = student.id::text
              AND class_assignment.class_section_id = window.class_section_id::text
              AND class_assignment.status = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM student_subject_enrollments subject_enrollment
            WHERE subject_enrollment.tenant_id = student.tenant_id
              AND subject_enrollment.student_id = student.id::text
              AND subject_enrollment.class_section_id = window.class_section_id::text
              AND subject_enrollment.subject_id = window.subject_id::text
              AND subject_enrollment.status = 'active'
          )
      ) student_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT mark.student_id)::integer AS saved_count,
          COUNT(DISTINCT mark.student_id) FILTER (WHERE mark.status IN ('submitted', 'reviewed', 'locked', 'published'))::integer AS submitted_count
        FROM exam_marks mark
        WHERE mark.tenant_id = window.tenant_id
          AND mark.exam_series_id = window.exam_series_id
          AND mark.class_section_id = window.class_section_id
          AND mark.subject_id = window.subject_id
      ) mark_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT array_agg(DISTINCT assignment.teacher_user_id::text) AS teacher_user_ids
        FROM exam_series series
        JOIN teacher_subject_assignments assignment
          ON assignment.tenant_id = series.tenant_id
         AND assignment.academic_term_id = series.academic_term_id::text
         AND assignment.class_section_id = window.class_section_id::text
         AND assignment.subject_id = window.subject_id::text
         AND assignment.status = 'active'
        WHERE series.tenant_id = window.tenant_id AND series.id = window.exam_series_id
      ) teacher_assignments ON TRUE
      WHERE window.tenant_id = $1`;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters.exam_series_id) {
      query += ` AND window.exam_series_id = $${paramCount}::uuid`;
      params.push(filters.exam_series_id);
      paramCount++;
    }
    
    query += ` ORDER BY window.opens_at ASC`;
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
        window.id::text AS mark_entry_window_id,
        window.exam_series_id::text,
        series.name AS exam_series_name,
        series.academic_term_id::text,
        assessment.id::text AS assessment_id,
        assessment.name AS assessment_name,
        assessment.max_score::float AS max_score,
        assessment.weight::float AS assessment_weight,
        window.class_section_id::text,
        COALESCE(class_section.name, window.class_section_id::text) AS class_name,
        window.subject_id::text,
        COALESCE(subject.name, window.subject_id::text) AS subject_name,
        student.id::text AS student_id,
        student.admission_number,
        NULLIF(BTRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '') AS student_name,
        mark.score::float AS score,
        mark.remarks,
        COALESCE(mark.status, 'draft') AS status,
        mark.entered_by_user_id::text,
        mark.updated_at::text,
        window.opens_at::text,
        window.closes_at::text
      FROM exam_mark_entry_windows window
      JOIN exam_series series
        ON series.tenant_id = window.tenant_id
       AND series.id = window.exam_series_id
      JOIN exam_assessments assessment
        ON assessment.tenant_id = window.tenant_id
       AND assessment.exam_series_id = window.exam_series_id
       AND assessment.subject_id = window.subject_id
      JOIN students student
        ON student.tenant_id = window.tenant_id
       AND student.status = 'active'
       AND EXISTS (
         SELECT 1 FROM student_class_assignments class_assignment
         WHERE class_assignment.tenant_id = student.tenant_id
           AND class_assignment.student_id = student.id::text
           AND class_assignment.class_section_id = window.class_section_id::text
           AND class_assignment.status = 'active'
       )
       AND EXISTS (
         SELECT 1 FROM student_subject_enrollments subject_enrollment
         WHERE subject_enrollment.tenant_id = student.tenant_id
           AND subject_enrollment.student_id = student.id::text
           AND subject_enrollment.class_section_id = window.class_section_id::text
           AND subject_enrollment.subject_id = window.subject_id::text
           AND subject_enrollment.status = 'active'
       )
      LEFT JOIN class_sections class_section
        ON class_section.tenant_id = window.tenant_id
       AND class_section.id = window.class_section_id::text
      LEFT JOIN subjects subject
        ON subject.tenant_id = window.tenant_id
       AND subject.id = window.subject_id::text
      LEFT JOIN exam_marks mark
        ON mark.tenant_id = window.tenant_id
       AND mark.exam_series_id = window.exam_series_id
       AND mark.assessment_id = assessment.id
       AND mark.class_section_id = window.class_section_id
       AND mark.subject_id = window.subject_id
       AND mark.student_id = student.id
      WHERE window.tenant_id = $1
        AND ($2::uuid IS NULL OR window.exam_series_id = $2::uuid)
        AND ($3::uuid IS NULL OR student.id = $3::uuid)
        AND (
          $4::uuid IS NULL
          OR EXISTS (
            SELECT 1
            FROM teacher_subject_assignments assignment
            WHERE assignment.tenant_id = window.tenant_id
              AND assignment.academic_term_id = series.academic_term_id::text
              AND assignment.class_section_id = window.class_section_id::text
              AND assignment.subject_id = window.subject_id::text
              AND assignment.teacher_user_id = $4::text
              AND assignment.status = 'active'
          )
        )
        AND ($5::uuid IS NULL OR window.class_section_id = $5::uuid)
        AND ($8::uuid IS NULL OR window.subject_id = $8::uuid)
        AND ($9::uuid IS NULL OR assessment.id = $9::uuid)
        AND window.status = 'open'
        AND window.opens_at <= NOW()
        AND window.closes_at >= NOW()
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

  async getAnalytics(tenantId: string) {
    // 1. KPIs
    let kpis = {
      school_average: 0,
      pending_reviews: 0,
      missing_marks_alerts: 0,
      active_exams: 0,
    };
    try {
      const result = await this.executeSql(
        `
        SELECT
          -- School Average
          (
            SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric 
            FROM exam_marks 
            WHERE tenant_id = $1
          ) AS school_average,
          -- Pending Reviews (Marks submitted but not reviewed/locked)
          (
            SELECT COUNT(*)::int 
            FROM exam_marks 
            WHERE tenant_id = $1 AND status = 'submitted'
          ) AS pending_reviews,
          -- Missing Marks Alerts
          -- Expected mark entries derived from open mark entry windows and active students
          (
            SELECT COUNT(*)::int
            FROM (
              SELECT s.id AS student_id, ew.exam_series_id, ea.id AS assessment_id
              FROM students s
              JOIN student_class_assignments class_assignment
                ON class_assignment.tenant_id = s.tenant_id
               AND class_assignment.student_id = s.id
               AND class_assignment.status = 'active'
              JOIN exam_mark_entry_windows ew ON ew.tenant_id = s.tenant_id
                AND class_assignment.class_section_id = ew.class_section_id
              JOIN student_subject_enrollments subject_enrollment
                ON subject_enrollment.tenant_id = s.tenant_id
               AND subject_enrollment.student_id = s.id::text
               AND subject_enrollment.class_section_id = ew.class_section_id::text
               AND subject_enrollment.subject_id = ew.subject_id::text
               AND subject_enrollment.status = 'active'
              JOIN exam_assessments ea ON ea.tenant_id = ew.tenant_id 
                AND ea.exam_series_id = ew.exam_series_id 
                AND ea.subject_id = ew.subject_id
              WHERE s.tenant_id = $1 
                AND s.status = 'active'
                AND ew.status = 'open'
            ) expected
            LEFT JOIN exam_marks m ON m.tenant_id = $1
              AND m.exam_series_id = expected.exam_series_id
              AND m.assessment_id = expected.assessment_id
              AND m.student_id = expected.student_id
            WHERE m.score IS NULL
          ) AS missing_marks_alerts,
          -- Active Exams (Exams currently in progress and not locked/published)
          (
            SELECT COUNT(*)::int 
            FROM exam_series 
            WHERE tenant_id = $1 
              AND status NOT IN ('locked', 'published')
          ) AS active_exams;
        `,
        [tenantId],
      );
      if (result.rows && result.rows[0]) {
        const row = result.rows[0];
        kpis = {
          school_average: Number(row.school_average ?? 0),
          pending_reviews: Number(row.pending_reviews ?? 0),
          missing_marks_alerts: Number(row.missing_marks_alerts ?? 0),
          active_exams: Number(row.active_exams ?? 0),
        };
      }
    } catch (error) {
      // Safe default is already set
    }

    // 2. Trends
    let trends: any[] = [];
    try {
      const result = await this.executeSql(
        `
        SELECT 
          es.id AS exam_series_id,
          es.name AS exam_series_name,
          es.starts_on AS starts_on,
          COALESCE(ROUND(AVG(em.score), 2), 0)::numeric AS average_score
        FROM exam_series es
        LEFT JOIN exam_marks em ON em.tenant_id = es.tenant_id AND em.exam_series_id = es.id
        WHERE es.tenant_id = $1
        GROUP BY es.id, es.name, es.starts_on
        ORDER BY es.starts_on ASC;
        `,
        [tenantId],
      );
      trends = (result.rows || []).map((row: any) => ({
        exam_series_id: row.exam_series_id,
        exam_series_name: row.exam_series_name,
        starts_on: row.starts_on,
        average_score: Number(row.average_score ?? 0),
      }));
    } catch (error) {
      // Safe default is already set
    }

    // 3. Subject Performance
    let subjectPerformance: any[] = [];
    try {
      const result = await this.executeSql(
        `
        SELECT 
          sub.id AS subject_id,
          sub.name AS subject_name,
          COALESCE(ROUND(AVG(em.score), 2), 0)::numeric AS mean_score,
          COALESCE(ROUND(100.0 * COUNT(CASE WHEN em.score >= ea.max_score * 0.5 THEN 1 END) / NULLIF(COUNT(em.id), 0), 2), 0)::numeric AS pass_rate,
          -- CBC Competency Distributions
          COUNT(CASE WHEN gb.label = 'EE' OR gb.label ILIKE '%exceed%' THEN 1 END)::int AS ee_count,
          COUNT(CASE WHEN gb.label = 'ME' OR gb.label ILIKE '%meet%' THEN 1 END)::int AS me_count,
          COUNT(CASE WHEN gb.label = 'AE' OR gb.label ILIKE '%approach%' THEN 1 END)::int AS ae_count,
          COUNT(CASE WHEN gb.label = 'BE' OR gb.label ILIKE '%below%' THEN 1 END)::int AS be_count
        FROM subjects sub
        JOIN exam_assessments ea ON ea.tenant_id = sub.tenant_id AND ea.subject_id = sub.id
        JOIN exam_marks em ON em.tenant_id = ea.tenant_id AND em.assessment_id = ea.id
        LEFT JOIN exam_grade_boundaries gb ON gb.tenant_id = em.tenant_id
          AND gb.exam_series_id = em.exam_series_id
          AND em.score BETWEEN gb.min_score AND gb.max_score
        WHERE sub.tenant_id = $1
        GROUP BY sub.id, sub.name
        ORDER BY sub.name ASC;
        `,
        [tenantId],
      );
      subjectPerformance = (result.rows || []).map((row: any) => ({
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        mean_score: Number(row.mean_score ?? 0),
        pass_rate: Number(row.pass_rate ?? 0),
        ee_count: Number(row.ee_count ?? 0),
        me_count: Number(row.me_count ?? 0),
        ae_count: Number(row.ae_count ?? 0),
        be_count: Number(row.be_count ?? 0),
      }));
    } catch (error) {
      // Safe default is already set
    }

    // 4. Student Progress
    let topPerformers: any[] = [];
    try {
      const result = await this.executeSql(
        `
        SELECT 
          s.id AS student_id,
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
          s.admission_number,
          ROUND(AVG((em.score / ea.max_score) * 100.0), 2) AS average_percentage,
          COUNT(em.id) AS assessments_taken
        FROM students s
        JOIN exam_marks em ON em.tenant_id = s.tenant_id AND em.student_id = s.id
        JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        GROUP BY s.id, s.first_name, s.middle_name, s.last_name, s.admission_number
        ORDER BY average_percentage DESC
        LIMIT 10;
        `,
        [tenantId],
      );
      topPerformers = (result.rows || []).map((row: any) => ({
        student_id: row.student_id,
        student_name: row.student_name,
        admission_number: row.admission_number,
        average_percentage: Number(row.average_percentage ?? 0),
        assessments_taken: Number(row.assessments_taken ?? 0),
      }));
    } catch (error) {
      // Safe default is already set
    }

    let topImprovers: any[] = [];
    try {
      const result = await this.executeSql(
        `
        WITH student_series_averages AS (
          SELECT 
            em.student_id,
            em.exam_series_id,
            es.name AS exam_series_name,
            es.starts_on AS exam_series_date,
            AVG((em.score / ea.max_score) * 100.0) AS avg_percentage
          FROM exam_marks em
          JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
          JOIN exam_series es ON es.tenant_id = em.tenant_id AND es.id = em.exam_series_id
          WHERE em.tenant_id = $1
          GROUP BY em.student_id, em.exam_series_id, es.name, es.starts_on
        ),
        ranked_student_averages AS (
          SELECT 
            student_id,
            exam_series_id,
            exam_series_name,
            exam_series_date,
            avg_percentage,
            ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY exam_series_date DESC) AS rn
          FROM student_series_averages
        )
        SELECT 
          s.id AS student_id,
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
          s.admission_number,
          latest.exam_series_name AS latest_exam_series,
          ROUND(latest.avg_percentage::numeric, 2) AS latest_average,
          prev.exam_series_name AS previous_exam_series,
          ROUND(prev.avg_percentage::numeric, 2) AS previous_average,
          ROUND((latest.avg_percentage - prev.avg_percentage)::numeric, 2) AS improvement
        FROM ranked_student_averages latest
        JOIN ranked_student_averages prev ON prev.student_id = latest.student_id AND prev.rn = latest.rn + 1
        JOIN students s ON s.tenant_id = $1 AND s.id = latest.student_id
        WHERE latest.rn = 1 AND s.status = 'active'
        ORDER BY improvement DESC
        LIMIT 10;
        `,
        [tenantId],
      );
      topImprovers = (result.rows || []).map((row: any) => ({
        student_id: row.student_id,
        student_name: row.student_name,
        admission_number: row.admission_number,
        latest_exam_series: row.latest_exam_series,
        latest_average: Number(row.latest_average ?? 0),
        previous_exam_series: row.previous_exam_series,
        previous_average: Number(row.previous_average ?? 0),
        improvement: Number(row.improvement ?? 0),
      }));
    } catch (error) {
      // Safe default is already set
    }

    let atRiskStudents: any[] = [];
    try {
      const result = await this.executeSql(
        `
        SELECT 
          s.id AS student_id,
          concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
          s.admission_number,
          ROUND(AVG((em.score / ea.max_score) * 100.0), 2) AS average_percentage,
          COUNT(em.id) AS assessments_taken
        FROM students s
        JOIN exam_marks em ON em.tenant_id = s.tenant_id AND em.student_id = s.id
        JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        GROUP BY s.id, s.first_name, s.middle_name, s.last_name, s.admission_number
        HAVING AVG((em.score / ea.max_score) * 100.0) < 50.0
        ORDER BY average_percentage ASC
        LIMIT 10;
        `,
        [tenantId],
      );
      atRiskStudents = (result.rows || []).map((row: any) => ({
        student_id: row.student_id,
        student_name: row.student_name,
        admission_number: row.admission_number,
        average_percentage: Number(row.average_percentage ?? 0),
        assessments_taken: Number(row.assessments_taken ?? 0),
      }));
    } catch (error) {
      // Safe default is already set
    }

    return {
      kpis,
      trends,
      subjectPerformance,
      studentProgress: {
        topPerformers,
        topImprovers,
        atRiskStudents,
      },
    };
  }

}
