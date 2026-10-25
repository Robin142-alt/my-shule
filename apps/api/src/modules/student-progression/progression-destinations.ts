import { BadRequestException, ConflictException } from '@nestjs/common';
import { CohortTx, ensureCohortContexts, captureCohortConfiguration, snapshotCohortConfiguration } from '../academics/cohort-configuration';
import { day, resolveNextClass } from './progression-policy';
import { query, ProgressionActor, Row } from './progression-store';

export async function progressionCalendar(tx:CohortTx,tenant:string,includeHistory=false) {
  const years=await query(tx,"SELECT year.*,year.starts_on::text,year.ends_on::text FROM academic_years year WHERE tenant_id=$1 AND ($2::boolean OR (archived_at IS NULL AND status NOT IN ('archived','inactive'))) ORDER BY year.starts_on,year.id",tenant,includeHistory);
  const terms=await query(tx,"SELECT term.*,term.starts_on::text,term.ends_on::text FROM academic_terms term WHERE tenant_id=$1 AND archived_at IS NULL AND status NOT IN ('archived','inactive') ORDER BY term.starts_on,term.id",tenant);
  const [settings]=await query(tx,`SELECT COALESCE(
      (SELECT NULLIF(settings->>'timezone','') FROM tenants WHERE tenant_id=$1),
      (SELECT setting.timezone FROM school_settings setting LEFT JOIN schools school ON school.id::text=setting.school_id::text
        WHERE setting.school_id::text=$1 OR school.slug=$1 ORDER BY (setting.school_id::text=$1) DESC LIMIT 1)) AS timezone`,tenant);
  return {years,terms,timezone:String(settings?.timezone??'Africa/Nairobi')};
}
export async function activeClasses(tx:CohortTx,tenant:string,yearId?:string) {
  return query(tx,`SELECT section.*,year.name AS year_name,year.starts_on::text AS year_starts_on,year.ends_on::text AS year_ends_on
    FROM class_sections section JOIN academic_years year ON year.tenant_id=section.tenant_id AND year.id::text=section.academic_year_id::text
    WHERE section.tenant_id=$1 AND section.is_active AND section.status='active' AND section.archived_at IS NULL
      AND ($2::text IS NULL OR section.academic_year_id::text=$2) ORDER BY section.name,section.id`,tenant,yearId??null);
}
export async function pathwayConfiguration(tx:CohortTx,tenant:string,source:Row,asOf:string) {
  const configurations=await query(tx,`SELECT configuration FROM academics_curriculum_configurations WHERE tenant_id=$1
    AND lower(curriculum_model)=lower($2) AND status='active' AND archived_at IS NULL
    AND effective_from<=$3::date AND (effective_to IS NULL OR effective_to>=$3::date)
    ORDER BY effective_from DESC,version DESC`,tenant,source.curriculum_model,asOf);
  const definitions=configurations.map(row=>row.configuration?.progression??{}).filter(row=>row.sequence||row.institution_end||row.terminal);
  if(definitions.length>1 && new Set(definitions.map(row=>JSON.stringify(row))).size>1)
    throw new ConflictException('Several active curricula disagree about this pathway. Resolve the configuration before progression.');
  const configured=definitions[0]??{};
  if(configured.institution_end) return configured;
  // The school's declared institution type is an existing, explicit boundary; missing classes alone are not evidence.
  const [school]=await query(tx,`SELECT COALESCE(
    (SELECT COALESCE(NULLIF(settings->>'institution_category',''),NULLIF(metadata->>'institution_category',''),NULLIF(settings->>'school_type','')) FROM tenants WHERE tenant_id=$1),
    (SELECT to_jsonb(school)->>'school_type' FROM schools school WHERE school.slug=$1 OR school.id::text=$1 ORDER BY (school.slug=$1) DESC LIMIT 1)) AS type`,tenant);
  const type=String(school?.type??'').toUpperCase();
  const model=String(source.curriculum_model).toUpperCase();
  const endpoint=['PRIMARY','PRIMARY_SCHOOL'].includes(type)?(model==='8-4-4'?'Standard 8':['CBC','CBE'].includes(model)?'Grade 6':null)
    :['JUNIOR_SECONDARY','JUNIOR_SCHOOL'].includes(type)&&['CBC','CBE'].includes(model)?'Grade 9':null;
  return endpoint?{...configured,institution_end:endpoint}:configured;
}
export async function plannedDestination(tx:CohortTx,tenant:string,source:Row,sourceYear:Row,repeating=false) {
  const templates=await activeClasses(tx,tenant,String(sourceYear.id));
  const configuration=await pathwayConfiguration(tx,tenant,source,day(sourceYear.ends_on));
  return resolveNextClass(source,templates,configuration,repeating);
}
/** Reuses an explicitly configured next-year position or copies the school's offered destination grade. */
export async function prepareDestination(tx:CohortTx,actor:ProgressionActor,template:Row,nextYear:Row,sourceStreamName:string|null) {
  const tenant=actor.tenantId;
  // Complete next-year dates are sufficient annual configuration; activate the scheduled destination only after the source year is due.
  if(nextYear.status==='draft') await query(tx,"UPDATE academic_years SET status='active',version=version+1,updated_at=NOW() WHERE tenant_id=$1 AND id=$2 AND status='draft' RETURNING id",tenant,nextYear.id);
  const existing=await query(tx,`SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id::text=$2 AND lower(btrim(name))=lower(btrim($3)) FOR UPDATE`,tenant,nextYear.id,template.name);
  if(existing.length>1) throw new ConflictException('The next-year class has duplicate names. Resolve its configuration.');
  let target=existing[0];
  if(target && (!target.is_active||target.status!=='active'||target.archived_at||String(target.curriculum_model).toLowerCase()!==String(template.curriculum_model).toLowerCase()))
    throw new ConflictException('The next-year class is inactive or belongs to a different curriculum. Review Academic Foundation.');
  let levelId=target?.academic_level_id??template.academic_level_id;
  if(!levelId) {
    const levels=await query(tx,'SELECT * FROM academic_levels WHERE tenant_id=$1 AND lower(name)=lower($2) AND lower(system_type)=lower($3) AND is_active',tenant,template.name,template.curriculum_model);
    if(levels.length>1) throw new ConflictException('The destination academic level is ambiguous.');
    levelId=levels[0]?.id;
    if(!levelId) [ {id:levelId} ]=await query(tx,`INSERT INTO academic_levels(tenant_id,system_type,name,order_index,is_active)
      SELECT $1,$2,$3,COALESCE(MAX(order_index),0)+1,TRUE FROM academic_levels WHERE tenant_id=$1 RETURNING id`,tenant,template.curriculum_model,template.name);
  }
  if(!target) [target]=await query(tx,`INSERT INTO class_sections(tenant_id,school_id,academic_year_id,academic_level_id,name,grade_level,
      curriculum_model,capacity,status,is_active,enrolment_open,created_by_user_id)
    VALUES($1,$1,$2,$3,$4,$5,$6,$7,'active',TRUE,TRUE,$8::uuid) RETURNING *`,tenant,nextYear.id,levelId,
  template.name,template.grade_level,template.curriculum_model,template.capacity??null,actor.userId);
  else if(!target.academic_level_id) [target]=await query(tx,'UPDATE class_sections SET academic_level_id=$3,updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2 RETURNING *',tenant,target.id,levelId);
  if(!target.enrolment_open) throw new ConflictException('The destination class is closed for enrollment.');
  const templateStreams=await query(tx,"SELECT * FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND is_active AND status='active' AND archived_at IS NULL",tenant,template.id);
  // Preserve all established streams and the learner's stream if the grade has not previously offered it.
  const names=new Map(templateStreams.map(row=>[String(row.name).trim().toLowerCase(),row]));
  if(sourceStreamName && !names.has(sourceStreamName.trim().toLowerCase())) names.set(sourceStreamName.trim().toLowerCase(),{name:sourceStreamName,capacity:template.capacity});
  for(const stream of names.values()) {
    const matches=await query(tx,'SELECT * FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND lower(btrim(name))=lower(btrim($3))',tenant,target.id,stream.name);
    if(matches.length>1 || matches.some(row=>!row.is_active||row.status!=='active'||row.archived_at)) throw new ConflictException('A destination stream is duplicated or disabled. Review its configuration.');
    if(!matches.length) await query(tx,`INSERT INTO class_streams(tenant_id,class_section_id,name,capacity,is_active,status)
      VALUES($1,$2,$3,$4,TRUE,'active') RETURNING id`,tenant,target.id,stream.name,stream.capacity??null);
  }
  const targetStreams=await query(tx,"SELECT * FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND is_active AND status='active' AND archived_at IS NULL",tenant,target.id);
  const targetStream=sourceStreamName?targetStreams.find(row=>String(row.name).trim().toLowerCase()===sourceStreamName.trim().toLowerCase()):null;
  if(!sourceStreamName && targetStreams.length) throw new ConflictException('This unstreamed learner needs a destination stream decision.');
  const contexts=await ensureCohortContexts(tx,tenant,target.id,targetStream?.id??null);
  const context=contexts.find(row=>row.stream_id===(targetStream?.id??null));
  if(!context) throw new ConflictException('The destination cohort is unavailable.');
  const configured=await captureCohortConfiguration(tx,tenant,context.id);
  if(!configured.subjects.length) {
    const sourceStreams=sourceStreamName?templateStreams.filter(row=>String(row.name).trim().toLowerCase()===sourceStreamName.trim().toLowerCase()):[];
    const templateStream=sourceStreams[0]?.id??null;
    if(sourceStreamName && templateStreams.length && !templateStream)
      throw new ConflictException('The new stream needs a subject configuration for its destination grade.');
    const sources=await ensureCohortContexts(tx,tenant,template.id,templateStream);
    const source=sources.find(row=>row.stream_id===templateStream);
    if(!source) throw new ConflictException('Configure the destination grade’s subjects in Academic Foundation.');
    const snapshot=await captureCohortConfiguration(tx,tenant,source.id);
    // Explicit end dates are respected. Continuing assignments have no artificial annual expiry.
    snapshot.subjects=snapshot.subjects.filter(row=>row.status==='active'&&(!row.effective_to||day(row.effective_to)>=day(nextYear.starts_on)));
    const activeSubjects=await query(tx,"SELECT id::text FROM subjects WHERE tenant_id=$1 AND status='active' AND archived_at IS NULL AND deleted_at IS NULL",tenant);
    snapshot.subjects=snapshot.subjects.filter(row=>activeSubjects.some(subject=>subject.id===String(row.subject_id)));
    if(!snapshot.subjects.length) throw new ConflictException('The destination grade has no valid continuing subjects. Configure its next-year subjects.');
    const staff=await query(tx,"SELECT DISTINCT user_id::text FROM tenant_memberships WHERE tenant_id=$1 AND status='active'",tenant);
    snapshot.teachers=snapshot.teachers.filter(row=>staff.some(member=>member.user_id===String(row.teacher_user_id))
      &&(!row.effective_to||day(row.effective_to)>=day(nextYear.starts_on))
      &&snapshot.subjects.some(subject=>String(subject.subject_id)===String(row.subject_id)));
    await snapshotCohortConfiguration(tx,tenant,source.id,context,actor.userId,snapshot);
    await query(tx,`INSERT INTO academics_class_teachers(school_id,tenant_id,academic_year_id,class_section_id,teacher_user_id,is_active,status,
        effective_from,effective_to,assignment_type,reason)
      SELECT $1,$1,$2,$3,teacher_user_id,TRUE,'active',GREATEST(COALESCE(effective_from,$4::date),$4::date),effective_to,assignment_type,'Annual calendar continuation'
      FROM academics_class_teachers appointment WHERE tenant_id=$1 AND class_section_id::text=$5 AND status='active' AND is_active
        AND (effective_to IS NULL OR effective_to>=$4::date)
        AND EXISTS(SELECT 1 FROM tenant_memberships member WHERE member.tenant_id=$1 AND member.user_id=appointment.teacher_user_id AND member.status='active')
        AND NOT EXISTS(SELECT 1 FROM academics_class_teachers existing WHERE existing.tenant_id=$1 AND existing.class_section_id::text=$3 AND existing.is_active)
      RETURNING id`,tenant,nextYear.id,target.id,nextYear.starts_on,template.id);
  }
  return {classId:String(target.id),streamId:targetStream?.id??null};
}

