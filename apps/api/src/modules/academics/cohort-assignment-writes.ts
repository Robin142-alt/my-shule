import { BadRequestException, ConflictException } from '@nestjs/common';
import { ensureCohortContexts, ensureCohortMigration, lockCohortSchool, type CohortTx } from './cohort-configuration';

export type ConfigurationRow = Record<string, any>;
export type ConfigurationChange = { assignment: ConfigurationRow; previous: ConfigurationRow | null; action: 'assigned' | 'updated' | 'restored' };
export type ConfigurationActor = { actor_user_id?: string | null; actor_role?: string | null; correlation_id?: string | null };

export async function writeCohortSubjects(tx: CohortTx, tenantId: string,
  input: ConfigurationActor & { class_section_id: string; stream_id?: string | null; subject_ids: string[];
    is_compulsory?: boolean; is_examinable?: boolean; lessons_per_week?: number; effective_from?: string | null; effective_to?: string | null; reason?: string | null },
): Promise<ConfigurationChange[]> {
  await lockCohortSchool(tx, tenantId);
  if (input.lessons_per_week != null && (!Number.isInteger(input.lessons_per_week) || input.lessons_per_week < 1 || input.lessons_per_week > 100)) {
    throw new BadRequestException('Lessons per week must be between 1 and 100.');
  }
  await ensureCohortMigration(tx, tenantId);
  const contexts = await ensureCohortContexts(tx, tenantId, input.class_section_id, input.stream_id);
  const subjects = await tx.$queryRawUnsafe(`SELECT id FROM subjects WHERE tenant_id=$1 AND id::text=ANY($2::text[])
    AND status='active' FOR SHARE`, tenantId, input.subject_ids);
  if (subjects.length !== new Set(input.subject_ids).size) throw new BadRequestException('Select active subjects from this school.');
  const changes: ConfigurationChange[] = [];
  for (const context of contexts) for (const subjectId of input.subject_ids) {
    const previous = (await tx.$queryRawUnsafe(`SELECT *,effective_from::text AS effective_from,effective_to::text AS effective_to FROM class_subject_assignments WHERE tenant_id=$1
      AND cohort_placement_id=$2 AND subject_id=$3 AND status='active' FOR UPDATE`, tenantId, context.id, subjectId))[0] ?? null;
    const assignment = (await tx.$queryRawUnsafe(`INSERT INTO class_subject_assignments
      (tenant_id,cohort_id,cohort_placement_id,class_section_id,stream_id,subject_id,academic_term_id,
        is_compulsory,is_examinable,effective_from,effective_to,reason,created_by_user_id,updated_by_user_id,lessons_per_week)
      VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9::date,$10::date,$11,$12::uuid,$12::uuid,$13)
      ON CONFLICT (tenant_id,cohort_placement_id,subject_id) WHERE cohort_placement_id IS NOT NULL AND status='active'
      DO UPDATE SET is_compulsory=EXCLUDED.is_compulsory,is_examinable=EXCLUDED.is_examinable,
        effective_from=EXCLUDED.effective_from,effective_to=EXCLUDED.effective_to,reason=EXCLUDED.reason,lessons_per_week=EXCLUDED.lessons_per_week,
        updated_by_user_id=EXCLUDED.updated_by_user_id,version=class_subject_assignments.version+1,updated_at=NOW()
      RETURNING *`, tenantId, context.cohort_id, context.id, context.class_section_id, context.stream_id,
    subjectId, input.is_compulsory ?? previous?.is_compulsory ?? true, input.is_examinable ?? previous?.is_examinable ?? true,
    input.effective_from ?? previous?.effective_from ?? null, input.effective_to ?? previous?.effective_to ?? null,
    input.reason ?? previous?.reason ?? null, input.actor_user_id ?? null,input.lessons_per_week ?? previous?.lessons_per_week ?? 5))[0];
    const change: ConfigurationChange = { assignment, previous, action: previous ? 'updated' : 'assigned' };
    changes.push(change);
    await resolveConfigurationIssue(tx, tenantId, context.id, subjectId, 'class_subject_assignment', input.actor_user_id ?? null);
    await auditConfiguration(tx, tenantId, 'class_subject_assignment', change, input);
  }
  return changes;
}

