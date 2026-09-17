import { BadRequestException, ConflictException } from '@nestjs/common';

export interface CohortTx {
  $queryRawUnsafe(sql: string, ...values: any[]): Promise<any>;
  $executeRawUnsafe?(sql: string, ...values: any[]): Promise<any>;
}

export interface CohortContext {
  id: string;
  tenant_id: string;
  cohort_id: string;
  academic_year_id: string;
  class_section_id: string;
  stream_id: string | null;
  status: string;
  version: number;
}

export interface CohortConfigurationSnapshot {
  subjects: Record<string, any>[];
  teachers: Record<string, any>[];
}

export async function lockCohortSchool(tx: CohortTx, tenantId: string): Promise<void> {
  await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))::text',
    `cohort-teaching:${tenantId}`);
}

export async function ensureCohortContexts(
  tx: CohortTx, tenantId: string, classId: string, streamId?: string | null,
): Promise<CohortContext[]> {
  await lockCohortSchool(tx, tenantId);
  const sections = await tx.$queryRawUnsafe(`SELECT id::text, academic_year_id::text
    FROM class_sections WHERE tenant_id = $1 AND id::text = $2
      AND is_active = TRUE AND archived_at IS NULL AND status = 'active' FOR SHARE`, tenantId, classId);
  if (!sections.length) throw new BadRequestException('Select an active class from this school.');
  const streams = await tx.$queryRawUnsafe(`SELECT id::text FROM class_streams
    WHERE tenant_id = $1 AND class_section_id::text = $2 AND is_active = TRUE
      AND archived_at IS NULL AND status = 'active' AND ($3::text IS NULL OR id::text = $3)
    ORDER BY id FOR SHARE`, tenantId, classId, streamId ?? null);
  if (streamId && !streams.length) throw new BadRequestException('Select an active stream in this class.');
  const contexts: CohortContext[] = [];
  for (const stream of streams.length ? streams : [{ id: null }]) {
    const existing = await tx.$queryRawUnsafe(`SELECT * FROM academic_cohort_placements
      WHERE tenant_id = $1 AND class_section_id = $2 AND stream_id IS NOT DISTINCT FROM $3::text
        AND status = 'active' FOR UPDATE`, tenantId, classId, stream.id);
    if (existing[0]) { contexts.push(existing[0]); continue; }
    const cohorts = await tx.$queryRawUnsafe(`INSERT INTO academic_cohorts (tenant_id)
      VALUES ($1) RETURNING id`, tenantId);
    const created = await tx.$queryRawUnsafe(`INSERT INTO academic_cohort_placements
      (tenant_id, cohort_id, academic_year_id, class_section_id, stream_id)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`, tenantId, cohorts[0].id,
    sections[0].academic_year_id, classId, stream.id);
    contexts.push(created[0]);
  }
  return contexts;
}

