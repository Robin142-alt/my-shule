import { BadRequestException, ConflictException } from '@nestjs/common';
import { CohortTx, ensureCohortContexts, ensureCohortMigration } from '../academics/cohort-configuration';
import { UpdateStudentRecordDto } from './dto/update-student-record.dto';
import { normalizeAcademicSystemType } from './repositories/admissions.repository';

export async function updateRecordAcademics(tx: CohortTx, tenant: string, actor: string, student: any, dto: UpdateStudentRecordDto) {
  const query = (sql: string, ...values: unknown[]): Promise<any[]> => tx.$queryRawUnsafe(sql, ...values);
  const classId = dto.class_section_id ?? student.class_section_id;
  const streamId = dto.stream_id === undefined ? student.stream_id : dto.stream_id || null;
  const moving = classId !== student.class_section_id || streamId !== student.stream_id;
  if (!moving && dto.subject_ids === undefined) return;
  if (student.status !== 'active') throw new BadRequestException('Only active students can change class or subjects.');
  await ensureCohortMigration(tx, tenant);
  const [section] = await query(`SELECT section.*, year.name AS year_name, stream.name AS stream_name,
      stream.capacity AS stream_capacity, stream.id AS selected_stream_id
    FROM class_sections section JOIN academic_years year ON year.tenant_id=section.tenant_id AND year.id::text=section.academic_year_id::text
    LEFT JOIN class_streams stream ON stream.tenant_id=section.tenant_id AND stream.class_section_id::text=section.id::text
      AND stream.id::text=$3 AND stream.is_active AND stream.status='active' AND stream.archived_at IS NULL
    WHERE section.tenant_id=$1 AND section.id::text=$2 AND section.is_active AND section.status='active'
      AND section.archived_at IS NULL AND year.status='active' AND year.archived_at IS NULL FOR UPDATE OF section`, tenant, classId, streamId);
  if (!section || (streamId && !section.selected_stream_id)) throw new BadRequestException('Select an active class and stream in this school.');
  if (moving && !section.enrolment_open) throw new BadRequestException('The selected class is closed for enrolment.');
  if (moving && student.academic_year_id && student.academic_year_id !== section.academic_year_id)
    throw new BadRequestException('Use academic promotion to move a learner to a different academic year.');
  const [settings = {}] = await query('SELECT * FROM admission_settings WHERE tenant_id=$1', tenant);
  if (moving && settings.strict_capacity) {
    const [counts] = await query(`SELECT COUNT(*)::int AS class_count,
      COUNT(*) FILTER (WHERE stream_id::text=$3)::int AS stream_count FROM student_class_assignments
      WHERE tenant_id=$1 AND class_section_id::text=$2 AND student_id::text<>$4 AND status='active'`, tenant, classId, streamId, student.id);
    if ((section.capacity != null && counts.class_count >= section.capacity)
      || (streamId && section.stream_capacity != null && counts.stream_count >= section.stream_capacity))
      throw new BadRequestException('The selected class or stream has reached its configured capacity.');
  }
  const contexts = await ensureCohortContexts(tx, tenant, classId, streamId);
  const context = contexts.find(row => row.stream_id === streamId);
  if (!context) throw new BadRequestException('Select a stream for this class.');
  const available = await query(`SELECT DISTINCT ON (subject.id) subject.id, subject.code, subject.name, subject.subject_type,
      assignment.is_compulsory, assignment.academic_term_id
    FROM class_subject_assignments assignment JOIN subjects subject ON subject.tenant_id=assignment.tenant_id AND subject.id::text=assignment.subject_id::text
    WHERE assignment.tenant_id=$1 AND assignment.cohort_placement_id=$2 AND assignment.status='active'
      AND (assignment.effective_from IS NULL OR assignment.effective_from<=CURRENT_DATE)
      AND (assignment.effective_to IS NULL OR assignment.effective_to>=CURRENT_DATE)
      AND subject.status='active' AND subject.deleted_at IS NULL AND subject.archived_at IS NULL
    ORDER BY subject.id, assignment.updated_at DESC`, tenant, context.id);
  const selected = dto.subject_ids ?? available.map(row => String(row.id));
  if (!selected.length || selected.some(id => !available.some(row => row.id === id)))
    throw new BadRequestException('Choose subjects configured for the selected class and stream.');
  if (available.some(row => row.is_compulsory && !selected.includes(row.id)))
    throw new BadRequestException('Compulsory class subjects must remain selected.');
  if ((settings.minimum_subjects != null && selected.length < settings.minimum_subjects)
    || (settings.maximum_subjects != null && selected.length > settings.maximum_subjects))
    throw new BadRequestException('The subject count is outside the school admission settings.');
  const enrollments = await query(`SELECT * FROM student_academic_enrollments
    WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' FOR UPDATE`, tenant, student.id);
  if (enrollments.length !== 1) throw new ConflictException('The student needs one active academic enrolment before changing class or subjects.');
  const enrollment = enrollments[0];
  if (moving) {
    if (!section.academic_level_id) {
      // Legacy classes derive this link on first use, as they do during direct admission.
      await query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text', `academic-level:${tenant}`);
      let [level] = await query(`SELECT id FROM academic_levels WHERE tenant_id=$1 AND lower(btrim(name))=lower(btrim($2))
        ORDER BY is_active DESC,order_index,id LIMIT 1 FOR UPDATE`, tenant, section.name);
      if (level) await query('UPDATE academic_levels SET is_active=TRUE,updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2', tenant, level.id);
      else [level] = await query(`INSERT INTO academic_levels (tenant_id,system_type,name,order_index,is_active)
        SELECT $1,$2,$3,COALESCE(MAX(order_index),0)+1,TRUE FROM academic_levels WHERE tenant_id=$1 RETURNING id`,
      tenant, normalizeAcademicSystemType(section.curriculum_model), section.name);
      section.academic_level_id = level.id;
      await query('UPDATE class_sections SET academic_level_id=$3,updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2', tenant, classId, level.id);
    }
    await query(`UPDATE student_class_assignments SET status='completed',updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active'`, tenant, student.id);
    await query(`INSERT INTO student_class_assignments (tenant_id,school_id,student_id,class_section_id,stream_id,academic_year_id,
      academic_level_id,status,assigned_by_user_id,cohort_id,cohort_placement_id)
      VALUES ($1,$1,$2,$3,$4,$5,$6,'active',$7::uuid,$8,$9)`, tenant, student.id, classId, streamId,
    section.academic_year_id, section.academic_level_id, actor, context.cohort_id, context.id);
    await query(`UPDATE student_academic_enrollments SET class_section_id=$3,stream_id=$4,class_name=$5,stream_name=$6,
      academic_year=$7,cohort_id=$8,cohort_placement_id=$9,updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2`,
    tenant, enrollment.id, classId, streamId, section.name, section.stream_name || 'Unstreamed', section.year_name, context.cohort_id, context.id);
    const [allocation] = await query(`UPDATE student_allocations SET is_current=FALSE,updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND is_current RETURNING *`, tenant, student.id);
    await query(`INSERT INTO student_allocations (tenant_id,student_id,class_name,stream_name,dormitory_name,transport_route,effective_from,is_current,notes)
      VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,TRUE,$7)`, tenant, student.id, section.name, section.stream_name || 'Unstreamed',
    allocation?.dormitory_name ?? null, allocation?.transport_route ?? null, dto.reason);
    await query(`UPDATE students SET current_class_id=$3,current_stream_id=$4,
      metadata=COALESCE(metadata,'{}'::jsonb)||$5::jsonb WHERE tenant_id=$1 AND id::text=$2`, tenant, student.id, classId, streamId,
    JSON.stringify({ class_section_id: classId, stream_id: streamId, academic_year_id: section.academic_year_id,
      curriculum: section.curriculum_model, grade_level: section.name, cohort_id: context.cohort_id, cohort_placement_id: context.id }));
    await query(`UPDATE admission_applications SET class_applying=$3,applying_for_class_id=$4,updated_at=NOW()
      WHERE tenant_id=$1 AND admitted_student_id::text=$2`, tenant, student.id, section.name, classId);
  }
  // End removed selections, retaining their historical rows and all existing marks.
  await query(`UPDATE student_subject_enrollments SET status='dropped',effective_to=CURRENT_DATE,updated_at=NOW()
    WHERE tenant_id=$1 AND student_id::text=$2 AND status='active'
      AND (subject_id IS NULL OR NOT(subject_id::text=ANY($3::text[])))`, tenant, student.id, selected);
  await query(`INSERT INTO student_subject_enrollments (tenant_id,student_id,academic_enrollment_id,subject_code,subject_name,
    academic_year_id,academic_term_id,class_section_id,stream_id,subject_id,curriculum_model,subject_type,is_compulsory,selected_by_user_id,effective_from,status)
    SELECT $1,$2,$3,item.code,item.name,$5,item.academic_term_id,$6,$7,item.id,$8,item.subject_type,item.is_compulsory,$9::uuid,CURRENT_DATE,'active'
    FROM jsonb_to_recordset($4::jsonb) AS item(id text,code text,name text,academic_term_id text,subject_type text,is_compulsory boolean)
    ON CONFLICT (tenant_id,student_id,academic_year_id,subject_id) WHERE status='active' AND academic_year_id IS NOT NULL AND subject_id IS NOT NULL
    DO UPDATE SET class_section_id=EXCLUDED.class_section_id,stream_id=EXCLUDED.stream_id,academic_enrollment_id=EXCLUDED.academic_enrollment_id,
      is_compulsory=EXCLUDED.is_compulsory,curriculum_model=EXCLUDED.curriculum_model,updated_at=NOW()`, tenant, student.id, enrollment.id,
  JSON.stringify(available.filter(row => selected.includes(row.id))), section.academic_year_id, classId, streamId, section.curriculum_model, actor);
  await query(`UPDATE student_timetable_enrollments SET status='completed',updated_at=NOW()
    WHERE tenant_id=$1 AND student_id::text=$2 AND status='active'`, tenant, student.id);
  await query(`INSERT INTO student_timetable_enrollments (tenant_id,student_id,academic_enrollment_id,timetable_slot_id,
    day_of_week,starts_at,ends_at,subject_name,room_name,status)
    SELECT slot.tenant_id,$2,$3,slot.id,slot.day_of_week,slot.starts_at,slot.ends_at,slot.subject_name,slot.room_name,'active'
    FROM academic_timetable_slots slot WHERE slot.tenant_id=$1 AND slot.class_section_id::text=$4 AND slot.is_active
      AND EXISTS (SELECT 1 FROM student_subject_enrollments subject WHERE subject.tenant_id=$1 AND subject.student_id::text=$2
        AND subject.status='active' AND lower(subject.subject_name)=lower(slot.subject_name))
    ON CONFLICT (tenant_id,student_id,timetable_slot_id) DO UPDATE SET academic_enrollment_id=EXCLUDED.academic_enrollment_id,
      status='active',updated_at=NOW()`, tenant, student.id, enrollment.id, classId);
}