export async function writeCohortTeacher(tx: CohortTx, tenantId: string, input: ConfigurationRow,
  governance?: (change: { tx: CohortTx; assignment: ConfigurationRow; previous: ConfigurationRow[] }) => Promise<void>,
): Promise<ConfigurationRow | null> {
  await lockCohortSchool(tx, tenantId);
  await ensureCohortMigration(tx, tenantId);
  const contexts = await ensureCohortContexts(tx, tenantId, String(input.class_section_id), input.stream_id as string | undefined);
  const saved: ConfigurationRow[] = [];
  for (const context of contexts) {
    const removedSubject = await tx.$queryRawUnsafe(`SELECT id FROM class_subject_assignments WHERE tenant_id=$1
      AND cohort_placement_id=$2 AND subject_id=$3 AND status<>'active'
      AND NOT EXISTS (SELECT 1 FROM class_subject_assignments current_subject WHERE current_subject.tenant_id=$1
        AND current_subject.cohort_placement_id=$2 AND current_subject.subject_id=$3 AND current_subject.status='active')
      LIMIT 1`, tenantId, context.id, input.subject_id);
    if (removedSubject.length) throw new ConflictException('Restore the subject for this cohort before assigning its teacher.');
    const offering = await tx.$queryRawUnsafe(`SELECT id FROM class_subject_assignments WHERE tenant_id=$1
      AND cohort_placement_id=$2 AND subject_id=$3 AND status='active'`, tenantId,context.id,input.subject_id);
    if (!offering.length || input.lessons_per_week != null) await writeCohortSubjects(tx,tenantId,{class_section_id:context.class_section_id,
      stream_id:context.stream_id,subject_ids:[String(input.subject_id)],actor_user_id:input.created_by_user_id ?? null,
      lessons_per_week:input.lessons_per_week,reason:input.reason ?? 'Subject configured with its teacher'});
    const previous = await tx.$queryRawUnsafe(`SELECT *,effective_from::text AS effective_from,effective_to::text AS effective_to,($4::date>CURRENT_DATE AND effective_from<=CURRENT_DATE
      AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)) AS replacing_current_in_future
      FROM teacher_subject_assignments WHERE tenant_id=$1 AND cohort_placement_id=$2 AND subject_id=$3
      AND status='active' FOR UPDATE`, tenantId, context.id, input.subject_id, input.effective_from ?? null);
    if (previous.some((row: ConfigurationRow) => row.replacing_current_in_future && row.teacher_user_id === input.teacher_user_id)) {
      throw new BadRequestException('This teacher is already assigned. Use today for changes, or select a different teacher for a scheduled replacement.');
    }
    if (input.is_primary !== false) await tx.$queryRawUnsafe(`UPDATE teacher_subject_assignments
      SET status=CASE WHEN $5::date>CURRENT_DATE AND effective_from<$5::date THEN 'active' ELSE 'ended' END,
        effective_to=CASE WHEN $5::date>CURRENT_DATE THEN $5::date-1 ELSE COALESCE($5::date,CURRENT_DATE) END,
        ended_by_user_id=$6::uuid,version=version+1,updated_at=NOW()
      WHERE tenant_id=$1 AND cohort_placement_id=$2 AND subject_id=$3 AND teacher_user_id<>$4
        AND is_primary=TRUE AND status='active' RETURNING id`, tenantId, context.id, input.subject_id,
    input.teacher_user_id, input.effective_from ?? null, input.created_by_user_id ?? null);
    const assignment = (await tx.$queryRawUnsafe(`INSERT INTO teacher_subject_assignments
      (id,tenant_id,cohort_id,cohort_placement_id,academic_term_id,class_section_id,stream_id,subject_id,teacher_user_id,
        created_by_user_id,assignment_type,is_primary,mark_entry_allowed,lesson_record_allowed,report_comment_allowed,
        effective_from,effective_to,reason,status,department_id,curriculum_model)
      VALUES (COALESCE($19::text,gen_random_uuid()::text),$1,$2,$3,NULL,$4,$5,$6,$7,$8::uuid,$9,$10,$11,$12,$13,COALESCE($14::date,CURRENT_DATE),$15::date,$16,'active',$17::uuid,$18)
      ON CONFLICT (tenant_id,cohort_placement_id,subject_id,teacher_user_id) WHERE cohort_placement_id IS NOT NULL AND status='active'
      DO UPDATE SET assignment_type=EXCLUDED.assignment_type,is_primary=EXCLUDED.is_primary,
        mark_entry_allowed=EXCLUDED.mark_entry_allowed,lesson_record_allowed=EXCLUDED.lesson_record_allowed,
        report_comment_allowed=EXCLUDED.report_comment_allowed,effective_from=EXCLUDED.effective_from,
        effective_to=EXCLUDED.effective_to,reason=EXCLUDED.reason,department_id=EXCLUDED.department_id,
        curriculum_model=EXCLUDED.curriculum_model,version=teacher_subject_assignments.version+1,updated_at=NOW()
      RETURNING *`, tenantId, context.cohort_id, context.id, context.class_section_id, context.stream_id,
    input.subject_id, input.teacher_user_id, input.created_by_user_id ?? null, input.assignment_type ?? 'primary',
    input.is_primary !== false, input.mark_entry_allowed !== false, input.lesson_record_allowed !== false,
    input.report_comment_allowed !== false, input.effective_from ?? null, input.effective_to ?? null,
    input.reason ?? null, input.department_id ?? null, input.curriculum_model ?? null,
    previous.find((row: ConfigurationRow) => row.teacher_user_id === input.teacher_user_id)?.id ?? null))[0];
    saved.push(assignment);
    await resolveConfigurationIssue(tx, tenantId, context.id, String(input.subject_id), 'teacher_assignment', input.created_by_user_id ?? null);
    await governance?.({ tx, assignment, previous });
  }
  return saved.length ? { ...saved[0], assignments: saved } : null;
}

