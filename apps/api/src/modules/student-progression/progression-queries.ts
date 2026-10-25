import type { ProgressionOverview, ProgressionStudent, ProgressionStudentDetail, ProgressionStatus } from '../../../../../shared/student-progression';
import { CohortTx } from '../academics/cohort-configuration';
import { activeLearner, calendarEligibility, day } from './progression-policy';
import { activeClasses, plannedDestination, progressionCalendar } from './progression-destinations';
import { configuredSubjects } from './progression-mutations';
import { digest, ProgressionActor, query, readStudentState, readStudentStates, StudentState, Row } from './progression-store';

type PresentationContext={items:Map<string,Row>;pending:Set<string>;years:Row[];classes:Row[];plans:Map<string,Awaited<ReturnType<typeof plannedDestination>>>};
async function presentStudent(tx:CohortTx,actor:ProgressionActor,current:StudentState,yearId?:string,context?:PresentationContext):Promise<ProgressionStudent> {
  const source=current.placement??current.latest?.after_state?.assignments?.[0]??current.latest?.before_state?.assignments?.[0]??null;
  const selectedYear=yearId??source?.academic_year_id??current.latest?.academic_year_id;
  const [item]=context?[context.items.get(current.student.id)]:selectedYear?await query(tx,'SELECT * FROM academic_progression_items WHERE tenant_id=$1 AND student_id=$2 AND academic_year_id=$3',actor.tenantId,current.student.id,selectedYear):[];
  const decision=current.state.decisions.find(row=>row.academic_year_id===selectedYear)?.decision;
  const pending=context?(context.pending.has(current.student.id)?[true]:[]):await query(tx,`SELECT id FROM dashboard_approval_requests WHERE tenant_id=$1 AND module='student_progression' AND status='PENDING'
    AND metadata->'command'->'students' @> $2::jsonb LIMIT 1`,actor.tenantId,JSON.stringify([{id:current.student.id}]));
  let status:ProgressionStatus='enrolled';
  if(!activeLearner(current.student)) {
    const lifecycle=String(current.student.metadata?.progression_exit_type??current.student.status).toLowerCase();
    status=lifecycle==='expelled'?'expelled':['transferred','transferred_out'].includes(lifecycle)?'transferred':
      ['graduated','alumni'].includes(lifecycle)?'graduated':lifecycle==='completed'?'completed':lifecycle==='withdrawn'?'withdrawn':'exception';
  } else if(decision==='hold'||pending.length) status='held';
  else if(decision==='repeat') status='repeating';
  else if(item && item.status!=='excluded') status=item.status;
  else if(['promoted','repeating'].includes(current.latest?.outcome) && current.latest.academic_year_id!==source?.academic_year_id) status=current.latest.outcome;
  else if(source) status='upcoming';
  let message=pending.length?'A Principal decision is pending.':item?.message??null;
  if(activeLearner(current.student)&&(current.state.assignments.length!==1||current.state.enrollments.length!==1||!current.enrollment?.application_id)) {
    status='exception';message='Complete or correct the learner’s current academic enrollment.';
  }
  let nextName:string|null=null;
  if(source && ['upcoming','held','repeating','exception'].includes(status)) {
    try {
      const [year]=context?[context.years.find(row=>row.id===source.academic_year_id)]:await query(tx,'SELECT *,ends_on::text FROM academic_years WHERE tenant_id=$1 AND id::text=$2',actor.tenantId,source.academic_year_id);
      const section=(context?.classes??await activeClasses(tx,actor.tenantId,source.academic_year_id)).find(row=>String(row.id)===String(source.class_section_id));
      if(year&&section) {
        const key=`${source.class_section_id}:${decision==='repeat'}`;
        const plan=context?.plans.get(key)??await plannedDestination(tx,actor.tenantId,section,year,decision==='repeat');
        context?.plans.set(key,plan);
        nextName=plan.target?.name??(plan.completion==='graduated'?'Graduation':plan.completion==='completed'?'Stage completion':plan.nextName??null);
        if(plan.blocker&&!message) message=plan.blocker;
      }
    } catch(error) {message=error instanceof Error?error.message:'Review this pathway configuration.';}
  }
  return {id:current.student.id,name:[current.student.first_name,current.student.middle_name,current.student.last_name].filter(Boolean).join(' '),
    admission_number:current.student.admission_number,version:current.version,academic_year_id:source?.academic_year_id??null,academic_year_name:source?.year_name??null,
    class_section_id:source?.class_section_id??null,class_name:source?.class_name??null,stream_id:source?.stream_id??null,stream_name:source?.stream_name??null,
    curriculum_model:source?.curriculum_model??null,status,student_status:String(current.student.status),next_class_name:nextName,message,latest_transition_id:current.latest?.id??null};
}
export async function progressionDetail(tx:CohortTx,actor:ProgressionActor,id:string):Promise<ProgressionStudentDetail> {
  const current=await readStudentState(tx,actor.tenantId,id);
  const calendar=await progressionCalendar(tx,actor.tenantId);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:calendar.timezone}).format(new Date());
  const subjects=current.placement?.cohort_placement_id?await configuredSubjects(tx,actor.tenantId,current.placement.cohort_placement_id,
    today<day(calendar.years.find(row=>row.id===current.placement.academic_year_id)?.starts_on)?day(calendar.years.find(row=>row.id===current.placement.academic_year_id)?.starts_on):today):[];
  const history=await query(tx,'SELECT * FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2 ORDER BY created_at DESC,id DESC LIMIT 100',actor.tenantId,id);
  return {student:await presentStudent(tx,actor,current),subjects:subjects.map(row=>({id:row.id,name:row.name,code:row.code,compulsory:Boolean(row.is_compulsory),selected:current.state.subjects.some(subject=>String(subject.subject_id)===row.id)})),
    timeline:history.map(row=>({id:row.id,action:row.action,outcome:row.outcome,reason:row.reason,actor:row.automated?'MyShule automation':row.actor_role.replace(/_/g,' '),created_at:new Date(row.created_at).toISOString(),
      from_class:row.before_state.assignments?.[0]?.class_name??null,from_year:row.before_state.assignments?.[0]?.year_name??null,
      to_class:row.after_state.assignments?.[0]?.class_name??null,to_year:row.after_state.assignments?.[0]?.year_name??null,
      reversible:row.id===current.latest?.id&&['annual','promote','place','reinstate','repeat'].includes(row.action)&&Boolean(row.before_state.assignments?.[0])&&digest(row.after_state)===current.version}))};
}

