import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ProgressionCommand, ProgressionCommandResult } from '../../../../../shared/student-progression';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { CohortTx } from '../academics/cohort-configuration';
import { activeLearner, calendarEligibility, day } from './progression-policy';
import { activeClasses, plannedDestination, prepareDestination, progressionCalendar, resolvePlacement } from './progression-destinations';
import { authorizeProgression, digest, lockProgression, ProgressionActor, query, readStudentState, requireCompleteEnrollment, Row, StudentState, validateMembership } from './progression-store';
import { changeSubjects, exitStudent, placeStudent, setDecision } from './progression-mutations';
import { recordProgressionOperation, recordTransition } from './progression-journal';
import { progressionOverview, progressionDetail } from './progression-queries';

@Injectable()
export class ProgressionEngine {
  private readonly logger=new Logger(ProgressionEngine.name);
  constructor(private readonly prisma:PrismaService,private readonly events:EventPublisherService) {}
  private transaction<T>(actor:ProgressionActor,work:(tx:CohortTx)=>Promise<T>,write=true) {
    authorizeProgression(actor,write);
    return this.prisma.executeWithTenant(actor.tenantId,actor.userId,async tx=>{
      if(write) await lockProgression(tx,actor);
      else await validateMembership(tx,actor);
      return work(tx);
    });
  }
  overview(actor:ProgressionActor,input:Record<string,any>={}) {return this.transaction(actor,tx=>progressionOverview(tx,actor,input),false);}
  detail(actor:ProgressionActor,id:string) {return this.transaction(actor,tx=>progressionDetail(tx,actor,id),false);}