export async function resolveConfigurationIssue(tx: CohortTx, tenantId: string, placementId: string,
  subjectId: string, kind: string, actorUserId: string | null) {
  await tx.$queryRawUnsafe(`UPDATE academic_cohort_migration_issues SET status='resolved',resolved_at=NOW(),
    resolved_by_user_id=$5::uuid,updated_at=NOW() WHERE tenant_id=$1
    AND (cohort_placement_id=$2 OR (cohort_placement_id IS NULL AND class_section_id=(
      SELECT class_section_id FROM academic_cohort_placements WHERE tenant_id=$1 AND id=$2))) AND subject_id=$3
    AND entity_type=$4 AND status='pending' RETURNING id`, tenantId, placementId, subjectId, kind, actorUserId);
}

export async function auditConfiguration(tx: CohortTx, tenantId: string, entity: string,
  change: ConfigurationChange, actor: ConfigurationActor & { reason?: string | null }) {
  await tx.$queryRawUnsafe(`INSERT INTO academic_audit_logs
    (school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,previous_values,new_values,reason,correlation_id,metadata)
    VALUES ($1,$1,$2,$3,$4,$5::uuid,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb) RETURNING id`,
  tenantId, entity, String(change.assignment.id), `academics.${entity}_${change.action}`, actor.actor_user_id ?? null,
  actor.actor_role ?? null, change.previous ? JSON.stringify(change.previous) : null, JSON.stringify(change.assignment),
  actor.reason ?? null, actor.correlation_id ?? null, JSON.stringify({cohort_id:change.assignment.cohort_id,
    cohort_placement_id:change.assignment.cohort_placement_id,stream_id:change.assignment.stream_id}));
}
