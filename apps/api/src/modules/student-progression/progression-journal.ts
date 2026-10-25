import { CohortTx } from '../academics/cohort-configuration';
import { EventPublisherService } from '../events/event-publisher.service';
import { ProgressionActor, query, readStudentState, StudentState } from './progression-store';
import { randomUUID } from 'node:crypto';

export async function recordProgressionOperation(tx:CohortTx,events:EventPublisherService,actor:ProgressionActor,
  action:string,entityId:string,reason:string,details:Record<string,unknown>) {
  const id=randomUUID();
  await query(tx,`INSERT INTO academic_audit_logs(school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,reason,new_values,correlation_id)
    VALUES($1,$1,'student_progression',$2,$3,$4::uuid,$5,$6,$7::jsonb,$8) RETURNING id`,actor.tenantId,entityId,action,actor.userId,actor.role,reason,JSON.stringify(details),id);
  await events.publish({tenant_id:actor.tenantId,event_name:'school.operation.recorded',event_key:`student.progression.operation:${id}`,
    aggregate_type:'student_progression',aggregate_id:entityId,payload:{tenant_id:actor.tenantId,school_id:actor.tenantId,operation_id:id,
      operation_type:`student.progression.${action}`,module:'academics',actor_role:actor.role,title:'Student progression update',body:'Academic progression records have been updated.',
      entity_id:entityId,severity:'info',target_roles:[],notifications:[],sms:[],payload:{system_refresh_only:true},occurred_at:new Date().toISOString()}},tx);
}

export async function recordTransition(tx:CohortTx,events:EventPublisherService,actor:ProgressionActor,current:StudentState,
  input:{yearId:string;action:string;outcome:string;reason:string;requestId:string;reversalOf?:string}) {
  const after=await readStudentState(tx,actor.tenantId,current.student.id);
  if(after.enrollment && after.enrollment.id!==current.enrollment?.id) {
    await events.publish({tenant_id:actor.tenantId,event_name:'student.academic_enrollment.created',
      event_key:`student.academic_enrollment.created:${after.enrollment.id}`,aggregate_type:'student_academic_enrollment',aggregate_id:after.enrollment.id,
      payload:{tenant_id:actor.tenantId,student_id:current.student.id,academic_enrollment_id:after.enrollment.id,application_id:after.enrollment.application_id,
        class_section_id:after.enrollment.class_section_id,class_name:after.enrollment.class_name,stream_name:after.enrollment.stream_name,
        academic_year:after.enrollment.academic_year,status:'active',occurred_at:new Date().toISOString()}},tx);
  }
  const [record]=await query(tx,`INSERT INTO academic_student_transitions(tenant_id,student_id,academic_year_id,action,outcome,reason,
    actor_user_id,actor_role,automated,request_id,before_state,after_state,reversal_of)
    VALUES($1,$2,$3,$4,$5,$6,$7::uuid,$8,$9,$10,$11::jsonb,$12::jsonb,$13) RETURNING *`,actor.tenantId,current.student.id,
  input.yearId,input.action,input.outcome,input.reason,actor.userId,actor.role,Boolean(actor.system),input.requestId,
  JSON.stringify(current.state),JSON.stringify(after.state),input.reversalOf??null);
  await query(tx,`INSERT INTO academic_audit_logs(school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,
    previous_values,new_values,reason,correlation_id,metadata)
    VALUES($1,$1,'student',$2,$3,$4::uuid,$5,$6::jsonb,$7::jsonb,$8,$9,$10::jsonb) RETURNING id`,actor.tenantId,current.student.id,
  `student.progression.${input.action}`,actor.userId,actor.role,JSON.stringify(current.state),JSON.stringify(after.state),input.reason,
  input.requestId,JSON.stringify({transition_id:record.id,automated:Boolean(actor.system)}));
  // Historical lifecycle consumers keep their familiar event contract; the new journal carries all exception types.
  if(current.enrollment && ['promoted','repeating','graduated','completed'].includes(input.outcome)) {
    const eventType=['graduated','completed'].includes(input.outcome)?'graduation':'promotion';
    const [lifecycle]=await query(tx,`INSERT INTO student_academic_lifecycle_events(tenant_id,student_id,source_enrollment_id,target_enrollment_id,
      event_type,from_class_name,from_stream_name,from_academic_year,to_class_section_id,to_class_name,to_stream_name,to_academic_year,reason,created_by_user_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::uuid) RETURNING id`,actor.tenantId,current.student.id,current.enrollment.id,
    after.enrollment?.id??null,eventType,current.enrollment.class_name,current.enrollment.stream_name||'Unstreamed',current.enrollment.academic_year,
    after.placement?.class_section_id??null,after.placement?.class_name??null,after.placement?.stream_name??null,after.placement?.year_name??null,input.reason,actor.userId);
    await events.publish({tenant_id:actor.tenantId,event_name:'student.academic_lifecycle.changed',event_key:`student.academic_lifecycle.changed:${lifecycle.id}`,
      aggregate_type:'student_academic_lifecycle_event',aggregate_id:lifecycle.id,payload:{tenant_id:actor.tenantId,student_id:current.student.id,
        lifecycle_event_id:lifecycle.id,event_type:eventType,source_enrollment_id:current.enrollment.id,target_enrollment_id:after.enrollment?.id??null,
        from_class_name:current.enrollment.class_name,from_stream_name:current.enrollment.stream_name,from_academic_year:current.enrollment.academic_year,
        to_class_name:after.enrollment?.class_name??null,to_stream_name:after.enrollment?.stream_name??null,to_academic_year:after.enrollment?.academic_year??null,
        reason:input.reason,occurred_at:new Date().toISOString()}},tx);
  }
  await events.publish({tenant_id:actor.tenantId,event_name:'school.operation.recorded',event_key:`student.progression:${record.id}`,
    aggregate_type:'student',aggregate_id:current.student.id,payload:{tenant_id:actor.tenantId,school_id:actor.tenantId,operation_id:record.id,
      operation_type:`student.progression.${input.action}`,module:'academics',actor_role:actor.role,title:'Student progression updated',
      body:'Academic placement and progression records have been updated.',entity_id:current.student.id,severity:'info',target_roles:[],notifications:[],sms:[],
      payload:{system_refresh_only:true,transition_id:record.id},occurred_at:new Date().toISOString()}},tx);
  return record;
}
