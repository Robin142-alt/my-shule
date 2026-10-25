import { BadRequestException, ConflictException } from '@nestjs/common';
import { CohortTx, ensureCohortContexts } from '../academics/cohort-configuration';
import { updateStudentCohortPosition } from '../academics/cohort-enrollment';
import { activeLearner, day } from './progression-policy';
import { resolvePlacement } from './progression-destinations';
import { ProgressionActor, query, StudentState, requireCompleteEnrollment, Row } from './progression-store';

export async function setDecision(tx:CohortTx,actor:ProgressionActor,studentId:string,yearId:string,decision:string,reason:string) {
  await query(tx,`INSERT INTO academic_progression_decisions(tenant_id,student_id,academic_year_id,decision,reason,actor_user_id)
    VALUES($1,$2,$3,$4,$5,$6::uuid) ON CONFLICT(tenant_id,student_id,academic_year_id)
    DO UPDATE SET decision=EXCLUDED.decision,reason=EXCLUDED.reason,actor_user_id=EXCLUDED.actor_user_id,updated_at=NOW() RETURNING id`,
  actor.tenantId,studentId,yearId,decision,reason,actor.userId);
}
export async function configuredSubjects(tx:CohortTx,tenant:string,placementId:string,asOf:string) {
  return query(tx,`SELECT subject.id::text,subject.name,subject.code,subject.subject_type,assignment.is_compulsory
    FROM class_subject_assignments assignment JOIN subjects subject ON subject.tenant_id=assignment.tenant_id AND subject.id::text=assignment.subject_id::text
    WHERE assignment.tenant_id=$1 AND assignment.cohort_placement_id=$2 AND assignment.status='active'
      AND (assignment.effective_from IS NULL OR assignment.effective_from<=$3::date)
      AND (assignment.effective_to IS NULL OR assignment.effective_to>=$3::date)
      AND subject.status='active' AND subject.archived_at IS NULL AND subject.deleted_at IS NULL ORDER BY subject.name,subject.id`,tenant,placementId,asOf);
}
async function replaceSubjects(tx:CohortTx,actor:ProgressionActor,current:StudentState,section:Row,placementId:string,enrollmentId:string,
  asOf:string,closeOn:string,selectedIds?:string[]) {
  const tenant=actor.tenantId,id=current.student.id;
  const available=await configuredSubjects(tx,tenant,placementId,asOf);
  if(!available.length) throw new BadRequestException('Configure the destination class subjects before moving this learner.');
  const old=new Set(current.state.subjects.map(row=>String(row.subject_id)));
  const selected=selectedIds??available.filter(row=>row.is_compulsory||old.has(row.id)).map(row=>row.id);
  if(!selected.length||new Set(selected).size!==selected.length||selected.some(value=>!available.some(row=>row.id===value)))
    throw new BadRequestException('Choose valid subjects offered by the destination class and stream.');
  if(available.some(row=>row.is_compulsory&&!selected.includes(row.id))) throw new BadRequestException('Compulsory subjects must remain selected.');
  const [settings]=await query(tx,'SELECT minimum_subjects,maximum_subjects FROM admission_settings WHERE tenant_id=$1',tenant);
  if((settings?.minimum_subjects!=null&&selected.length<settings.minimum_subjects)||(settings?.maximum_subjects!=null&&selected.length>settings.maximum_subjects))
    throw new BadRequestException('The subject selections do not meet this school’s configured subject count.');
  await query(tx,`UPDATE student_subject_enrollments SET status='completed',effective_to=COALESCE(effective_to,GREATEST(effective_from,$3::date)),updated_at=NOW()
    WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`,tenant,id,closeOn);
  for(const subject of available.filter(row=>selected.includes(row.id))) await query(tx,`INSERT INTO student_subject_enrollments
    (tenant_id,student_id,academic_enrollment_id,academic_year_id,class_section_id,stream_id,subject_id,subject_code,subject_name,
     is_compulsory,selected_by_user_id,effective_from,curriculum_model,subject_type,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::uuid,$12::date,$13,$14,'active') RETURNING id`,
  tenant,id,enrollmentId,section.academic_year_id,section.id,section.stream_id??null,subject.id,subject.code,subject.name,
  subject.is_compulsory,actor.userId,asOf,section.curriculum_model,subject.subject_type??'academic');
  await query(tx,"UPDATE student_timetable_enrollments SET status='completed',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",tenant,id);
  await query(tx,`INSERT INTO student_timetable_enrollments(tenant_id,student_id,academic_enrollment_id,timetable_slot_id,day_of_week,starts_at,ends_at,subject_name,room_name,status)
    SELECT $1,$2,$3,slot.id,slot.day_of_week,slot.starts_at,slot.ends_at,slot.subject_name,slot.room_name,'active'
    FROM academic_timetable_slots slot WHERE slot.tenant_id=$1 AND slot.class_section_id::text=$4 AND slot.is_active
      AND EXISTS(SELECT 1 FROM student_subject_enrollments subject WHERE subject.tenant_id=$1 AND subject.student_id::text=$2
        AND subject.status='active' AND lower(subject.subject_name)=lower(slot.subject_name))
    ON CONFLICT(tenant_id,student_id,timetable_slot_id) DO UPDATE SET academic_enrollment_id=EXCLUDED.academic_enrollment_id,status='active',updated_at=NOW() RETURNING id`,tenant,id,enrollmentId,section.id);
}

