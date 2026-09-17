import { CohortContext, CohortTx } from './cohort-configuration';

type Actor = {tenantId: string; userId: string | null};
type Row = Record<string, any>;
const rows = async (tx: CohortTx, sql: string, values: unknown[] = []): Promise<Row[]> => {
  const result = await tx.$queryRawUnsafe(sql, ...values);
  return Array.isArray(result) ? result : result?.rows ?? [];
};
const date = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);

export async function updateStudentCohortPosition(tx: CohortTx, actor: Actor, studentId: string, target: CohortContext, section: Row) {
    const columns = new Set((await rows(tx, `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='students'`)).map((row) => row.column_name));
    const values: unknown[] = [actor.tenantId, studentId]; const setters: string[] = [];
    for (const [column, value] of [['current_class_id',target.class_section_id],['current_stream_id',target.stream_id],['updated_by_user_id',actor.userId]]) {
      if (columns.has(column)) { values.push(value); setters.push(`${column}=$${values.length}`); }
    }
    if (columns.has('metadata')) {
      values.push(JSON.stringify({ academic_year_id:target.academic_year_id,class_section_id:target.class_section_id,
        stream_id:target.stream_id,grade_level:section.grade_level,cohort_id:target.cohort_id,cohort_placement_id:target.id }));
      setters.push(`metadata=COALESCE(metadata,'{}'::jsonb)||$${values.length}::jsonb`);
    }
    if (columns.has('updated_at')) setters.push('updated_at=NOW()');
    if (setters.length) await rows(tx, `UPDATE students SET ${setters.join(',')} WHERE tenant_id=$1 AND id::text=$2 RETURNING id`, values);
  }

export async function updateStudentCohortSubjects(tx: CohortTx, actor: Actor, studentId: string, target: CohortContext, enrollment: Row | null, subjects: Row[]) {
    const [tables] = await rows(tx, `SELECT to_regclass('public.student_subject_enrollments')::text AS subjects,to_regclass('public.student_timetable_enrollments')::text AS timetable`);
    if (tables?.subjects) {
      const previous = await rows(tx, `UPDATE student_subject_enrollments SET status='completed',updated_at=NOW()
        WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING subject_id`, [actor.tenantId,studentId]);
      const selected = new Set(previous.map((item) => String(item.subject_id)));
      if (enrollment) for (const subject of subjects.filter((item) => item.status === 'active'
        && (!item.effective_to || date(item.effective_to) >= date(new Date()))
        && (item.is_compulsory || selected.has(String(item.subject_id))))) {
        await rows(tx, `INSERT INTO student_subject_enrollments (tenant_id,student_id,academic_enrollment_id,subject_code,subject_name,
          academic_year_id,class_section_id,stream_id,subject_id,is_compulsory,selected_by_user_id,status)
          SELECT $1,$2,$3,subject.code,subject.name,$4,$5,$6,subject.id,$7,$8::uuid,'active'
          FROM subjects subject WHERE subject.tenant_id=$1 AND subject.id::text=$9 RETURNING id`, [actor.tenantId,studentId,enrollment.id,
          target.academic_year_id,target.class_section_id,target.stream_id,subject.is_compulsory,actor.userId,subject.subject_id]);
      }
    }
    if (tables?.timetable) await rows(tx, `UPDATE student_timetable_enrollments SET status='completed',updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`, [actor.tenantId,studentId]);
  }