export async function captureCohortConfiguration(
  tx: CohortTx, tenantId: string, placementId: string,
): Promise<CohortConfigurationSnapshot> {
  await lockCohortSchool(tx, tenantId);
  const placements = await tx.$queryRawUnsafe(`SELECT id FROM academic_cohort_placements
    WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, tenantId, placementId);
  if (!placements.length) throw new BadRequestException('Cohort placement was not found in this school.');
  const subjects = await tx.$queryRawUnsafe(`SELECT DISTINCT ON (subject_id) *,
      effective_from::text AS effective_from,effective_to::text AS effective_to,
      CURRENT_DATE::text AS migration_today FROM class_subject_assignments
    WHERE tenant_id = $1 AND cohort_placement_id = $2
    ORDER BY subject_id, updated_at DESC, version DESC, id::text DESC`, tenantId, placementId);
  const teachers = await tx.$queryRawUnsafe(`SELECT *,effective_from::text AS effective_from,effective_to::text AS effective_to FROM teacher_subject_assignments
    WHERE tenant_id = $1 AND cohort_placement_id = $2 AND status = 'active'
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE) FOR UPDATE`, tenantId, placementId);
  return { subjects, teachers };
}

/** An annual snapshot retains original row IDs and class pointers for historical consumers. */
export async function snapshotCohortConfiguration(
  tx: CohortTx, tenantId: string, sourcePlacementId: string, target: CohortContext,
  actorUserId: string | null, captured?: CohortConfigurationSnapshot,
): Promise<CohortConfigurationSnapshot> {
  await lockCohortSchool(tx, tenantId);
  const targets = await tx.$queryRawUnsafe(`SELECT * FROM academic_cohort_placements
    WHERE tenant_id = $1 AND id = $2 AND cohort_id = $3 AND status = 'active' FOR UPDATE`,
  tenantId, target.id, target.cohort_id);
  if (!targets.length || target.tenant_id !== tenantId) throw new BadRequestException('Destination cohort is unavailable.');
  const snapshot = captured ?? await captureCohortConfiguration(tx, tenantId, sourcePlacementId);
  const sourceRows = [...snapshot.subjects, ...snapshot.teachers];
  if (sourceRows.some((row) => row.tenant_id !== tenantId || row.cohort_placement_id !== sourcePlacementId)) {
    throw new BadRequestException('Configuration snapshot does not belong to the source cohort.');
  }
  const result: CohortConfigurationSnapshot = { subjects: [], teachers: [] };
  for (const source of snapshot.subjects) {
    result.subjects.push(await cloneSubject(tx, tenantId, source, targets[0], actorUserId));
  }
  const activeSubjectIds = new Set(snapshot.subjects.filter((row) => row.status === 'active'
    && (!day(row.effective_to) || day(row.effective_to)! >= String(row.migration_today ?? '')))
    .map((row) => String(row.subject_id)));
  for (const source of snapshot.teachers) {
    // Legacy teachers without a subject offering are preserved; an explicitly removed offering is not.
    if (!activeSubjectIds.has(String(source.subject_id))
      && snapshot.subjects.some((row) => String(row.subject_id) === String(source.subject_id))) continue;
    result.teachers.push(await cloneTeacher(tx, tenantId, source, targets[0], actorUserId));
  }
  return result;
}

export async function retireCohortPlacement(
  tx: CohortTx, tenantId: string, placementId: string, actorUserId: string | null,
): Promise<void> {
  await lockCohortSchool(tx, tenantId);
  await tx.$queryRawUnsafe(`UPDATE class_subject_assignments SET status = 'archived', archived_at = NOW(),
    archived_by_user_id = $3::uuid, updated_at = NOW(), version = version + 1
    WHERE tenant_id = $1 AND cohort_placement_id = $2 AND status = 'active' RETURNING id`,
  tenantId, placementId, actorUserId);
  await tx.$queryRawUnsafe(`UPDATE teacher_subject_assignments SET status = 'ended',
    ended_by_user_id = $3::uuid, updated_at = NOW(), version = version + 1
    WHERE tenant_id = $1 AND cohort_placement_id = $2 AND status = 'active' RETURNING id`,
  tenantId, placementId, actorUserId);
  await tx.$queryRawUnsafe(`UPDATE academic_cohort_placements SET status = 'completed',
    updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND id = $2 AND status = 'active' RETURNING id`,
  tenantId, placementId);
}

export async function ensureCohortMigration(tx: CohortTx, tenantId: string): Promise<void> {
  await lockCohortSchool(tx, tenantId);
  const complete = await tx.$queryRawUnsafe('SELECT version FROM academic_cohort_migrations WHERE tenant_id = $1', tenantId);
  if (complete.length) return;
  const [tables] = await tx.$queryRawUnsafe("SELECT to_regclass('public.student_academic_enrollments')::text AS annual");
  const classes = await tx.$queryRawUnsafe(`SELECT DISTINCT section.id::text
    FROM class_sections section WHERE section.tenant_id = $1 AND section.status = 'active'
      AND section.is_active = TRUE AND section.archived_at IS NULL AND (
        EXISTS (SELECT 1 FROM class_subject_assignments a WHERE a.tenant_id = $1 AND a.class_section_id::text = section.id::text)
        OR EXISTS (SELECT 1 FROM teacher_subject_assignments a WHERE a.tenant_id = $1 AND a.class_section_id::text = section.id::text)
        OR EXISTS (SELECT 1 FROM student_class_assignments a WHERE a.tenant_id = $1 AND a.class_section_id::text = section.id::text AND a.status = 'active')
        ${tables?.annual ? "OR EXISTS (SELECT 1 FROM student_academic_enrollments a WHERE a.tenant_id = $1 AND a.class_section_id::text = section.id::text AND a.status = 'active')" : ''})
    ORDER BY section.id::text`, tenantId);
  let migrated = 0;
  for (const section of classes) {
    const contexts = await ensureCohortContexts(tx, tenantId, section.id);
    for (const context of contexts) {
      const subjects = await legacyRows(tx, 'class_subject_assignments', tenantId, context);
      const teachers = await legacyRows(tx, 'teacher_subject_assignments', tenantId, context);
      for (const candidates of groupedSubjects(subjects)) {
        const authoritative = authoritativeRows(candidates);
        const signatures = new Set(authoritative.map(subjectSignature));
        if (signatures.size > 1) {
          await recordIssue(tx, context, 'class_subject_assignment', authoritative, 'conflicting_subject_configuration');
          continue;
        }
        if (authoritative[0]) { await cloneSubject(tx, tenantId, authoritative[0], context, null); migrated++; }
      }
      for (const candidates of groupedSubjects(teachers)) {
        const authoritative = authoritativeRows(candidates).filter(validActive);
        const distinct = [...new Map(authoritative.map((row) => [teacherSignature(row), row])).values()];
        if (distinct.some((a, index) => distinct.slice(index + 1).some((b) =>
          ((a.is_primary !== false && b.is_primary !== false) || a.teacher_user_id === b.teacher_user_id)
          && dateOverlap(a, b)))) {
          await recordIssue(tx, context, 'teacher_assignment', distinct, 'overlapping_primary_teachers');
          continue;
        }
        for (const source of distinct) {
          const removed = await tx.$queryRawUnsafe(`SELECT 1 FROM class_subject_assignments
            WHERE tenant_id = $1 AND cohort_placement_id = $2 AND subject_id::text = $3
              AND (status <> 'active' OR effective_to < CURRENT_DATE) LIMIT 1`,
          tenantId, context.id, String(source.subject_id));
          if (removed.length) continue;
          const staff = await tx.$queryRawUnsafe(`SELECT 1 FROM tenant_memberships
            WHERE tenant_id = $1 AND user_id::text = $2 AND status = 'active' LIMIT 1`,
          tenantId, String(source.teacher_user_id));
          if (!staff.length) {
            await recordIssue(tx, context, 'teacher_assignment', [source], 'unavailable_teacher');
            continue;
          }
          await cloneTeacher(tx, tenantId, source, context, null); migrated++;
        }
      }
      await attachMemberships(tx, context, Boolean(tables?.annual));
    }
    // Retain every legacy record and its original term, dates and foreign key targets.
    for (const [table,kind] of [['class_subject_assignments','class_subject_assignment'],['teacher_subject_assignments','teacher_assignment']]) {
      await tx.$queryRawUnsafe(`INSERT INTO academic_cohort_migration_issues
        (tenant_id,entity_type,class_section_id,stream_id,subject_id,source_assignment_ids,reason,details)
        SELECT $1,$3,$2,assignment.stream_id::text,assignment.subject_id::text,
          jsonb_agg(assignment.id::text),'unavailable_legacy_stream','{"resolution":"Choose the intended current stream and configuration."}'::jsonb
        FROM ${table} assignment WHERE assignment.tenant_id=$1 AND assignment.class_section_id::text=$2
          AND assignment.cohort_placement_id IS NULL AND assignment.status='active' AND assignment.stream_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM class_streams stream WHERE stream.tenant_id=$1
            AND stream.class_section_id::text=$2 AND stream.id::text=assignment.stream_id::text
            AND stream.is_active=TRUE AND stream.status='active' AND stream.archived_at IS NULL)
        GROUP BY assignment.stream_id,assignment.subject_id ON CONFLICT DO NOTHING RETURNING id`,tenantId,section.id,kind);
    }
    await tx.$queryRawUnsafe(`UPDATE class_subject_assignments SET status = 'archived',
      archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
      WHERE tenant_id = $1 AND class_section_id::text = $2 AND cohort_placement_id IS NULL
        AND status = 'active' RETURNING id`, tenantId, section.id);
    await tx.$queryRawUnsafe(`UPDATE teacher_subject_assignments SET status = 'ended', updated_at = NOW()
      WHERE tenant_id = $1 AND class_section_id::text = $2 AND cohort_placement_id IS NULL
        AND status = 'active' RETURNING id`, tenantId, section.id);
  }
  // A retired class cannot keep granting live teaching access through a legacy row.
  await tx.$queryRawUnsafe(`UPDATE teacher_subject_assignments assignment SET status='ended',updated_at=NOW()
    WHERE assignment.tenant_id=$1 AND assignment.cohort_placement_id IS NULL AND assignment.status='active'
      AND NOT EXISTS (SELECT 1 FROM class_sections section WHERE section.tenant_id=$1
        AND section.id::text=assignment.class_section_id::text AND section.status='active'
        AND section.is_active=TRUE AND section.archived_at IS NULL) RETURNING assignment.id`,tenantId);
  await tx.$queryRawUnsafe(`INSERT INTO academic_cohort_migrations (tenant_id, summary)
    VALUES ($1, $2::jsonb) ON CONFLICT (tenant_id) DO NOTHING RETURNING tenant_id`,
  tenantId, JSON.stringify({ contexts_in_classes: classes.length, migrated_assignments: migrated }));
}

async function attachMemberships(tx: CohortTx, context: CohortContext, annual: boolean): Promise<void> {
  await tx.$queryRawUnsafe(`UPDATE student_class_assignments SET cohort_id = $4, cohort_placement_id = $5
    WHERE tenant_id = $1 AND class_section_id::text = $2 AND stream_id IS NOT DISTINCT FROM $3::text
      AND status = 'active' AND cohort_id IS NULL RETURNING id`, context.tenant_id, context.class_section_id,
  context.stream_id, context.cohort_id, context.id);
  if (!annual) return;
  await tx.$queryRawUnsafe(`UPDATE student_academic_enrollments enrollment
    SET cohort_id = $4, cohort_placement_id = $5, stream_id = $3
    WHERE enrollment.tenant_id = $1 AND enrollment.class_section_id::text = $2
      AND enrollment.status = 'active' AND enrollment.cohort_id IS NULL
      AND (($3::text IS NULL AND NOT EXISTS (SELECT 1 FROM class_streams s WHERE s.tenant_id = $1
        AND s.class_section_id::text = $2 AND s.status = 'active' AND s.is_active = TRUE))
      OR EXISTS (SELECT 1 FROM class_streams s WHERE s.tenant_id = $1 AND s.id::text = $3
        AND s.class_section_id::text = $2 AND lower(btrim(s.name)) = lower(btrim(enrollment.stream_name))))
    RETURNING enrollment.id`, context.tenant_id, context.class_section_id, context.stream_id, context.cohort_id, context.id);
}

async function legacyRows(tx: CohortTx, table: 'class_subject_assignments' | 'teacher_subject_assignments',
  tenantId: string, context: CohortContext): Promise<Record<string, any>[]> {
  return tx.$queryRawUnsafe(`SELECT assignment.*,assignment.effective_from::text AS effective_from,
    assignment.effective_to::text AS effective_to,term.starts_on::text AS migration_term_start,
    term.is_current AS migration_current_term, CURRENT_DATE::text AS migration_today
    FROM ${table} assignment LEFT JOIN academic_terms term ON term.tenant_id = assignment.tenant_id
      AND term.id::text = assignment.academic_term_id::text
    WHERE assignment.tenant_id = $1 AND assignment.class_section_id::text = $2
      AND assignment.cohort_placement_id IS NULL
      AND (assignment.stream_id IS NULL OR assignment.stream_id::text = $3)
    ORDER BY assignment.updated_at DESC NULLS LAST, assignment.id::text`, tenantId, context.class_section_id, context.stream_id);
}

function groupedSubjects(rows: Record<string, any>[]): Record<string, any>[][] {
  const groups = new Map<string, Record<string, any>[]>();
  for (const row of rows) {
    const key = String(row.subject_id);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()];
}

function authoritativeRows(rows: Record<string, any>[]): Record<string, any>[] {
  const explicitStream = rows.some((row) => row.stream_id != null);
  const scoped = explicitStream ? rows.filter((row) => row.stream_id != null) : rows;
  const rank = (row: Record<string, any>) => row.academic_term_id == null ? '3'
    : row.migration_current_term ? '2' : `1:${row.migration_term_start ?? ''}`;
  const highest = scoped.map(rank).sort().at(-1);
  return scoped.filter((row) => rank(row) === highest);
}

function day(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function validActive(row: Record<string, any>): boolean {
  return row.status === 'active' && (day(row.effective_to) == null || day(row.effective_to)! >= row.migration_today);
}
function subjectSignature(row: Record<string, any>): string {
  return JSON.stringify([row.status, row.is_compulsory, row.is_examinable, day(row.effective_from), day(row.effective_to),row.lessons_per_week ?? 5,row.metadata ?? {}]);
}
function teacherSignature(row: Record<string, any>): string {
  return JSON.stringify([row.teacher_user_id, row.assignment_type, row.is_primary, row.mark_entry_allowed,
    row.lesson_record_allowed, row.report_comment_allowed, day(row.effective_from), day(row.effective_to)]);
}
function dateOverlap(a: Record<string, any>, b: Record<string, any>): boolean {
  return (day(a.effective_from) ?? '') <= (day(b.effective_to) ?? '9999-12-31')
    && (day(b.effective_from) ?? '') <= (day(a.effective_to) ?? '9999-12-31');
}

async function recordIssue(tx: CohortTx, context: CohortContext, entityType: string,
  sources: Record<string, any>[], reason: string): Promise<void> {
  await tx.$queryRawUnsafe(`INSERT INTO academic_cohort_migration_issues (tenant_id, entity_type,
    class_section_id, stream_id, subject_id, cohort_placement_id, source_assignment_ids, reason, details)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb) ON CONFLICT DO NOTHING RETURNING id`,
  context.tenant_id, entityType, context.class_section_id, context.stream_id, String(sources[0].subject_id), context.id,
  JSON.stringify(sources.map((row) => String(row.id))), reason,
  JSON.stringify({ candidates: sources, resolution: 'Explicitly assign the intended current configuration.' }));
}

async function cloneSubject(tx: CohortTx, tenantId: string, source: Record<string, any>,
  target: CohortContext, actor: string | null): Promise<Record<string, any>> {
  const existing = await tx.$queryRawUnsafe(`SELECT * FROM class_subject_assignments
    WHERE tenant_id=$1 AND cohort_placement_id=$2 AND source_assignment_id=$3`, tenantId, target.id, String(source.id));
  if (existing[0]) return existing[0];
  const rows = await tx.$queryRawUnsafe(`INSERT INTO class_subject_assignments (
    tenant_id, academic_term_id, class_section_id, stream_id, subject_id, cohort_id, cohort_placement_id,
    source_assignment_id, is_compulsory, is_examinable, effective_from, effective_to, reason,
    created_by_user_id, updated_by_user_id, status, updated_at,lessons_per_week,metadata)
    VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11::date,$12,$13::uuid,$13::uuid,$14,NOW(),$15,$16::jsonb) RETURNING *`,
  tenantId, target.class_section_id, target.stream_id, String(source.subject_id), target.cohort_id, target.id,
  String(source.id), source.is_compulsory ?? true, source.is_examinable ?? true,
  day(source.effective_from), day(source.effective_to), source.reason ?? 'Continuing cohort subject', actor,
  source.status === 'active' && (!day(source.effective_to)
    || day(source.effective_to)! >= String(source.migration_today ?? '')) ? 'active' : 'archived',
  source.lessons_per_week ?? 5,JSON.stringify(source.metadata ?? {}));
  if (!rows[0]) throw new ConflictException('Cohort subject snapshot could not be saved.');
  return rows[0];
}

async function cloneTeacher(tx: CohortTx, tenantId: string, source: Record<string, any>,
  target: CohortContext, actor: string | null): Promise<Record<string, any>> {
  const existing = await tx.$queryRawUnsafe(`SELECT * FROM teacher_subject_assignments
    WHERE tenant_id=$1 AND cohort_placement_id=$2 AND source_assignment_id=$3`, tenantId, target.id, String(source.id));
  if (existing[0]) return existing[0];
  const rows = await tx.$queryRawUnsafe(`INSERT INTO teacher_subject_assignments (
    tenant_id, academic_term_id, class_section_id, stream_id, subject_id, teacher_user_id, cohort_id,
    cohort_placement_id, source_assignment_id, continued_from_assignment_id, assignment_type, is_primary,
    mark_entry_allowed, lesson_record_allowed, report_comment_allowed, effective_from, effective_to,
    department_id, curriculum_model, reason, created_by_user_id, status, updated_at)
    VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,COALESCE($14::date,CURRENT_DATE),$15::date,
      $16::uuid,$17,$18,$19::uuid,'active',NOW()) RETURNING *`, tenantId, target.class_section_id,
  target.stream_id, String(source.subject_id), String(source.teacher_user_id), target.cohort_id, target.id,
  String(source.id), source.assignment_type ?? 'primary', source.is_primary !== false,
  source.mark_entry_allowed !== false, source.lesson_record_allowed !== false, source.report_comment_allowed !== false,
  day(source.effective_from), day(source.effective_to), source.department_id ?? null,
  source.curriculum_model ?? null, source.reason ?? 'Continuing cohort teacher', actor);
  if (!rows[0]) throw new ConflictException('Cohort teacher snapshot could not be saved.');
  return rows[0];
}
