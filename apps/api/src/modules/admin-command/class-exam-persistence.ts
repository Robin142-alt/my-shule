import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AdminCommandOperationsService } from './admin-command-operations.service';
import { classExamWindows, ClassExamConfiguration, examStreamStudentScopeSql } from '../exams/class-exam-configuration';

export async function validateClassExamConfiguration(ops: AdminCommandOperationsService, tenant: string, term: string,
  config: ClassExamConfiguration[], startsOn: string, endsOn: string) {
  const pairs = classExamWindows(config);
  const result = await ops.readSql(`SELECT requested.class_section_id, requested.subject_id
    FROM jsonb_to_recordset($3::jsonb) requested(class_section_id text,subject_id text,stream_scope jsonb)
    WHERE NOT EXISTS (SELECT 1 FROM class_subject_assignments offering
      WHERE offering.tenant_id=$1 AND offering.class_section_id=requested.class_section_id AND offering.subject_id=requested.subject_id
        AND (offering.academic_term_id IS NULL OR offering.academic_term_id=$2::text)
        AND offering.status='active' AND offering.is_examinable=TRUE
        AND (offering.effective_from IS NULL OR offering.effective_from<=$5::date)
        AND (offering.effective_to IS NULL OR offering.effective_to>=$4::date))`,
  [tenant,term,JSON.stringify(pairs),startsOn,endsOn]);
  if (result.rowCount) throw new BadRequestException('Some selected subjects are not active examinable offerings for this class and term. Update Academic Setup first.');
  const invalidStreamOffering=await ops.readSql(`SELECT requested.subject_id
    FROM jsonb_to_recordset($3::jsonb) requested(class_section_id text,subject_id text,stream_scope jsonb)
    JOIN class_streams stream ON stream.tenant_id=$1 AND stream.class_section_id=requested.class_section_id
    WHERE COALESCE((requested.stream_scope->'overrides'->>stream.id::text)::boolean,(requested.stream_scope->>'default')::boolean,TRUE)
      AND NOT EXISTS (SELECT 1 FROM class_subject_assignments offering WHERE offering.tenant_id=$1
        AND offering.class_section_id=requested.class_section_id AND offering.subject_id=requested.subject_id
        AND (offering.academic_term_id IS NULL OR offering.academic_term_id=$2::text)
        AND (NULLIF(to_jsonb(offering)->>'stream_id','') IS NULL OR to_jsonb(offering)->>'stream_id'=stream.id::text)
        AND offering.status='active' AND offering.is_examinable=TRUE
        AND (offering.effective_from IS NULL OR offering.effective_from<=$5::date)
        AND (offering.effective_to IS NULL OR offering.effective_to>=$4::date)) LIMIT 1`,[tenant,term,JSON.stringify(pairs),startsOn,endsOn]);
  if (invalidStreamOffering.rowCount) throw new BadRequestException('A selected subject is not offered to that stream. Adjust the stream exception or Academic Setup.');
  const streams = config.flatMap(c => (c.stream_subjects ?? []).map(s => ({class_section_id:c.class_section_id,stream_id:s.stream_id})));
  if (streams.length) {
    const invalid = await ops.readSql(`SELECT requested.stream_id FROM jsonb_to_recordset($2::jsonb) requested(class_section_id text,stream_id text)
      WHERE NOT EXISTS (SELECT 1 FROM class_streams stream WHERE stream.tenant_id=$1 AND stream.id::text=requested.stream_id
        AND stream.class_section_id=requested.class_section_id)`,[tenant,JSON.stringify(streams)]);
    if (invalid.rowCount) throw new BadRequestException('Choose streams belonging to their class in this school.');
  }
}