export async function placeStudent(tx:CohortTx,actor:ProgressionActor,current:StudentState,targetClass:string,targetStream:string|null,
  options:{reason:string;today:string;allowInactive?:boolean;allowRepair?:boolean;subjectIds?:string[];restore?:boolean}) {
  const tenant=actor.tenantId,id=current.student.id;
  if(!activeLearner(current.student)&&!options.allowInactive) throw new BadRequestException('Reinstate this learner before changing their academic placement.');
  if(activeLearner(current.student)&&!options.allowRepair) requireCompleteEnrollment(current);
  const section=await resolvePlacement(tx,tenant,targetClass,targetStream);
  if(!section.enrolment_open&&!options.restore) throw new BadRequestException('The destination class is closed for enrollment.');
  const [counts]=await query(tx,`SELECT COUNT(*)::int AS class_count,COUNT(*) FILTER(WHERE stream_id::text=$3)::int AS stream_count
    FROM student_class_assignments WHERE tenant_id=$1 AND class_section_id::text=$2 AND student_id::text<>$4 AND status='active'`,tenant,targetClass,targetStream,id);
  if((section.capacity!=null&&Number(counts.class_count)>=Number(section.capacity))
    ||(targetStream&&section.stream_capacity!=null&&Number(counts.stream_count)>=Number(section.stream_capacity)))
    throw new ConflictException('The destination class or stream has reached capacity.');
  const contexts=await ensureCohortContexts(tx,tenant,targetClass,targetStream);
  const context=contexts.find(row=>row.stream_id===targetStream);
  if(!context) throw new BadRequestException('The destination cohort does not match this stream.');
  const history=await query(tx,'SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id::text=$2 ORDER BY created_at DESC',tenant,id);
  let application=current.enrollment?.application_id??history.find(row=>row.application_id)?.application_id;
  if(!application&&options.allowRepair) {
    const applications=await query(tx,'SELECT id FROM admission_applications WHERE tenant_id=$1 AND admitted_student_id::text=$2',tenant,id);
    if(applications.length===1) application=applications[0].id;
  }
  if(!application) throw new BadRequestException('Complete this learner’s admission record before creating an academic enrollment.');
  const destination=history.filter(row=>row.academic_year_id===section.academic_year_id||(!row.academic_year_id&&row.academic_year===section.year_name));
  if(destination.length>1) throw new ConflictException('The destination year has duplicate enrollment records. Correct them before progression.');
  // A year keeps its canonical enrollment identity; immutable transition snapshots preserve every correction.
  await query(tx,"UPDATE student_academic_enrollments SET status='completed',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",tenant,id);
  let enrollment=destination[0];
  if(enrollment) [enrollment]=await query(tx,`UPDATE student_academic_enrollments SET class_section_id=$3,stream_id=$4,class_name=$5,stream_name=$6,
    academic_year_id=$7,academic_year=$8,status='active',cohort_id=$9,cohort_placement_id=$10,updated_at=NOW()
    WHERE tenant_id=$1 AND id::text=$2 RETURNING *`,tenant,enrollment.id,targetClass,targetStream,section.name,section.stream_name??'Unstreamed',
  section.academic_year_id,section.year_name,context.cohort_id,context.id);
  else [enrollment]=await query(tx,`INSERT INTO student_academic_enrollments(tenant_id,student_id,application_id,class_section_id,stream_id,
    class_name,stream_name,academic_year_id,academic_year,status,cohort_id,cohort_placement_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11) RETURNING *`,tenant,id,application,targetClass,targetStream,section.name,
  section.stream_name??'Unstreamed',section.academic_year_id,section.year_name,context.cohort_id,context.id);
  await query(tx,"UPDATE student_class_assignments SET status='completed',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",tenant,id);
  await query(tx,`INSERT INTO student_class_assignments(tenant_id,school_id,student_id,class_section_id,stream_id,academic_level_id,academic_year_id,
    status,assigned_by_user_id,cohort_id,cohort_placement_id) VALUES($1,$1,$2,$3,$4,$5,$6,'active',$7::uuid,$8,$9) RETURNING id`,tenant,id,
  targetClass,targetStream,section.academic_level_id,section.academic_year_id,actor.userId,context.cohort_id,context.id);
  const previousYear=current.placement?.academic_year_id;
  const annual=previousYear&&previousYear!==section.academic_year_id;
  const asOf=options.today<day(section.year_starts_on)?day(section.year_starts_on):options.today;
  const [oldYear]=annual?await query(tx,'SELECT ends_on::text FROM academic_years WHERE tenant_id=$1 AND id::text=$2',tenant,previousYear):[];
  const closeOn=annual&&day(oldYear?.ends_on)<options.today?day(oldYear.ends_on):options.today;
  await replaceSubjects(tx,actor,current,section,context.id,enrollment.id,asOf,closeOn,options.subjectIds);
  await query(tx,'UPDATE student_allocations SET is_current=FALSE,updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND is_current RETURNING id',tenant,id);
  const oldAllocation=current.state.allocations[0]??(await query(tx,'SELECT * FROM student_allocations WHERE tenant_id=$1 AND student_id::text=$2 ORDER BY created_at DESC LIMIT 1',tenant,id))[0];
  await query(tx,`INSERT INTO student_allocations(tenant_id,student_id,class_name,stream_name,dormitory_name,transport_route,effective_from,is_current,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7::date,TRUE,$8) RETURNING id`,tenant,id,section.name,section.stream_name??'Unstreamed',
  oldAllocation?.dormitory_name??null,oldAllocation?.transport_route??null,asOf,options.reason);
  await updateStudentCohortPosition(tx,actor,id,context,section);
  await query(tx,`UPDATE students SET status='active',student_status='ACTIVE',updated_at=NOW(),
    metadata=(COALESCE(metadata,'{}'::jsonb)-'progression_exit_type')||jsonb_build_object('curriculum',$3::text,'grade_level',$4::text)
    WHERE tenant_id=$1 AND id::text=$2 RETURNING id`,tenant,id,section.curriculum_model,section.name);
  return enrollment;
}