  async synchronizeCalendar(actor:ProgressionActor,now=new Date()) {
    return this.transaction(actor,async tx=>{
      const calendar=await progressionCalendar(tx,actor.tenantId);
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:calendar.timezone}).format(now);
      const matching=calendar.years.filter(year=>day(year.starts_on)<=today&&day(year.ends_on)>=today&&['draft','active'].includes(year.status));
      if(matching.length!==1) return;
      const year=matching[0];
      const terms=calendar.terms.filter(term=>term.academic_year_id===year.id);
      if(calendarEligibility(year,terms,calendar.years,calendar.timezone,now,true).blocker) return;
      const term=terms.find(row=>day(row.starts_on)<=today&&day(row.ends_on)>=today);
      const changed=await query(tx,`UPDATE academic_years SET is_current=(id=$2),status=CASE WHEN id=$2 THEN 'active' ELSE status END,
        version=version+1,updated_at=NOW() WHERE tenant_id=$1 AND (is_current IS DISTINCT FROM (id=$2) OR (id=$2 AND status='draft')) RETURNING id`,actor.tenantId,year.id);
      const termChanges=await query(tx,`UPDATE academic_terms SET is_current=COALESCE(id=$2,FALSE),
        status=CASE WHEN id=$2 THEN 'active' ELSE status END,version=version+1,updated_at=NOW()
        WHERE tenant_id=$1 AND (is_current IS DISTINCT FROM COALESCE(id=$2,FALSE) OR (id=$2 AND status='draft')) RETURNING id`,actor.tenantId,term?.id??null);
      if(changed.length||termChanges.length) await recordProgressionOperation(tx,this.events,actor,'calendar.current_period',year.id,
        'Current academic period follows the configured school calendar.',{academic_year_id:year.id,academic_term_id:term?.id??null});
    });
  }

  async command(actor:ProgressionActor,command:ProgressionCommand):Promise<ProgressionCommandResult> {
    this.validateCommand(command);
    return this.transaction(actor,async tx=>{
      const fingerprint=digest(command);
      const [existing]=await query(tx,'SELECT * FROM academic_progression_commands WHERE tenant_id=$1 AND request_id=$2',actor.tenantId,command.request_id);
      if(existing) {
        if(existing.fingerprint!==fingerprint) throw new ConflictException('This request ID belongs to a different decision. Refresh before retrying.');
        return {...existing.result,replayed:true};
      }
      await this.validateStudents(tx,actor,command);
      const requiresApproval=await this.approvalRequired(tx,actor,command);
      let result:ProgressionCommandResult;
      if(requiresApproval) {
        const [approval]=await query(tx,`INSERT INTO dashboard_approval_requests(tenant_id,approval_key,requested_by_user_id,approver_role,module,record_id,approval_type,reason,metadata)
          VALUES($1,$2,$3::uuid,'principal','student_progression',$2,$4,$5,$6::jsonb) RETURNING id::text`,actor.tenantId,
        command.request_id,actor.userId,command.action,command.reason,JSON.stringify({title:'Student progression decision',command,href:'/school/principal/student-progression'}));
        await this.notifyLeaders(tx,actor,`progression-approval:${approval.id}`,'Student progression approval required','Review the pending decision in Student Progression & Transitions.',approval.id);
        await recordProgressionOperation(tx,this.events,actor,'approval.requested',approval.id,command.reason,{request_id:command.request_id,student_ids:command.students.map(row=>row.id),action:command.action});
        result={status:'pending_approval',affected:command.students.length,approval_id:approval.id,message:'The decision is awaiting a separate Principal’s approval. Automatic progression is paused for these learners.'};
      } else result=await this.executeCommand(tx,actor,command);
      await query(tx,`INSERT INTO academic_progression_commands(tenant_id,request_id,fingerprint,result,actor_user_id)
        VALUES($1,$2,$3,$4::jsonb,$5::uuid) RETURNING request_id`,actor.tenantId,command.request_id,fingerprint,JSON.stringify(result),actor.userId);
      return result;
    });
  }
  async decideApproval(actor:ProgressionActor,id:string,decision:'approved'|'rejected',reason:string) {
    if(actor.role!=='principal'||!actor.userId) throw new ForbiddenException('A Principal must decide this request.');
    if(!['approved','rejected'].includes(decision)||!reason?.trim()) throw new BadRequestException('Choose a decision and enter a reason.');
    return this.transaction(actor,async tx=>{
      const [approval]=await query(tx,"SELECT * FROM dashboard_approval_requests WHERE tenant_id=$1 AND id::text=$2 AND module='student_progression' FOR UPDATE",actor.tenantId,id);
      if(!approval) throw new NotFoundException('The approval was not found in this school.');
      if(decision==='approved'&&approval.requested_by_user_id===actor.userId) throw new ForbiddenException('A different Principal must approve this decision.');
      if(String(approval.status).toLowerCase()===decision) return {status:'completed',affected:0,message:'This decision is already recorded.',replayed:true};
      if(String(approval.status).toLowerCase()!=='pending') throw new ConflictException('This approval has already been decided.');
      const command=approval.metadata.command as ProgressionCommand;
      let result:ProgressionCommandResult={status:'completed',affected:0,message:'The request was rejected. The learner’s placement is unchanged.'};
      if(decision==='approved') {
        await this.validateStudents(tx,actor,command);
        result=await this.executeCommand(tx,actor,{...command,reason:`${command.reason}\nPrincipal approval: ${reason.trim()}`});
      }
      await query(tx,`UPDATE dashboard_approval_requests SET status=$3,approver_user_id=$4::uuid,decision_note=$5,decided_at=NOW(),updated_at=NOW()
        WHERE tenant_id=$1 AND id::text=$2 RETURNING id`,actor.tenantId,id,decision.toUpperCase(),actor.userId,reason.trim());
      await query(tx,'UPDATE academic_progression_commands SET result=$3::jsonb WHERE tenant_id=$1 AND request_id=$2 RETURNING request_id',actor.tenantId,command.request_id,JSON.stringify(result));
      // A pending approval pauses automation, but its resolution must not leave a permanent hold.
      await query(tx,`UPDATE academic_progression_items item SET status='exception',message='Approval resolved; ready for retry',retry_after=NULL,updated_at=NOW()
        WHERE item.tenant_id=$1 AND item.academic_year_id=$2 AND item.student_id=ANY($3::text[]) AND item.status='held'
          AND NOT EXISTS(SELECT 1 FROM academic_progression_decisions decision WHERE decision.tenant_id=$1
            AND decision.student_id=item.student_id AND decision.academic_year_id=item.academic_year_id AND decision.decision='hold') RETURNING student_id`,
      actor.tenantId,command.academic_year_id,command.students.map(student=>student.id));
      await this.notifyLeaders(tx,actor,`progression-approval:${id}:${decision}`,'Student progression decision reviewed',`The Principal ${decision} a student progression request.`,id);
      await recordProgressionOperation(tx,this.events,actor,`approval.${decision}`,id,reason,{request_id:command.request_id,student_ids:command.students.map(row=>row.id)});
      return result;
    });
  }
  private validateCommand(command:ProgressionCommand) {
    if(!command.request_id?.trim()||command.request_id.length>128||!command.reason?.trim()||command.reason.trim().length>1000||!command.academic_year_id?.trim())
      throw new BadRequestException('A request ID, academic year and reason are required.');
    if(!['hold','repeat','release','promote','place','subjects','reverse','transfer','expel','withdraw','reinstate'].includes(command.action)) throw new BadRequestException('Choose a supported progression action.');
    if(!Array.isArray(command.students)||!command.students.length||command.students.length>100||new Set(command.students.map(row=>row.id)).size!==command.students.length
      ||command.students.some(row=>!row.id||!row.expected_version)) throw new BadRequestException('Select between 1 and 100 learners with current record versions.');
    if(['subjects','reverse'].includes(command.action)&&command.students.length!==1) throw new BadRequestException('Review this action for one learner at a time.');
  }
  private async validateStudents(tx:CohortTx,actor:ProgressionActor,command:ProgressionCommand) {
    const years=await query(tx,'SELECT id FROM academic_years WHERE tenant_id=$1 AND id::text=$2',actor.tenantId,command.academic_year_id);
    if(!years.length) throw new BadRequestException('Choose an academic year from this school.');
    for(const selected of command.students) {
      const current=await readStudentState(tx,actor.tenantId,selected.id,true);
      if(current.version!==selected.expected_version) throw new ConflictException('A learner’s record changed. Refresh the list and review the decision again.');
      if(current.placement && !['reverse','reinstate'].includes(command.action) && current.placement.academic_year_id!==command.academic_year_id
        && !['hold','repeat','release'].includes(command.action)) throw new ConflictException('Select the learner’s current academic year for this action.');
    }
  }
  private async approvalRequired(tx:CohortTx,actor:ProgressionActor,command:ProgressionCommand) {
    const [table]=await query(tx,"SELECT to_regclass('public.approval_rules')::text AS name");
    const rules=table?.name?await query(tx,`SELECT to_jsonb(rule) AS value FROM approval_rules rule
      WHERE (rule.school_id::text=$1 OR rule.school_id::text IN (SELECT id::text FROM schools WHERE slug=$1))
        AND rule.is_active AND lower(rule.module) IN ('academics','students','student_progression')
        AND lower(rule.action)=ANY($2::text[])`,actor.tenantId,[command.action,`student.${command.action}`]):[];
    for(const {value:rule} of rules) {
      if(Array.isArray(rule.requester_roles)&&rule.requester_roles.length&&!rule.requester_roles.map((r:string)=>r.toLowerCase()).includes(actor.role)) throw new ForbiddenException('Your role is not permitted to request this school action.');
      if(String(rule.approval_level).toUpperCase()==='MULTI_LEVEL'||rule.requires_attachment
        ||(Array.isArray(rule.approver_roles)&&rule.approver_roles.length&&!rule.approver_roles.map((role:string)=>role.toLowerCase()).includes('principal')))
        throw new ConflictException('This action has a specialised school approval policy. Resolve it through the existing governance workflow before changing the learner’s record.');
    }
    return command.action==='expel'||rules.some(({value:rule})=>!['NONE','AUTO_APPROVE'].includes(String(rule.approval_level??'SINGLE').toUpperCase()));
  }
  private async executeCommand(tx:CohortTx,actor:ProgressionActor,command:ProgressionCommand):Promise<ProgressionCommandResult> {
    const calendar=await progressionCalendar(tx,actor.tenantId);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:calendar.timezone}).format(new Date());
    for(const selected of command.students) {
      const current=await readStudentState(tx,actor.tenantId,selected.id,true);
      let outcome:string='enrolled'; let reversalOf:string|undefined;
      if(['hold','repeat','release'].includes(command.action)) {
        if(!activeLearner(current.student)) throw new BadRequestException('Only enrolled learners can receive a progression exception.');
        if(current.placement?.academic_year_id!==command.academic_year_id) {
          // A repeat decision after annual promotion keeps the learner in the destination year at the previous grade.
          if(command.action!=='repeat') throw new BadRequestException('Choose the learner’s current year, or reverse their latest promotion first.');
          const [annual]=await query(tx,"SELECT * FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2 AND academic_year_id=$3 AND outcome='promoted' ORDER BY created_at DESC LIMIT 1",actor.tenantId,selected.id,command.academic_year_id);
          const source=annual?.before_state?.assignments?.[0];
          if(!source||current.latest?.id!==annual.id) throw new ConflictException('Review the latest placement before retaining this learner.');
          const template=(await activeClasses(tx,actor.tenantId,command.academic_year_id)).find(row=>String(row.id)===String(source.class_section_id));
          const destinationYear=calendar.years.find(row=>row.id===current.placement.academic_year_id);
          if(!template||!destinationYear) throw new ConflictException('The previous grade or destination year is unavailable.');
          const destination=await prepareDestination(tx,actor,template,destinationYear,source.stream_name??null);
          await placeStudent(tx,actor,current,destination.classId,destination.streamId,{reason:command.reason,today});
        }
        await setDecision(tx,actor,selected.id,command.academic_year_id,command.action==='release'?'eligible':command.action,command.reason);
        outcome=command.action==='hold'?'held':command.action==='repeat'?'repeating':'upcoming';
        await query(tx,"UPDATE academic_progression_items SET status='exception',message='Decision changed; ready for retry',retry_after=NULL,updated_at=NOW() WHERE tenant_id=$1 AND student_id=$2 AND academic_year_id=$3 AND status IN ('held','exception') RETURNING student_id",actor.tenantId,selected.id,command.academic_year_id);
      } else if(['transfer','expel','withdraw'].includes(command.action)) {
        outcome=command.action==='transfer'?'transferred':command.action==='expel'?'expelled':'withdrawn';
        await exitStudent(tx,actor,current,outcome,today);
        if(command.action==='transfer') await query(tx,`INSERT INTO student_transfer_records
          (tenant_id,student_id,application_id,transfer_type,school_name,reason,requested_on,status,notes)
          VALUES($1,$2,$3,'outgoing',$4,$5,$6::date,'approved',$7) RETURNING id`,actor.tenantId,selected.id,current.enrollment?.application_id??null,
        command.destination_school_name?.trim()??'',command.reason,today,`Progression decision ${command.request_id}`);
      } else if(command.action==='subjects') {
        if(!Array.isArray(command.subject_ids)) throw new BadRequestException('Choose the learner’s subjects.');
        await changeSubjects(tx,actor,current,command.subject_ids,today);
      } else if(command.action==='reverse') {
        const [original]=await query(tx,'SELECT * FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2 AND id=$3',actor.tenantId,selected.id,command.transition_id??'');
        if(!original||current.latest?.id!==original.id||digest(original.after_state)!==current.version||!original.before_state.assignments?.[0])
          throw new ConflictException('Only the unchanged latest placement can be reversed. Review the timeline and use a placement correction for later changes.');
        const previous=original.before_state.assignments[0];
        await placeStudent(tx,actor,current,previous.class_section_id,previous.stream_id??null,{reason:command.reason,today,allowInactive:true,restore:true,
          subjectIds:original.before_state.subjects.map((row:Row)=>String(row.subject_id))});
        await setDecision(tx,actor,selected.id,previous.academic_year_id,'hold',`Promotion reversed: ${command.reason}`);
        await query(tx,"UPDATE academic_progression_items SET status='held',message='Promotion reversed; awaiting a staff decision',retry_after=NULL,updated_at=NOW() WHERE tenant_id=$1 AND student_id=$2 AND academic_year_id=$3 RETURNING student_id",actor.tenantId,selected.id,original.academic_year_id);
        outcome='held';reversalOf=original.id;
      } else {
        let targetClass=command.target_class_section_id;
        let targetStream=command.target_stream_id??null;
        if(command.action==='reinstate'&&activeLearner(current.student)) throw new BadRequestException('This learner is already enrolled. Use Change placement.');
        if(command.action==='promote') {
          requireCompleteEnrollment(current);
          const source=(await activeClasses(tx,actor.tenantId,current.placement.academic_year_id)).find(row=>String(row.id)===String(current.placement.class_section_id));
          const sourceYear=calendar.years.find(row=>row.id===current.placement.academic_year_id);
          if(!source||!sourceYear) throw new BadRequestException('Correct the current academic placement before promotion.');
          const plan=await plannedDestination(tx,actor.tenantId,source,sourceYear);
          if(!plan.target) throw new BadRequestException(plan.blocker??'This learner completes their pathway at the end of the academic year.');
          if(!targetClass) {
            const eligibility=calendarEligibility(sourceYear,calendar.terms.filter(term=>term.academic_year_id===sourceYear.id),calendar.years,calendar.timezone);
            if(eligibility.blocker) throw new BadRequestException(eligibility.blocker);
            if(!eligibility.nextYear) throw new BadRequestException('Configure the next academic year and its term dates before promotion.');
            const nextCheck=calendarEligibility(eligibility.nextYear,calendar.terms.filter(term=>term.academic_year_id===eligibility.nextYear!.id),calendar.years,calendar.timezone,new Date(),true);
            if(nextCheck.blocker||nextCheck.due) throw new BadRequestException(nextCheck.blocker??'The destination year has already ended. Review the learner’s history.');
            const prepared=await prepareDestination(tx,actor,plan.target,eligibility.nextYear,current.placement.stream_name??null);
            targetClass=prepared.classId;targetStream=prepared.streamId;
          }
          const destination=await resolvePlacement(tx,actor.tenantId,targetClass,targetStream);
          if(!source||!sourceYear||day(destination.year_starts_on)<=day(sourceYear.starts_on)||destination.curriculum_model!==source.curriculum_model)
            throw new BadRequestException('Promotion requires a later academic year in the learner’s pathway. Use a placement correction for other changes.');
          if(!plan.target||String(plan.target.name).toLowerCase()!==String(destination.name).toLowerCase())
            throw new BadRequestException('Choose the next configured grade for promotion. Use Repeat grade or Change placement for an authorised exception.');
        }
        if(!targetClass) throw new BadRequestException('Choose the destination class and stream.');
        await placeStudent(tx,actor,current,targetClass,targetStream,
          {reason:command.reason,today,allowInactive:command.action==='reinstate',allowRepair:command.action==='place',subjectIds:command.subject_ids});
        if(['reinstate','place'].includes(command.action)) await query(tx,`UPDATE academic_progression_items SET status='exception',
          message='Placement corrected; ready for retry',retry_after=NULL,updated_at=NOW()
          WHERE tenant_id=$1 AND student_id=$2 AND status IN ('excluded','exception') RETURNING student_id`,actor.tenantId,selected.id);
        if(command.action==='promote') {outcome='promoted';await setDecision(tx,actor,selected.id,command.academic_year_id,'eligible',command.reason);}
      }
      const transition=await recordTransition(tx,this.events,actor,current,{yearId:command.academic_year_id,action:command.action,outcome,reason:command.reason,requestId:command.request_id,reversalOf});
      if(outcome==='promoted'||(outcome==='repeating'&&current.placement?.academic_year_id!==command.academic_year_id))
        await this.saveItem(tx,actor,command.academic_year_id,selected.id,outcome,null,transition.id);
    }
    return {status:'completed',affected:command.students.length,message:`${command.students.length} learner${command.students.length===1?'':'s'} updated. The decision and history are saved.`};
  }

  async runYear(actor:ProgressionActor,yearId:string,now=new Date()) {
    const owner=randomUUID();
    const ready=await this.transaction(actor,async tx=>{
      const calendar=await progressionCalendar(tx,actor.tenantId);
      const year=calendar.years.find(row=>row.id===yearId);
      if(!year) throw new NotFoundException('Academic year was not found.');
      const eligibility=calendarEligibility(year,calendar.terms.filter(row=>row.academic_year_id===yearId),calendar.years,calendar.timezone,now);
      await query(tx,'INSERT INTO academic_progression_activation(tenant_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING tenant_id',actor.tenantId);
      const [activation]=await query(tx,'SELECT * FROM academic_progression_activation WHERE tenant_id=$1',actor.tenantId);
      await query(tx,`INSERT INTO academic_progression_runs(tenant_id,academic_year_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`,actor.tenantId,yearId);
      const [run]=await query(tx,'SELECT * FROM academic_progression_runs WHERE tenant_id=$1 AND academic_year_id=$2 FOR UPDATE',actor.tenantId,yearId);
      const activationDay=new Intl.DateTimeFormat('en-CA',{timeZone:calendar.timezone}).format(new Date(activation.activated_at));
      let message=eligibility.blocker;
      if(!message&&actor.system&&day(year.ends_on)<activationDay&&!run.started_at) message='This calendar ended before automation was enabled. Review its records and use Run/Retry once to adopt it safely.';
      if(message||!eligibility.due) {
        await query(tx,'UPDATE academic_progression_runs SET status=$3,message=$4,updated_at=NOW() WHERE tenant_id=$1 AND academic_year_id=$2 RETURNING id',actor.tenantId,yearId,message?'attention':'upcoming',message??'Scheduled for the end of the configured academic year.');
        return {stop:true,run:{...run,status:message?'attention':'upcoming',message},calendar,year,eligibility};
      }
      if(run.lease_until&&new Date(run.lease_until)>new Date()) return {stop:true,run,calendar,year,eligibility};
      await query(tx,`UPDATE academic_progression_runs SET status='running',lease_owner=$3,lease_until=NOW()+INTERVAL '5 minutes',
        started_at=COALESCE(started_at,NOW()),message=NULL,updated_at=NOW() WHERE tenant_id=$1 AND academic_year_id=$2 RETURNING id`,actor.tenantId,yearId,owner);
      return {stop:false,run,calendar,year,eligibility};
    });
    if(ready.stop) return this.publicRun(ready.run);
    try {
      const ids=await this.transaction(actor,tx=>query(tx,`SELECT student.id::text AS id FROM students student WHERE student.tenant_id=$1 AND to_jsonb(student)->>'deleted_at' IS NULL
        AND (EXISTS(SELECT 1 FROM student_class_assignments placement WHERE placement.tenant_id=$1 AND placement.student_id::text=student.id::text AND placement.academic_year_id::text=$2 AND placement.status='active')
          OR EXISTS(SELECT 1 FROM student_academic_enrollments enrollment WHERE enrollment.tenant_id=$1 AND enrollment.student_id::text=student.id::text AND enrollment.status='active'
            AND (enrollment.academic_year_id=$2 OR (enrollment.academic_year_id IS NULL AND enrollment.academic_year=$3))))
        AND NOT EXISTS(SELECT 1 FROM academic_progression_items item WHERE item.tenant_id=$1 AND item.student_id=student.id::text AND item.academic_year_id=$2
          AND (item.status IN ('promoted','repeating','graduated','completed','held','excluded') OR (item.retry_after>NOW() AND $4::boolean)))
        ORDER BY student.id::text LIMIT 100`,actor.tenantId,yearId,ready.year.name,Boolean(actor.system)),false);
      for(const {id} of ids) {
        try {
          await this.transaction(actor,async tx=>{
            const [lease]=await query(tx,`UPDATE academic_progression_runs SET lease_until=NOW()+INTERVAL '5 minutes'
              WHERE tenant_id=$1 AND academic_year_id=$2 AND lease_owner=$3 RETURNING id`,actor.tenantId,yearId,owner);
            if(!lease) return; // A restarted worker owns the run; this worker cannot process stale work.
            // Re-read the calendar and decisions while holding the same school lock as staff mutations.
            const calendar=await progressionCalendar(tx,actor.tenantId);
            const year=calendar.years.find(row=>row.id===yearId);
            if(!year) throw new ConflictException('The academic calendar changed during processing.');
            const eligible=calendarEligibility(year,calendar.terms.filter(row=>row.academic_year_id===yearId),calendar.years,calendar.timezone,now);
            if(!eligible.due||eligible.blocker) throw new ConflictException(eligible.blocker??'The academic year has not ended.');
            const current=await readStudentState(tx,actor.tenantId,id,true);
            const decision=current.state.decisions.find(row=>row.academic_year_id===yearId)?.decision;
            if(!activeLearner(current.student)) {await this.saveItem(tx,actor,yearId,id,'excluded','The learner is not currently enrolled.');return;}
            if(day(current.student.admission_date)>day(year.ends_on)) throw new BadRequestException('This learner was admitted after the source year ended. Correct their admission-year placement before progression.');
            const pending=await query(tx,`SELECT id FROM dashboard_approval_requests WHERE tenant_id=$1 AND module='student_progression' AND status='PENDING'
              AND metadata->'command'->'students' @> $2::jsonb LIMIT 1`,actor.tenantId,JSON.stringify([{id}]));
            if(decision==='hold'||pending.length) {await this.saveItem(tx,actor,yearId,id,'held',pending.length?'A Principal decision is pending.':'An authorised hold is in place.');return;}
            requireCompleteEnrollment(current);
            if(current.placement.academic_year_id!==yearId) return;
            const source=(await activeClasses(tx,actor.tenantId,yearId)).find(row=>String(row.id)===String(current.placement.class_section_id));
            if(!source) throw new BadRequestException('The source class is inactive or incomplete.');
            const plan=await plannedDestination(tx,actor.tenantId,source,year,decision==='repeat');
            if(plan.blocker) throw new BadRequestException(plan.blocker);
            let outcome:string;
            if(plan.completion) {outcome=plan.completion;await exitStudent(tx,actor,current,outcome,day(year.ends_on));}
            else {
              if(!eligible.nextYear) throw new BadRequestException('Configure the next academic year and term dates. MyShule will prepare its classes automatically.');
              if(!calendar.terms.some(row=>row.academic_year_id===eligible.nextYear!.id)) throw new BadRequestException('Configure the next academic year’s term dates before progression.');
              const nextCheck=calendarEligibility(eligible.nextYear,calendar.terms.filter(row=>row.academic_year_id===eligible.nextYear!.id),calendar.years,calendar.timezone,now,true);
              if(nextCheck.blocker) throw new BadRequestException(nextCheck.blocker);
              if(day(eligible.nextYear.ends_on)<eligible.today) throw new BadRequestException('The destination year has already ended. Review this learner’s missing academic history.');
              const destination=await prepareDestination(tx,actor,plan.target!,eligible.nextYear,current.placement.stream_name??null);
              await placeStudent(tx,actor,current,destination.classId,destination.streamId,{reason:'Automatic academic year transition',today:eligible.today});
              outcome=decision==='repeat'?'repeating':'promoted';
            }
            const transition=await recordTransition(tx,this.events,actor,current,{yearId,action:'annual',outcome,reason:'Automatic academic year transition',requestId:`annual:${yearId}:${id}:${current.placement.id}`});
            await this.saveItem(tx,actor,yearId,id,outcome,null,transition.id);
          });
        } catch(error) {
          this.logger.warn(`Progression exception school=${actor.tenantId} year=${yearId} student=${id}: ${error instanceof Error?error.message:'Transition failed'}`);
          await this.transaction(actor,tx=>this.saveItem(tx,actor,yearId,id,'exception',error instanceof Error?error.message:'Transition failed. Retry is available.'));
        }
      }
      return await this.transaction(actor,async tx=>{
        const counts=Object.fromEntries((await query(tx,'SELECT status,COUNT(*)::int AS count FROM academic_progression_items WHERE tenant_id=$1 AND academic_year_id=$2 GROUP BY status',actor.tenantId,yearId)).map(row=>[row.status,row.count]));
        const status=ids.length===100?'running':counts.exception||counts.held?'attention':'completed';
        const message=status==='completed'?'The academic transition is complete.':status==='running'?'Processing continues automatically.':'Review the held learners and exceptions. Other eligible learners have been processed.';
        const [run]=await query(tx,`UPDATE academic_progression_runs SET status=$4,counts=$5::jsonb,message=$6,lease_owner=NULL,lease_until=NULL,
          completed_at=CASE WHEN $4='completed' THEN NOW() ELSE NULL END,updated_at=NOW()
          WHERE tenant_id=$1 AND academic_year_id=$2 AND lease_owner=$3 RETURNING *`,actor.tenantId,yearId,owner,status,JSON.stringify(counts),message);
        await query(tx,'UPDATE academic_progression_activation SET last_checked_at=NOW(),last_error=NULL WHERE tenant_id=$1 RETURNING tenant_id',actor.tenantId);
        if(run&&status!=='running'&&digest(ready.run.counts)!==digest(counts)) {
          await this.notifyLeaders(tx,actor,`progression-run:${run.id}:${digest(counts)}`,'Academic year transition update',message,run.id);
          await recordProgressionOperation(tx,this.events,actor,'annual_run.updated',run.id,message,{academic_year_id:yearId,status,counts});
        }
        return this.publicRun(run??ready.run);
      });
    } catch(error) {
      await this.transaction(actor,tx=>query(tx,"UPDATE academic_progression_runs SET status='failed',message=$4,lease_owner=NULL,lease_until=NULL,updated_at=NOW() WHERE tenant_id=$1 AND academic_year_id=$2 AND lease_owner=$3 RETURNING id",actor.tenantId,yearId,owner,error instanceof Error?error.message:'Processing failed.'));
      throw error;
    }
  }
  private async saveItem(tx:CohortTx,actor:ProgressionActor,yearId:string,id:string,status:string,message:string|null,transitionId:string|null=null) {
    await query(tx,`INSERT INTO academic_progression_items(tenant_id,academic_year_id,student_id,status,message,transition_id,attempts,retry_after)
      VALUES($1,$2,$3,$4,$5,$6,1,CASE WHEN $4='exception' THEN NOW()+INTERVAL '5 minutes' ELSE NULL END)
      ON CONFLICT(tenant_id,academic_year_id,student_id) DO UPDATE SET status=EXCLUDED.status,message=EXCLUDED.message,transition_id=COALESCE(EXCLUDED.transition_id,academic_progression_items.transition_id),
        attempts=academic_progression_items.attempts+1,retry_after=EXCLUDED.retry_after,updated_at=NOW() RETURNING student_id`,actor.tenantId,yearId,id,status,message,transitionId);
  }
  private publicRun(run:Row) {const c=run.counts??{};return {...run,processed:Object.values(c).reduce((a:number,b)=>a+Number(b),0),promoted:c.promoted??0,repeated:c.repeating??0,graduated:(c.graduated??0)+(c.completed??0),held:c.held??0,exceptions:c.exception??0};}
  private async notifyLeaders(tx:CohortTx,actor:ProgressionActor,key:string,title:string,body:string,recordId:string) {
    await query(tx,`INSERT INTO notifications(tenant_id,notification_key,recipient_user_id,type,title,body,priority,source_module,source_record_id,metadata)
      SELECT $1,$2||':'||member.user_id::text,member.user_id,'academic_progression',$3,$4,'normal','academics',$5,
        jsonb_build_object('href','/school/'||CASE role.code WHEN 'deputy_principal' THEN 'deputy-principal' WHEN 'dean_academics' THEN 'dean-academics' ELSE role.code END||'/student-progression')
      FROM tenant_memberships member JOIN roles role ON role.tenant_id=member.tenant_id AND role.id=member.role_id
      WHERE member.tenant_id=$1 AND member.status='active' AND role.code IN ('principal','deputy_principal','dean_academics')
      ON CONFLICT(tenant_id,notification_key) DO NOTHING RETURNING id`,actor.tenantId,key,title,body,recordId);
  }
}
