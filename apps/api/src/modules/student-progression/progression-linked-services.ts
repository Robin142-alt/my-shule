import { CohortTx } from '../academics/cohort-configuration';
import { ProgressionActor, query } from './progression-store';

/** End live service entitlements when a learner exits; retain allocations, journeys,
 * loans, charges and every historical record. Reinstatement requires a fresh allocation. */
export async function closeStudentServices(tx:CohortTx,actor:ProgressionActor,studentId:string,outcome:string) {
  const [tables]=await query(tx,`SELECT to_regclass('public.boarding_allocations')::text AS allocations,
    to_regclass('public.boarding_beds')::text AS beds,to_regclass('public.boarding_students')::text AS boarders,
    to_regclass('public.transport_manifest_students')::text AS transport`);
  const previous:Record<string,unknown>={};
  if(tables.allocations) {
    previous.boarding_allocations=await query(tx,"SELECT * FROM boarding_allocations WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' FOR UPDATE",actor.tenantId,studentId);
    await query(tx,`UPDATE boarding_allocations SET status='released',released_by=$3::uuid,released_at=NOW(),release_reason=$4,updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`,actor.tenantId,studentId,actor.userId,`Learner ${outcome}`);
  }
  if(tables.beds) {
    previous.boarding_beds=await query(tx,'SELECT * FROM boarding_beds WHERE tenant_id=$1 AND assigned_student_id::text=$2 FOR UPDATE',actor.tenantId,studentId);
    await query(tx,`UPDATE boarding_beds SET assigned_student_id=NULL,
      status=CASE WHEN upper(status)='OCCUPIED' THEN 'AVAILABLE' ELSE status END,updated_at=NOW()
      WHERE tenant_id=$1 AND assigned_student_id::text=$2 RETURNING id`,actor.tenantId,studentId);
  }
  if(tables.boarders) {
    previous.boarding_students=await query(tx,"SELECT * FROM boarding_students WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' FOR UPDATE",actor.tenantId,studentId);
    await query(tx,"UPDATE boarding_students SET status='inactive',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id",actor.tenantId,studentId);
  }
  if(tables.transport) {
    previous.transport_manifest_students=await query(tx,"SELECT * FROM transport_manifest_students WHERE tenant_id=$1 AND student_id::text=$2 AND boarding_status IN ('active','paused') FOR UPDATE",actor.tenantId,studentId);
    await query(tx,"UPDATE transport_manifest_students SET boarding_status='left_route',updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2 AND boarding_status IN ('active','paused') RETURNING id",actor.tenantId,studentId);
  }
  if(Object.values(previous).some(rows=>Array.isArray(rows)&&rows.length)) await query(tx,`INSERT INTO academic_audit_logs
    (school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,previous_values,new_values,reason)
    VALUES($1,$1,'student',$2,'student.services.closed',$3::uuid,$4,$5::jsonb,$6::jsonb,$7) RETURNING id`,actor.tenantId,studentId,
  actor.userId,actor.role,JSON.stringify(previous),JSON.stringify({outcome,boarding:'released',transport:'left_route'}),`Learner ${outcome}; service history retained`);
}