export async function changeSubjects(tx:CohortTx,actor:ProgressionActor,current:StudentState,ids:string[],today:string) {
  if(!activeLearner(current.student)) throw new BadRequestException('Only enrolled learners can change subject selections.');
  requireCompleteEnrollment(current);
  const section=await resolvePlacement(tx,actor.tenantId,current.placement.class_section_id,current.placement.stream_id??null);
  const asOf=today<day(section.year_starts_on)?day(section.year_starts_on):today;
  await replaceSubjects(tx,actor,current,section,current.placement.cohort_placement_id,current.enrollment.id,asOf,today,ids);
}
export async function exitStudent(tx:CohortTx,actor:ProgressionActor,current:StudentState,outcome:string,today:string) {
  if(!activeLearner(current.student) && !['suspended','on_leave'].includes(String(current.student.status).toLowerCase())) throw new BadRequestException('This learner has already exited. Reinstate them before another exit decision.');
  const graduated=['graduated','completed'].includes(outcome);
  const status=graduated?'graduated':outcome==='transferred'?'transferred':outcome==='expelled'?'expelled':'withdrawn';
  const enumStatus=graduated?'GRADUATED':outcome==='transferred'?'TRANSFERRED_OUT':'WITHDRAWN';
  await query(tx,`UPDATE student_academic_enrollments SET status=$3,updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`,
  actor.tenantId,current.student.id,graduated?'completed':outcome==='transferred'?'transferred':'withdrawn');
  await query(tx,"UPDATE student_class_assignments SET status='completed',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",actor.tenantId,current.student.id);
  await query(tx,"UPDATE student_subject_enrollments SET status='completed',effective_to=COALESCE(effective_to,GREATEST(effective_from,$3::date)),updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",actor.tenantId,current.student.id,today);
  await query(tx,"UPDATE student_timetable_enrollments SET status='completed',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",actor.tenantId,current.student.id);
  await query(tx,'UPDATE student_allocations SET is_current=FALSE,updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND is_current RETURNING id',actor.tenantId,current.student.id);
  await query(tx,`UPDATE students SET status=$3,student_status=$4::"StudentStatus",current_class_id=NULL,current_stream_id=NULL,updated_at=NOW(),
    metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('progression_exit_type',$5::text,'class_section_id',NULL,'stream_id',NULL,'academic_year_id',NULL)
    WHERE tenant_id=$1 AND id::text=$2 RETURNING id`,actor.tenantId,current.student.id,status,enumStatus,outcome);
}