export async function persistClassExamWindows(ops: AdminCommandOperationsService, input: {
  tenant:string; exam:string; actor:string; config:ClassExamConfiguration[]; starts:string; ends:string; open:boolean; max:number;
}) {
  const {tenant,exam,actor,config,starts,ends,open,max}=input;
  const pairs=JSON.stringify(classExamWindows(config));
  // Protect a result even if its subject still exists in a different class or stream.
  const protectedMarks=await ops.readSql(`SELECT 1 FROM exam_marks mark
    WHERE mark.tenant_id=$1 AND mark.exam_series_id=$2::uuid AND NOT EXISTS (
      SELECT 1 FROM (SELECT requested.*,$1::text AS tenant_id,$2::uuid AS exam_series_id
        FROM jsonb_to_recordset($3::jsonb) requested(class_section_id uuid,subject_id uuid,stream_scope jsonb)) selected
      WHERE selected.class_section_id=mark.class_section_id AND selected.subject_id=mark.subject_id
        AND (COALESCE((selected.stream_scope->>'default')::boolean,TRUE) AND selected.stream_scope->'overrides'='{}'::jsonb
          OR ${examStreamStudentScopeSql('selected','mark.student_id')})) LIMIT 1`,[tenant,exam,pairs]);
  if (protectedMarks.rowCount) throw new ConflictException('Entered results must be preserved. A class or stream subject with saved results cannot be removed.');
  const scheduled=await ops.readSql(`SELECT 1 FROM exam_timetable_slots slot
    JOIN exam_assessments paper ON paper.tenant_id=slot.tenant_id AND paper.id=slot.assessment_id
    WHERE slot.tenant_id=$1 AND slot.exam_series_id=$2::uuid AND paper.class_section_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset($3::jsonb) selected(class_section_id text,subject_id text)
        WHERE selected.class_section_id=paper.class_section_id::text AND selected.subject_id=paper.subject_id::text) LIMIT 1`,[tenant,exam,pairs]);
  if (scheduled.rowCount) throw new ConflictException('Remove timetable slots for unchecked class subjects before saving.');
  // Remove only empty class papers that are no longer selected. Shared legacy
  // papers remain when another class uses them; saved marks were checked above.
  const removedPaper = `paper.tenant_id=$1 AND paper.exam_series_id=$2::uuid AND paper.class_section_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset($3::jsonb) selected(class_section_id text,subject_id text)
      WHERE selected.class_section_id=paper.class_section_id::text AND selected.subject_id=paper.subject_id::text)`;
  await ops.writeSql(`DELETE FROM exam_assessment_components component USING exam_assessments paper
    WHERE component.tenant_id=paper.tenant_id AND component.assessment_id=paper.id AND ${removedPaper}`,[tenant,exam,pairs]);
  await ops.writeSql(`DELETE FROM exam_assessments paper WHERE ${removedPaper}`,[tenant,exam,pairs]);
  await ops.writeSql(`DELETE FROM exam_mark_entry_windows w WHERE tenant_id=$1 AND exam_series_id=$2::uuid
    AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset($3::jsonb) selected(class_section_id text,subject_id text)
      WHERE selected.class_section_id=w.class_section_id::text AND selected.subject_id=w.subject_id::text)`,[tenant,exam,pairs]);
  // Existing windows keep their submission state, deadlines and teacher extensions.
  const windows=await ops.writeSql(`INSERT INTO exam_mark_entry_windows
    (tenant_id,exam_series_id,class_section_id,subject_id,opens_at,closes_at,status,last_action,last_action_by_user_id,stream_scope)
    SELECT $1,$2::uuid,selected.class_section_id::uuid,selected.subject_id::uuid,
      CASE WHEN $7::boolean THEN LEAST($4::date,NOW()) ELSE $4::date END,$5::date+INTERVAL '1 day'-INTERVAL '1 second',
      CASE WHEN $7::boolean THEN 'open' ELSE 'closed' END,CASE WHEN $7::boolean THEN 'opened' ELSE 'locked' END,$6::uuid,selected.stream_scope
    FROM jsonb_to_recordset($3::jsonb) selected(class_section_id text,subject_id text,stream_scope jsonb)
    ON CONFLICT (tenant_id,exam_series_id,subject_id,class_section_id) DO UPDATE SET stream_scope=EXCLUDED.stream_scope,
      updated_at=CASE WHEN exam_mark_entry_windows.stream_scope IS DISTINCT FROM EXCLUDED.stream_scope THEN NOW() ELSE exam_mark_entry_windows.updated_at END
    RETURNING id`,[tenant,exam,pairs,starts,ends,actor,open]);
  const papers=await ops.writeSql(`INSERT INTO exam_assessments(tenant_id,exam_series_id,subject_id,class_section_id,name,max_score,created_by_user_id)
    SELECT $1,$2::uuid,selected.subject_id::uuid,selected.class_section_id::uuid,subject.name || ' Main Paper',$4::numeric,$5::uuid
    FROM jsonb_to_recordset($3::jsonb) selected(class_section_id text,subject_id text)
    JOIN subjects subject ON subject.tenant_id=$1 AND subject.id::text=selected.subject_id
    WHERE NOT EXISTS (SELECT 1 FROM exam_assessments p WHERE p.tenant_id=$1 AND p.exam_series_id=$2::uuid
      AND p.subject_id::text=selected.subject_id AND (p.class_section_id IS NULL OR p.class_section_id::text=selected.class_section_id))
    ON CONFLICT DO NOTHING RETURNING id`,[tenant,exam,pairs,max,actor]);
  await ops.writeSql(`UPDATE exam_series SET class_subjects=$3::jsonb WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,exam,JSON.stringify(config)]);
  return {subjectsConfigured:new Set(classExamWindows(config).map(w=>w.subject_id)).size,
    markEntryWindowsConfigured:windows.rowCount,assessmentsInserted:papers.rowCount};
}