export async function resolvePlacement(tx:CohortTx,tenant:string,classId:string,streamId:string|null) {
  const [section]=await query(tx,`SELECT section.*,year.name AS year_name,year.starts_on::text AS year_starts_on,year.ends_on::text AS year_ends_on,
      stream.name AS stream_name,stream.capacity AS stream_capacity,stream.id::text AS stream_id
    FROM class_sections section JOIN academic_years year ON year.tenant_id=section.tenant_id AND year.id::text=section.academic_year_id::text
    LEFT JOIN class_streams stream ON stream.tenant_id=section.tenant_id AND stream.class_section_id::text=section.id::text AND stream.id::text=$3
      AND stream.status='active' AND stream.is_active AND stream.archived_at IS NULL
    WHERE section.tenant_id=$1 AND section.id::text=$2 AND section.is_active AND section.status='active' AND section.archived_at IS NULL
      AND year.status NOT IN ('inactive','archived','draft') AND year.archived_at IS NULL FOR UPDATE OF section`,tenant,classId,streamId);
  if(!section || (streamId&&!section.stream_id)) throw new BadRequestException('Choose an active class and its stream in this school.');
  if(!section.academic_level_id) throw new BadRequestException('The destination class needs an academic level. Review Academic Foundation.');
  const streams=await query(tx,"SELECT id FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND status='active' AND is_active AND archived_at IS NULL",tenant,classId);
  if(!streamId&&streams.length) throw new BadRequestException('Select the destination stream.');
  return section;
}
