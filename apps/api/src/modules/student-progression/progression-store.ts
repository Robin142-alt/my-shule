import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CohortTx, lockCohortSchool, ensureCohortMigration } from '../academics/cohort-configuration';
export type Row = Record<string, any>;
export type ProgressionActor = {tenantId:string;userId:string|null;role:string;permissions:string[];system?:boolean};
export const query = async <T=Row>(tx:CohortTx, sql:string, ...values:unknown[]):Promise<T[]> => {
  const result=await tx.$queryRawUnsafe(sql,...values); return Array.isArray(result)?result:result?.rows??[];
};
function canonical(value:any):any {
  if(value instanceof Date) return value.toISOString();
  if(Array.isArray(value)) return value.map(canonical);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])]));
  return value;
}
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function authorizeProgression(actor:ProgressionActor,write=false) {
  if(!actor.tenantId) throw new ForbiddenException('A school identity is required.');
  if(actor.system && actor.role==='system' && actor.userId===null) return;
  if(!actor.userId || !['principal','school_admin','deputy_principal','dean_academics'].includes(actor.role))
    throw new ForbiddenException('Student progression is restricted to school academic leadership.');
  const permission=write?'academics:manage-lifecycle':'academics:read';
  if(!actor.permissions.some(value=>[permission,'academics:*','*:*'].includes(value))) throw new ForbiddenException('Your role cannot perform this progression action.');
}
export async function lockProgression(tx:CohortTx,actor:ProgressionActor) {
  await lockCohortSchool(tx,actor.tenantId);
  await validateMembership(tx,actor);
  await ensureCohortMigration(tx,actor.tenantId);
}
export async function validateMembership(tx:CohortTx,actor:ProgressionActor) {
  if(!actor.system) {
    const members=await query(tx,"SELECT user_id FROM tenant_memberships WHERE tenant_id=$1 AND user_id::text=$2 AND status='active'",actor.tenantId,actor.userId);
    if(!members.length) throw new ForbiddenException('Your active school membership is required.');
  }
}
export async function readStudentState(tx:CohortTx,tenant:string,id:string,lock=false) {
  const [state]=await readStudentStates(tx,tenant,[id],lock);
  if(!state) throw new NotFoundException('Student was not found in this school.');
  return state;
}
export async function readStudentStates(tx:CohortTx,tenant:string,ids:string[],lock=false) {
  if(!ids.length) return [];
  const students=await query(tx,`SELECT *,id::text AS id FROM students WHERE tenant_id=$1 AND id::text=ANY($2::text[])
    AND to_jsonb(students)->>'deleted_at' IS NULL ORDER BY students.id ${lock?'FOR UPDATE':''}`,tenant,ids);
  const assignments=await query(tx,`SELECT assignment.*,section.name AS class_name,section.grade_level,section.curriculum_model,
      year.name AS year_name,stream.name AS stream_name FROM student_class_assignments assignment
    JOIN class_sections section ON section.tenant_id=assignment.tenant_id AND section.id::text=assignment.class_section_id::text
    JOIN academic_years year ON year.tenant_id=assignment.tenant_id AND year.id::text=assignment.academic_year_id::text
    LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id::text=assignment.stream_id::text
    WHERE assignment.tenant_id=$1 AND assignment.student_id::text=ANY($2::text[]) AND assignment.status='active' ORDER BY assignment.created_at DESC,assignment.id`,tenant,ids);
  const enrollments=await query(tx,"SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id::text=ANY($2::text[]) AND status='active' ORDER BY created_at DESC,id",tenant,ids);
  const subjects=await query(tx,"SELECT * FROM student_subject_enrollments WHERE tenant_id=$1 AND student_id::text=ANY($2::text[]) AND status='active' ORDER BY subject_id,id",tenant,ids);
  const allocations=await query(tx,"SELECT * FROM student_allocations WHERE tenant_id=$1 AND student_id::text=ANY($2::text[]) AND is_current ORDER BY created_at DESC,id",tenant,ids);
  const decisions=await query(tx,'SELECT * FROM academic_progression_decisions WHERE tenant_id=$1 AND student_id=ANY($2::text[]) ORDER BY academic_year_id',tenant,ids);
  const transitions=await query(tx,'SELECT DISTINCT ON(student_id) student_id,id,action,outcome,academic_year_id,before_state,after_state,created_at FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=ANY($2::text[]) ORDER BY student_id,created_at DESC,id DESC',tenant,ids);
  return students.map(student=>{
    const forStudent=(rows:Row[])=>rows.filter(row=>String(row.student_id)===student.id);
    const state={student:{id:student.id,status:student.status,student_status:student.student_status,current_class_id:student.current_class_id,
      current_stream_id:student.current_stream_id,progression_exit_type:student.metadata?.progression_exit_type??null},
      assignments:forStudent(assignments),enrollments:forStudent(enrollments),subjects:forStudent(subjects),allocations:forStudent(allocations),decisions:forStudent(decisions)};
    return {state,version:digest(state),student,placement:state.assignments[0]??null,enrollment:state.enrollments[0]??null,latest:forStudent(transitions)[0]??null};
  });
}
export type StudentState=Awaited<ReturnType<typeof readStudentState>>;
export function requireCompleteEnrollment(current:StudentState) {
  if(current.state.assignments.length!==1 || current.state.enrollments.length!==1 || !current.enrollment.application_id)
    throw new BadRequestException('This learner needs one complete current class placement and annual admission enrollment. Correct the student record first.');
  if(String(current.enrollment.class_section_id)!==String(current.placement.class_section_id)
    || (current.enrollment.stream_id??null)!==(current.placement.stream_id??null))
    throw new BadRequestException('The learner’s class placement and admission enrollment disagree. Correct the student record first.');
}
