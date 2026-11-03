import { BadRequestException } from '@nestjs/common';
import { CohortTx, captureCohortConfiguration, ensureCohortContexts, ensureCohortMigration, lockCohortSchool, snapshotCohortConfiguration } from '../academics/cohort-configuration';
import { continuingGradeName, day, resolveNextClass } from './progression-policy';
import { pathwayConfiguration } from './progression-destinations';
import { ProgressionActor, query, Row } from './progression-store';
import { MULTI_HOLDER_STAFF_APPOINTMENT_CODES } from '../../auth/staff-appointment-catalog';

/** Add missing year associations only. Existing destination rows (including ended/removed
 * associations) are decisions and must never be overwritten by a retry. */
export async function prepareAcademicYearStructure(tx:CohortTx, actor:ProgressionActor, targetYearId:string) {
  const tenant=actor.tenantId;
  await lockCohortSchool(tx,tenant);
  await ensureCohortMigration(tx,tenant);
  const [targetYear]=await query(tx,'SELECT *,starts_on::text,ends_on::text FROM academic_years WHERE tenant_id=$1 AND id::text=$2 FOR UPDATE',tenant,targetYearId);
  if(!targetYear) throw new BadRequestException('Academic year was not found in this school.');
  const summary={source_classes:0,classes:0,streams:0,subjects:0,teachers:0,class_teachers:0,appointments:0,issues:[] as string[]};
  if(targetYear.archived_at||['archived','inactive','closed'].includes(targetYear.status)) return summary;
  const [sourceYear]=await query(tx,`SELECT * FROM academic_years WHERE tenant_id=$1 AND ends_on<$2::date
    AND archived_at IS NULL AND status NOT IN ('inactive','archived') ORDER BY ends_on DESC,id LIMIT 1`,tenant,targetYear.starts_on);
  if(!sourceYear) return summary;
  const sourceClasses=await query(tx,`SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id::text=$2
    AND status='active' AND is_active AND archived_at IS NULL ORDER BY name,id`,tenant,sourceYear.id);
  summary.source_classes=sourceClasses.length;
  const continuations:Row[]=[];
  const destinationClasses=await query(tx,'SELECT name,curriculum_model FROM class_sections WHERE tenant_id=$1 AND academic_year_id::text=$2',tenant,targetYearId);
  for(const source of sourceClasses) {
    const nextName=continuingGradeName(source);
    if(!nextName) continue;
    const plan=resolveNextClass(source,sourceClasses,await pathwayConfiguration(tx,tenant,source,day(sourceYear.ends_on)));
    if(plan.target||plan.completion||plan.nextName!==nextName||destinationClasses.some(row=>String(row.name).trim().toLowerCase()===nextName.toLowerCase())) continue;
    const disabled=await query(tx,`SELECT id FROM class_sections WHERE tenant_id=$1 AND academic_year_id::text=$2
      AND lower(btrim(name))=lower(btrim($3)) AND (NOT is_active OR status<>'active' OR archived_at IS NOT NULL)`,tenant,sourceYear.id,nextName);
    if(disabled.length) continue;
    const learners=await query(tx,"SELECT id FROM student_class_assignments WHERE tenant_id=$1 AND class_section_id::text=$2 AND status='active' LIMIT 1",tenant,source.id);
    if(!learners.length) continue;
    let [level]=await query(tx,'SELECT id FROM academic_levels WHERE tenant_id=$1 AND lower(name)=lower($2) AND system_type=$3 AND is_active',tenant,nextName,source.curriculum_model);
    if(!level) [level]=await query(tx,`INSERT INTO academic_levels(tenant_id,system_type,name,order_index,is_active)
      SELECT $1,$2,$3,COALESCE(MAX(order_index),0)+1,TRUE FROM academic_levels WHERE tenant_id=$1 RETURNING id`,tenant,source.curriculum_model,nextName);
    continuations.push({...source,name:nextName,grade_level:nextName,academic_level_id:level.id,code:null,custom_label:null});
  }
  const classMap=new Map<string,Row[]>(),streamMap=new Map<string,string>();
  const staff=new Set((await query(tx,"SELECT DISTINCT user_id::text FROM tenant_memberships WHERE tenant_id=$1 AND status='active'",tenant)).map(row=>row.user_id));
  const subjects=new Set((await query(tx,"SELECT id::text FROM subjects WHERE tenant_id=$1 AND status='active' AND archived_at IS NULL AND deleted_at IS NULL",tenant)).map(row=>row.id));
  const continuing=(row:Row)=>row.status==='active'&&(!row.effective_to||day(row.effective_to)>=day(targetYear.starts_on));
  for(const source of [...sourceClasses,...continuations]) {
    const matches=await query(tx,'SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id::text=$2 AND lower(btrim(name))=lower(btrim($3))',tenant,targetYearId,source.name);
    if(matches.length>1) {summary.issues.push(`${source.name}: duplicate destination classes need review.`);continue;}
    let target=matches[0];
    if(target&&(!target.is_active||target.status!=='active'||target.archived_at||String(target.curriculum_model).toLowerCase()!==String(source.curriculum_model).toLowerCase())) {
      summary.issues.push(`${source.name}: existing destination is disabled or uses a different curriculum; preserved.`);continue;
    }
    if(!target) {
      [target]=await query(tx,`INSERT INTO class_sections(tenant_id,school_id,academic_year_id,academic_level_id,name,grade_level,
        curriculum_model,capacity,custom_label,code,status,is_active,enrolment_open,created_by_user_id)
        VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,'active',TRUE,$10,$11::uuid) RETURNING *`,tenant,targetYearId,source.academic_level_id,
      source.name,source.grade_level,source.curriculum_model,source.capacity,source.custom_label,source.code,source.enrolment_open,actor.userId);
      summary.classes++;
    }
    classMap.set(String(source.id),[...(classMap.get(String(source.id))??[]),target]);
    const sourceStreams=await query(tx,"SELECT * FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND status='active' AND is_active AND archived_at IS NULL ORDER BY name,id",tenant,source.id);
    for(const stream of sourceStreams) {
      const found=await query(tx,'SELECT * FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND lower(btrim(name))=lower(btrim($3))',tenant,target.id,stream.name);
      let mapped=found[0];
      if(found.length>1||mapped&&(!mapped.is_active||mapped.status!=='active'||mapped.archived_at)) {summary.issues.push(`${source.name} / ${stream.name}: destination stream needs review.`);continue;}
      if(!mapped) { [mapped]=await query(tx,`INSERT INTO class_streams(tenant_id,class_section_id,name,capacity,class_teacher_id,stream_teacher_user_id,code,is_active,status)
        VALUES($1,$2,$3,$4,$5::uuid,$6::uuid,$7,TRUE,'active') RETURNING *`,tenant,target.id,stream.name,stream.capacity,
        staff.has(String(stream.class_teacher_id))?stream.class_teacher_id:null,
        staff.has(String(stream.stream_teacher_user_id))?stream.stream_teacher_user_id:null,stream.code);summary.streams++; }
      streamMap.set(`${stream.id}:${target.id}`,String(mapped.id));
    }
    // Each stream has an independent configuration; one populated stream must not suppress the others.
    const sources=await ensureCohortContexts(tx,tenant,String(source.id));
    const targets=await ensureCohortContexts(tx,tenant,String(target.id));
    for(const sourceContext of sources) {
      const mappedStream=sourceContext.stream_id?streamMap.get(`${sourceContext.stream_id}:${target.id}`):null;
      const targetContext=targets.find(row=>row.stream_id===mappedStream);
      if(!targetContext) {summary.issues.push(`${source.name}: map the changed stream structure before carrying teaching assignments.`);continue;}
      const snapshot=await captureCohortConfiguration(tx,tenant,sourceContext.id);
      const existing=await captureCohortConfiguration(tx,tenant,targetContext.id);
      // Include ended teacher rows, so an intentional removal is not resurrected.
      const existingTeachers=await query(tx,'SELECT * FROM teacher_subject_assignments WHERE tenant_id=$1 AND cohort_placement_id=$2',tenant,targetContext.id);
      const offered=snapshot.subjects.filter(row=>continuing(row)&&subjects.has(String(row.subject_id)));
      const toCopy=offered.filter(row=>!existing.subjects.some(item=>String(item.subject_id)===String(row.subject_id)));
      const permitted=new Set([...existing.subjects.filter(continuing),...toCopy].map(row=>String(row.subject_id)));
      const teachers=snapshot.teachers.filter(row=>continuing(row)&&staff.has(String(row.teacher_user_id))&&permitted.has(String(row.subject_id))
        &&!existingTeachers.some(item=>String(item.subject_id)===String(row.subject_id)));
      const from=(row:Row)=>({...row,effective_from:day(row.effective_from)>day(targetYear.starts_on)?day(row.effective_from):day(targetYear.starts_on)});
      await snapshotCohortConfiguration(tx,tenant,sourceContext.id,targetContext,actor.userId,{subjects:toCopy.map(from),teachers:teachers.map(from)});
      summary.subjects+=toCopy.length;summary.teachers+=teachers.length;
      if(!permitted.size) summary.issues.push(`${source.name}${sourceContext.stream_id?` / ${sourceStreams.find(s=>String(s.id)===sourceContext.stream_id)?.name}`:''}: configure subjects before enrollment.`);
    }
    const existingAppointments=await query(tx,'SELECT id FROM academics_class_teachers WHERE tenant_id=$1 AND class_section_id::text=$2',tenant,target.id);
    if(!existingAppointments.length) {
      const teachers=await query(tx,"SELECT * FROM academics_class_teachers WHERE tenant_id=$1 AND class_section_id::text=$2 AND status='active' AND is_active",tenant,source.id);
      for(const teacher of teachers.filter(row=>continuing(row)&&staff.has(String(row.teacher_user_id)))) {
        await query(tx,`INSERT INTO academics_class_teachers(school_id,tenant_id,academic_year_id,class_section_id,teacher_user_id,
          is_active,status,effective_from,effective_to,assignment_type,reason)
          VALUES($1,$1,$2,$3,$4::uuid,TRUE,'active',$5::date,$6::date,$7,'Annual structure continuation') RETURNING id`,
        tenant,targetYearId,target.id,teacher.teacher_user_id,day(teacher.effective_from)>day(targetYear.starts_on)?day(teacher.effective_from):day(targetYear.starts_on),teacher.effective_to,teacher.assignment_type);
        summary.class_teachers++;
      }
    }
  }
  // Departments, HODs, curricula and global responsibilities already retain their shared identity.
  const appointments=await query(tx,`SELECT * FROM academics_role_appointments WHERE tenant_id=$1 AND status='active'
    AND (academic_year_id=$2 OR class_section_id=ANY($3::text[])) ORDER BY id`,tenant,sourceYear.id,[...classMap.keys()]);
  for(const appointment of appointments.filter(row=>continuing(row)&&staff.has(String(row.teacher_user_id)))) {
    const scopes=appointment.class_section_id?classMap.get(String(appointment.class_section_id))??[]:[null];
    for(const scope of scopes) {
    const targetClass=scope?.id??null;
    const targetStream=appointment.stream_id?streamMap.get(`${appointment.stream_id}:${targetClass}`):null;
    if(appointment.class_section_id&&!targetClass||appointment.stream_id&&!targetStream) {summary.issues.push(`${appointment.role_type}: destination scope needs review.`);continue;}
    const existing=await query(tx,`SELECT id FROM academics_role_appointments WHERE tenant_id=$1 AND academic_year_id=$2
      AND role_type=$3 AND department_id IS NOT DISTINCT FROM $4::uuid AND class_section_id IS NOT DISTINCT FROM $5::text
      AND stream_id IS NOT DISTINCT FROM $6::text AND subject_id IS NOT DISTINCT FROM $7::text
      AND (NOT $8::boolean OR teacher_user_id::text=$9)`,tenant,targetYearId,appointment.role_type,appointment.department_id,targetClass,targetStream,appointment.subject_id,
    (MULTI_HOLDER_STAFF_APPOINTMENT_CODES as readonly string[]).includes(appointment.role_type),String(appointment.teacher_user_id));
    if(existing.length) continue;
    await query(tx,`INSERT INTO academics_role_appointments(tenant_id,school_id,role_type,teacher_user_id,department_id,academic_year_id,
      class_section_id,stream_id,subject_id,appointment_type,effective_from,effective_to,status,reason,appointed_by_user_id)
      VALUES($1,$1,$2,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::date,$11::date,'active','Annual structure continuation',$12::uuid) RETURNING id`,
    tenant,appointment.role_type,appointment.teacher_user_id,appointment.department_id,targetYearId,targetClass,targetStream,appointment.subject_id,
    appointment.appointment_type,day(appointment.effective_from)>day(targetYear.starts_on)?day(appointment.effective_from):day(targetYear.starts_on),appointment.effective_to,actor.userId);
    summary.appointments++;
    }
  }
  return summary;
}