export async function progressionOverview(tx:CohortTx,actor:ProgressionActor,input:Record<string,any>):Promise<ProgressionOverview> {
  const calendar=await progressionCalendar(tx,actor.tenantId,true);
  const yearId=String(input.academic_year_id??calendar.years.find(row=>row.is_current)?.id??calendar.years.at(-1)?.id??'');
  const year=calendar.years.find(row=>row.id===yearId);
  const classes=await activeClasses(tx,actor.tenantId);
  const streams=await query(tx,"SELECT id::text,name,class_section_id::text FROM class_streams WHERE tenant_id=$1 AND status='active' AND is_active AND archived_at IS NULL ORDER BY name",actor.tenantId);
  const limit=Math.min(Math.max(Number(input.limit)||25,1),100),offset=Math.max(Number(input.offset)||0,0);
  const scope=`FROM students student
    LEFT JOIN LATERAL(SELECT * FROM student_class_assignments placement WHERE placement.tenant_id=$1 AND placement.student_id::text=student.id::text
      ORDER BY (placement.status='active') DESC,placement.created_at DESC LIMIT 1) placement ON TRUE
    LEFT JOIN academic_progression_decisions decision ON decision.tenant_id=$1 AND decision.student_id=student.id::text AND decision.academic_year_id=$2
    LEFT JOIN academic_progression_items item ON item.tenant_id=$1 AND item.student_id=student.id::text AND item.academic_year_id=$2
    LEFT JOIN LATERAL(SELECT outcome,academic_year_id FROM academic_student_transitions transition WHERE transition.tenant_id=$1 AND transition.student_id=student.id::text
      ORDER BY created_at DESC,id DESC LIMIT 1) latest ON TRUE
    LEFT JOIN LATERAL(SELECT COUNT(*)::int AS count,COUNT(application_id)::int AS complete FROM student_academic_enrollments enrollment
      WHERE enrollment.tenant_id=$1 AND enrollment.student_id::text=student.id::text AND enrollment.status='active') annual ON TRUE
    WHERE student.tenant_id=$1 AND to_jsonb(student)->>'deleted_at' IS NULL AND ($2='' OR EXISTS(SELECT 1 FROM student_class_assignments history WHERE history.tenant_id=$1 AND history.student_id::text=student.id::text AND history.academic_year_id::text=$2)
      OR EXISTS(SELECT 1 FROM student_academic_enrollments enrollment WHERE enrollment.tenant_id=$1 AND enrollment.student_id::text=student.id::text
        AND (enrollment.academic_year_id=$2 OR (enrollment.academic_year_id IS NULL AND enrollment.academic_year=$3)))
      OR NOT EXISTS(SELECT 1 FROM student_class_assignments history WHERE history.tenant_id=$1 AND history.student_id::text=student.id::text))`;
  const status=`CASE WHEN COALESCE(student.metadata->>'progression_exit_type','')='expelled' OR student.status='expelled' THEN 'expelled'
    WHEN student.status IN ('transferred','transferred_out') THEN 'transferred' WHEN student.status='withdrawn' THEN 'withdrawn'
    WHEN COALESCE(student.metadata->>'progression_exit_type','')='completed' THEN 'completed' WHEN student.status IN ('graduated','alumni') THEN 'graduated'
    WHEN student.status NOT IN ('active','enrolled') OR lower(COALESCE(to_jsonb(student)->>'student_status',student.status)) NOT IN ('active','enrolled') THEN 'exception'
    WHEN placement.id IS NULL OR placement.status<>'active' OR annual.count<>1 OR annual.complete<>1 THEN 'exception'
    WHEN decision.decision='hold' OR EXISTS(SELECT 1 FROM dashboard_approval_requests approval WHERE approval.tenant_id=$1 AND approval.module='student_progression' AND approval.status='PENDING'
      AND approval.metadata->'command'->'students' @> jsonb_build_array(jsonb_build_object('id',student.id::text))) THEN 'held' WHEN decision.decision='repeat' THEN 'repeating'
    WHEN item.status IN ('promoted','repeating','held','exception') THEN item.status
    WHEN latest.outcome IN ('promoted','repeating') AND latest.academic_year_id<>placement.academic_year_id THEN latest.outcome ELSE 'upcoming' END`;
  const counts=Object.fromEntries((await query(tx,`SELECT ${status} AS status,COUNT(*)::int AS count ${scope} GROUP BY 1`,actor.tenantId,yearId,year?.name??'')).map(row=>[row.status,row.count]));
  const filtered=`${scope} AND ($4='' OR concat_ws(' ',student.first_name,student.middle_name,student.last_name,student.admission_number) ILIKE '%'||$4||'%')
    AND (($5='' AND $6='') OR EXISTS(SELECT 1 FROM student_class_assignments history
      WHERE history.tenant_id=$1 AND history.student_id::text=student.id::text AND ($2='' OR history.academic_year_id::text=$2)
        AND ($5='' OR history.class_section_id::text=$5) AND ($6='' OR history.stream_id::text=$6)))
    AND ($7='' OR (${status})=$7)`;
  const values=[actor.tenantId,yearId,year?.name??'',String(input.search??'').slice(0,160),String(input.class_section_id??''),String(input.stream_id??''),String(input.status??'')];
  const [total]=await query(tx,`SELECT COUNT(*)::int AS count ${filtered}`,...values);
  const ids=await query(tx,`SELECT student.id::text AS id ${filtered} ORDER BY student.first_name,student.last_name,student.id LIMIT $8 OFFSET $9`,...values,limit,offset);
  const selectedIds=ids.map(row=>row.id);
  const items=await query(tx,'SELECT * FROM academic_progression_items WHERE tenant_id=$1 AND academic_year_id=$2 AND student_id=ANY($3::text[])',actor.tenantId,yearId,selectedIds);
  const pending=await query(tx,`SELECT DISTINCT selected->>'id' AS student_id FROM dashboard_approval_requests approval
    CROSS JOIN LATERAL jsonb_array_elements(approval.metadata->'command'->'students') selected
    WHERE approval.tenant_id=$1 AND approval.module='student_progression' AND approval.status='PENDING' AND selected->>'id'=ANY($2::text[])`,actor.tenantId,selectedIds);
  const context:PresentationContext={items:new Map(items.map(row=>[row.student_id,row])),pending:new Set(pending.map(row=>row.student_id)),years:calendar.years,classes,plans:new Map()};
  const states=new Map((await readStudentStates(tx,actor.tenantId,selectedIds)).map(state=>[state.student.id,state]));
  const students:ProgressionStudent[]=[];
  for(const {id} of ids) {const state=states.get(id);if(state) students.push(await presentStudent(tx,actor,state,yearId,context));}
  const runs=await query(tx,'SELECT * FROM academic_progression_runs WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 20',actor.tenantId);
  const eligibility=year?calendarEligibility(year,calendar.terms.filter(row=>row.academic_year_id===yearId),calendar.years,calendar.timezone):null;
  const run=runs.find(row=>row.academic_year_id===yearId);
  const [activation]=await query(tx,'SELECT last_error FROM academic_progression_activation WHERE tenant_id=$1',actor.tenantId);
  const automationIssue=process.env.STUDENT_PROGRESSION_AUTOMATION_ENABLED==='false'
    ?'Automatic processing is paused by platform operations. Authorised staff can still use Run / retry progression.'
    :activation?.last_error??eligibility?.blocker;
  const approvals=await query(tx,`SELECT approval.id::text,approval.approval_type AS action,approval.reason,
    COALESCE(NULLIF(to_jsonb(requester)->>'display_name',''),NULLIF(to_jsonb(requester)->>'full_name',''),approval.requested_by_user_id::text) AS requested_by,approval.created_at,
    jsonb_array_length(approval.metadata->'command'->'students') AS student_count,
    concat_ws(' → ',(SELECT string_agg(concat_ws(' ',student.first_name,student.last_name)||' ('||student.admission_number||')',', ' ORDER BY student.first_name,student.id)
      FROM jsonb_array_elements(approval.metadata->'command'->'students') selected
      JOIN students student ON student.tenant_id=$1 AND student.id::text=selected->>'id'),
      NULLIF(concat_ws(' ',section.name,stream.name,year.name),'')) AS summary
    FROM dashboard_approval_requests approval
    LEFT JOIN users requester ON requester.id=approval.requested_by_user_id
    LEFT JOIN class_sections section ON section.tenant_id=$1 AND section.id::text=approval.metadata->'command'->>'target_class_section_id'
    LEFT JOIN class_streams stream ON stream.tenant_id=$1 AND stream.id::text=approval.metadata->'command'->>'target_stream_id'
    LEFT JOIN academic_years year ON year.tenant_id=$1 AND year.id=section.academic_year_id
    WHERE approval.tenant_id=$1 AND approval.module='student_progression' AND approval.status='PENDING' ORDER BY approval.created_at`,actor.tenantId);
  return {timezone:calendar.timezone,selected_year_id:yearId||null,automation:{status:automationIssue?'attention':run?.status??'upcoming',
    message:automationIssue??run?.message??(year?'MyShule will progress eligible learners after the final day of this academic year.':'Configure an academic year and its term dates to start automatic progression.'),next_run_at:year?`${day(year.ends_on)} (after the final day, ${calendar.timezone})`:null},
    permissions:{manage:actor.permissions.some(p=>['academics:manage-lifecycle','academics:*','*:*'].includes(p)),approve:actor.role==='principal'},
    counts,students,total:total?.count??0,years:calendar.years.map(row=>({id:row.id,name:row.name,starts_on:day(row.starts_on),ends_on:day(row.ends_on),status:row.status,is_current:Boolean(row.is_current)})),
    classes:classes.map(row=>({id:String(row.id),name:row.name,academic_year_id:String(row.academic_year_id),curriculum_model:row.curriculum_model,grade_level:row.grade_level})),streams:streams.map(row=>({id:row.id,name:row.name,class_section_id:row.class_section_id})),
    runs:runs.map(row=>({id:row.id,academic_year_id:row.academic_year_id,status:row.status,processed:Object.values(row.counts??{}).reduce((a:number,b)=>a+Number(b),0),
      promoted:row.counts?.promoted??0,repeated:row.counts?.repeating??0,graduated:(row.counts?.graduated??0)+(row.counts?.completed??0),held:row.counts?.held??0,exceptions:row.counts?.exception??0,message:row.message,updated_at:new Date(row.updated_at).toISOString()})),
    approvals:approvals.map(row=>({...row,created_at:new Date(row.created_at).toISOString()})) as ProgressionOverview['approvals']};
}
