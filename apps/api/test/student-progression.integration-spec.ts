import { randomUUID } from 'node:crypto';
import type { ProgressionAction, ProgressionCommand } from '../../../shared/student-progression';
import { ProgressionEngine } from '../src/modules/student-progression/student-progression.service';
import { StudentProgressionFixture } from './support/student-progression-fixture';
import { StudentProgressionRuntime } from '../src/modules/student-progression/student-progression.runtime';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { CohortPromotionService } from '../src/modules/admissions/cohort-promotion.service';

jest.setTimeout(120_000);

describe('Automatic student progression in PostgreSQL',()=>{
  const fixture=new StudentProgressionFixture();
  let engine: ProgressionEngine;
  beforeAll(async()=>{await fixture.start();engine=new ProgressionEngine(fixture.prisma as never,fixture.events as never);});
  beforeEach(()=>fixture.reset());
  afterAll(()=>fixture.close());
  const year=()=>`${fixture.school}-2026`;
  const actor=()=>fixture.actor();
  const detail=(id:string)=>engine.detail(actor(),id);
  const request=async(id:string,action:ProgressionAction,extra:Partial<ProgressionCommand>={}):Promise<ProgressionCommand>=>({
    request_id:randomUUID(),academic_year_id:year(),action,reason:`Reviewed ${action} decision`,
    students:[{id,expected_version:(await detail(id)).student.version}],...extra,
  });
  const current=(id:string)=>fixture.q(`SELECT assignment.*,section.name AS class_name,stream.name AS stream_name
    FROM student_class_assignments assignment JOIN class_sections section ON section.tenant_id=assignment.tenant_id AND section.id=assignment.class_section_id
    LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id=assignment.stream_id
    WHERE assignment.tenant_id=$1 AND assignment.student_id=$2 AND assignment.status='active'`,[fixture.school,id]);
  const history=(id:string)=>fixture.q('SELECT * FROM progression_fixture_history WHERE student_id=$1 ORDER BY id',[id]);

  it('waits for the entire final local day and does not close the calendar',async()=>{
    const student=await fixture.seed();
    await fixture.configureClass(8);
    await engine.runYear(actor(),year(),new Date('2026-12-31T20:59:59Z'));
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    await engine.runYear(actor(),year(),new Date('2026-12-31T21:00:00Z'));
    expect((await current(student.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    expect((await fixture.q('SELECT status FROM academic_years WHERE id=$1',[year()]))[0].status).toBe('active');
  });

  it('prepares destination structures and moves multiple grades and streams without mixing CBC and 8-4-4',async()=>{
    const east=await fixture.seed(7,'East');const west=await fixture.seed(7,'West');const legacy=await fixture.seed(2,'East','8-4-4');
    await fixture.configureClass(8,'East');await fixture.configureClass(8,'West');await fixture.configureClass(3,'East','8-4-4');
    const before=await history(east.id);
    const relatedBefore=await fixture.relatedRecords(east.id);
    await engine.runYear(actor(),year(),fixture.due);
    for(const [student,className,streamName,model] of [[east,'Grade 8','East','CBC'],[west,'Grade 8','West','CBC'],[legacy,'Form 3','East','8-4-4']] as const){
      const [placement]=await current(student.id);
      expect(placement).toMatchObject({class_name:className,stream_name:streamName,academic_year_id:`${fixture.school}-2027`});
      const [section]=await fixture.q('SELECT curriculum_model FROM class_sections WHERE id=$1',[placement.class_section_id]);
      expect(section.curriculum_model).toBe(model);
      const [allocation]=await fixture.q('SELECT * FROM student_allocations WHERE tenant_id=$1 AND student_id=$2 AND is_current',[fixture.school,student.id]);
      expect(allocation).toMatchObject({class_name:className,stream_name:streamName,dormitory_name:'Dorm A',transport_route:'Route A'});
      const [record]=await fixture.q('SELECT status,student_status,current_class_id,current_stream_id,admission_number FROM students WHERE id=$1',[student.id]);
      expect(record).toMatchObject({status:'active',student_status:'ACTIVE',current_class_id:placement.class_section_id,current_stream_id:placement.stream_id,admission_number:student.admission_number});
      expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND status='active'",[student.id])).toHaveLength(1);
    }
    expect(await history(east.id)).toEqual(before);
    expect(await fixture.relatedRecords(east.id)).toEqual(relatedBefore);
    const [destination]=await current(east.id);
    const teachers=await fixture.q("SELECT teacher_user_id FROM teacher_subject_assignments WHERE cohort_placement_id=$1 AND status='active'",[destination.cohort_placement_id]);
    expect(teachers).toEqual([{teacher_user_id:fixture.otherTeacher}]);
    const activeSubjects=await fixture.q("SELECT subject_id FROM student_subject_enrollments WHERE student_id=$1 AND status='active' ORDER BY subject_id",[east.id]);
    expect(activeSubjects.map(row=>row.subject_id)).toEqual([`${fixture.school}-english`,`${fixture.school}-math`]);
    expect(await fixture.q('SELECT id FROM academic_audit_logs WHERE tenant_id=$1',[fixture.school])).not.toHaveLength(0);
    expect(await fixture.q('SELECT id FROM progression_fixture_events')).not.toHaveLength(0);
  });

  it('graduates Form 4 and Grade 12 only at the end of their final year',async()=>{
    const form4=await fixture.seed(4,'East','8-4-4');const grade12=await fixture.seed(12);
    await engine.runYear(actor(),year(),new Date('2026-07-01T12:00:00Z'));
    expect((await current(form4.id))).toHaveLength(1);expect((await current(grade12.id))).toHaveLength(1);
    const originals=await fixture.q('SELECT * FROM progression_fixture_history ORDER BY id');
    await engine.runYear(actor(),year(),fixture.due);
    for(const student of [form4,grade12]){
      const [record]=await fixture.q('SELECT status,student_status FROM students WHERE id=$1',[student.id]);
      expect(record).toMatchObject({status:'graduated',student_status:'GRADUATED'});
      expect(await current(student.id)).toHaveLength(0);
      expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND status='active'",[student.id])).toHaveLength(0);
    }
    expect(await fixture.q("SELECT id FROM class_sections WHERE name IN('Form 5','Grade 13')")).toHaveLength(0);
    expect(await fixture.q('SELECT * FROM progression_fixture_history ORDER BY id')).toEqual(originals);
  });

  it('holds one learner, repeats a final-year learner and promotes everyone else',async()=>{
    const held=await fixture.seed();const ordinary=await fixture.seed();const repeater=await fixture.seed(12);
    await fixture.configureClass(8);
    await engine.command(actor(),await request(held.id,'hold'));
    await engine.command(actor(),await request(repeater.id,'repeat'));
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(held.id))[0]).toMatchObject({class_name:'Grade 7',academic_year_id:year()});
    expect((await current(ordinary.id))[0]).toMatchObject({class_name:'Grade 8',academic_year_id:`${fixture.school}-2027`});
    expect((await current(repeater.id))[0]).toMatchObject({class_name:'Grade 12',academic_year_id:`${fixture.school}-2027`});
    expect((await detail(repeater.id)).student.student_status).toBe('active');
    await engine.command(actor(),await request(held.id,'release'));
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(held.id))[0].class_name).toBe('Grade 8');
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[ordinary.id])).toHaveLength(1);
  });

  it('reverses a promotion without deleting destination history and permits a corrected promotion',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.runYear(actor(),year(),fixture.due);
    const target=(await current(student.id))[0];
    const originalHistory=await history(student.id);
    const [targetEnrollment]=await fixture.q("SELECT * FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id]);
    const promoted=await detail(student.id);
    const transition=promoted.timeline.find((item:any)=>item.reversible);
    expect(transition).toBeDefined();
    await engine.command(actor(),await request(student.id,'reverse',{transition_id:transition!.id}));
    expect((await current(student.id))[0].class_name).toBe('Grade 7');
    expect(await fixture.q('SELECT id FROM student_academic_enrollments WHERE id=$1',[targetEnrollment.id])).toHaveLength(1);
    expect(await history(student.id)).toEqual(originalHistory);
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].class_name).toBe('Grade 7');
    await engine.command(actor(),await request(student.id,'promote',{target_class_section_id:target.class_section_id,target_stream_id:target.stream_id}));
    expect((await current(student.id))[0].class_name).toBe('Grade 8');
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(1);
  });

  it('never advances exited or suspended learners even when legacy status fields disagree',async()=>{
    const transferred=await fixture.seed();const withdrawn=await fixture.seed();const suspended=await fixture.seed();
    await fixture.configureClass(8);
    await fixture.q("UPDATE students SET status='transferred',student_status='TRANSFERRED_OUT' WHERE id=$1",[transferred.id]);
    await fixture.q("UPDATE students SET status='expelled',student_status='WITHDRAWN',metadata=$2::jsonb WHERE id=$1",[withdrawn.id,JSON.stringify({progression_exit_type:'expelled'})]);
    await fixture.q("UPDATE students SET status='active',student_status='SUSPENDED' WHERE id=$1",[suspended.id]);
    await engine.runYear(actor(),year(),fixture.due);
    for(const student of [transferred,withdrawn,suspended]) expect((await current(student.id))[0].academic_year_id).toBe(year());
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE academic_year='2027'")).toHaveLength(0);
  });

  it('changes a stream and optional subjects mid-year while retaining every old membership row',async()=>{
    const student=await fixture.seed();await fixture.configureClass(7,'West');
    const oldMemberships=await fixture.q('SELECT * FROM student_subject_enrollments WHERE student_id=$1 ORDER BY id',[student.id]);
    const oldHistory=await history(student.id);
    await engine.command(actor(),await request(student.id,'place',{target_class_section_id:fixture.classId(7),target_stream_id:fixture.streamId(7,'West')}));
    await engine.command(actor(),await request(student.id,'subjects',{subject_ids:[`${fixture.school}-math`,`${fixture.school}-art`]}));
    expect((await current(student.id))[0].stream_name).toBe('West');
    for(const old of oldMemberships){
      const [saved]=await fixture.q('SELECT * FROM student_subject_enrollments WHERE id=$1',[old.id]);
      expect(saved).toMatchObject({subject_id:old.subject_id,class_section_id:old.class_section_id,stream_id:old.stream_id,academic_year_id:old.academic_year_id});
      expect(saved.status).not.toBe('active');
    }
    expect((await fixture.q("SELECT subject_id FROM student_subject_enrollments WHERE student_id=$1 AND status='active' ORDER BY subject_id",[student.id])).map(row=>row.subject_id))
      .toEqual([`${fixture.school}-art`,`${fixture.school}-math`]);
    expect(await history(student.id)).toEqual(oldHistory);
    await expect(engine.command(actor(),await request(student.id,'subjects',{subject_ids:[`${fixture.school}-art`]}))).rejects.toThrow();
  });

  it('isolates another school’s learners, destinations, subjects and history under forced RLS',async()=>{
    const student=await fixture.seed();const foreign=await fixture.seed(7,'East','CBC',fixture.foreignSchool);
    await expect(engine.detail(actor(),foreign.id)).rejects.toThrow();
    await expect(engine.command(actor(),{...await request(student.id,'hold'),students:[{id:foreign.id,expected_version:'forged'}]})).rejects.toThrow();
    await expect(engine.command(actor(),await request(student.id,'place',{target_class_section_id:fixture.classId(8,'CBC',2026,fixture.foreignSchool),target_stream_id:fixture.streamId(8,'East','CBC',2026,fixture.foreignSchool)}))).rejects.toThrow();
    await expect(engine.command(actor(),await request(student.id,'subjects',{subject_ids:[`${fixture.foreignSchool}-math`]}))).rejects.toThrow();
    const scoped=await fixture.transaction(fixture.school,tx=>tx.$queryRawUnsafe('SELECT id FROM students WHERE id=$1',foreign.id));
    expect(scoped).toEqual([]);
    expect((await fixture.q('SELECT status FROM students WHERE id=$1',[foreign.id]))[0].status).toBe('active');
  });

  it('rejects unauthorized management and stale decisions, and safely replays simultaneous identical commands',async()=>{
    const student=await fixture.seed();const command=await request(student.id,'hold');
    await expect(engine.command({...actor(),role:'teacher'},command)).rejects.toThrow();
    await expect(engine.command({...actor(),permissions:['academics:read']},command)).rejects.toThrow();
    const results=await Promise.all([engine.command(actor(),command),engine.command(actor(),command)]);
    expect(results.filter((result:any)=>result.replayed)).toHaveLength(1);
    await expect(engine.command(actor(),{...command,request_id:randomUUID(),action:'release'})).rejects.toThrow();
    expect((await detail(student.id)).student.status).toBe('held');
  });

  it('rolls back placement when the transactional event fails and resumes without duplicate enrolments',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    const historyBefore=await history(student.id);
    fixture.failEvent=true;
    await engine.runYear(actor(),year(),fixture.due).catch(()=>undefined);
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(0);
    fixture.failEvent=false;
    await Promise.all([engine.runYear(actor(),year(),fixture.due),engine.runYear(actor(),year(),fixture.due)]);
    expect((await current(student.id))[0].class_name).toBe('Grade 8');
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(1);
    expect(await history(student.id)).toEqual(historyBefore);
  });

  it('keeps incomplete enrolments and ambiguous destination gaps visible without blocking valid peers',async()=>{
    const incomplete=await fixture.seed();const valid=await fixture.seed();const gap=await fixture.seed(9);
    await fixture.configureClass(8);
    await fixture.q('DELETE FROM student_academic_enrollments WHERE student_id=$1',[incomplete.id]);
    await fixture.q("UPDATE class_sections SET status='inactive',is_active=false WHERE tenant_id=$1 AND name='Grade 10'",[fixture.school]);
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(incomplete.id))[0].academic_year_id).toBe(year());
    expect((await current(gap.id))[0].academic_year_id).toBe(year());
    expect((await current(valid.id))[0].class_name).toBe('Grade 8');
    const overview=await engine.overview(actor(),{academic_year_id:year(),limit:100});
    expect(overview.counts.exception).toBeGreaterThanOrEqual(2);
  });

  it('uses each school’s timezone independently when calendars end on the same date',async()=>{
    const local=await fixture.seed();const foreign=await fixture.seed(7,'East','CBC',fixture.foreignSchool);
    await fixture.configureClass(8);await fixture.configureClass(8,'East','CBC',2026,fixture.foreignSchool);
    await fixture.q("UPDATE school_settings SET timezone='America/New_York' WHERE school_id=$1",[fixture.foreignSchool]);
    const instant=new Date('2027-01-01T01:00:00Z');
    await Promise.all([engine.runYear(actor(),year(),instant),engine.runYear(fixture.actor(fixture.foreignSchool),`${fixture.foreignSchool}-2026`,instant)]);
    expect((await current(local.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    const foreignPlacements=await fixture.q("SELECT academic_year_id FROM student_class_assignments WHERE tenant_id=$1 AND student_id=$2 AND status='active'",[fixture.foreignSchool,foreign.id]);
    expect(foreignPlacements).toEqual([{academic_year_id:`${fixture.foreignSchool}-2026`}]);
    await engine.runYear(fixture.actor(fixture.foreignSchool),`${fixture.foreignSchool}-2026`,new Date('2027-01-01T05:00:00Z'));
    expect(await fixture.q("SELECT academic_year_id FROM student_class_assignments WHERE tenant_id=$1 AND student_id=$2 AND status='active'",[fixture.foreignSchool,foreign.id]))
      .toEqual([{academic_year_id:`${fixture.foreignSchool}-2027`}]);
  });

  it('blocks overlapping source terms and missing destination terms without moving learners',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    const [term]=await fixture.q(`INSERT INTO academic_terms(tenant_id,academic_year_id,name,starts_on,ends_on,status)
      VALUES($1,$2,'Overlapping term','2026-09-01','2026-12-01','active') RETURNING id`,[fixture.school,year()]);
    expect(await engine.runYear(actor(),year(),fixture.due)).toMatchObject({status:'attention'});
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    await fixture.q('DELETE FROM academic_terms WHERE id=$1',[term.id]);
    await fixture.q('DELETE FROM academic_terms WHERE academic_year_id=$1',[`${fixture.school}-2027`]);
    expect(await engine.runYear(actor(),year(),fixture.due)).toMatchObject({status:'attention'});
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE student_id=$1',[student.id])).toHaveLength(0);
  });

  it('corrects an already promoted learner to repeat while preserving the next-year enrollment identity',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.runYear(actor(),year(),fixture.due);
    const [enrollment]=await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND status='active'",[student.id]);
    await engine.command(actor(),await request(student.id,'repeat'));
    expect((await current(student.id))[0]).toMatchObject({class_name:'Grade 7',academic_year_id:`${fixture.school}-2027`});
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND status='active'",[student.id])).toEqual([{id:enrollment.id}]);
    expect((await detail(student.id)).student.status).toBe('repeating');
  });

  it('transfers and reinstates a learner with history and one canonical annual enrollment intact',async()=>{
    const student=await fixture.seed();const before=await fixture.relatedRecords(student.id);
    await engine.command(actor(),await request(student.id,'transfer',{destination_school_name:'Receiving school'}));
    expect(await fixture.q('SELECT student_id,school_name,status FROM student_transfer_records WHERE tenant_id=$1',[fixture.school]))
      .toEqual([{student_id:student.id,school_name:'Receiving school',status:'approved'}]);
    expect((await detail(student.id)).student.student_status).toBe('transferred');
    expect(await current(student.id)).toHaveLength(0);
    expect(await fixture.q("SELECT id FROM student_allocations WHERE student_id=$1 AND is_current",[student.id])).toHaveLength(0);
    await engine.command(actor(),await request(student.id,'reinstate',{target_class_section_id:fixture.classId(7),target_stream_id:fixture.streamId(7)}));
    expect((await current(student.id))[0].class_name).toBe('Grade 7');
    expect(await fixture.q('SELECT id FROM student_academic_enrollments WHERE student_id=$1',[student.id])).toEqual([{id:student.enrollment.id}]);
    expect(await fixture.relatedRecords(student.id)).toEqual(before);
    expect((await detail(student.id)).timeline.map((row:any)=>row.action)).toEqual(expect.arrayContaining(['transfer','reinstate']));
  });

  it('requires an independent Principal for expulsion and pauses only the pending learner',async()=>{
    const student=await fixture.seed();const peer=await fixture.seed();await fixture.configureClass(8);
    const pending=await engine.command(actor(),await request(student.id,'expel'));
    expect(pending.status).toBe('pending_approval');
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    expect((await current(peer.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    await expect(engine.decideApproval({...actor(),role:'principal'},pending.approval_id!,'approved','Review complete')).rejects.toThrow();
    const principal={...actor(),userId:fixture.principal,role:'principal'};
    await engine.decideApproval(principal,pending.approval_id!,'approved','Review complete');
    expect((await fixture.q('SELECT status,student_status FROM students WHERE id=$1',[student.id]))[0]).toEqual({status:'expelled',student_status:'WITHDRAWN'});
    expect(await current(student.id)).toHaveLength(0);
    expect((await fixture.q('SELECT status,approver_user_id,decision_note FROM dashboard_approval_requests WHERE id=$1',[pending.approval_id]))[0])
      .toMatchObject({status:'APPROVED',approver_user_id:fixture.principal,decision_note:'Review complete'});
  });

  it('releases the automatic hold after the Principal rejects a pending exit',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    const pending=await engine.command(actor(),await request(student.id,'expel'));
    await engine.runYear(actor(),year(),fixture.due);
    await engine.decideApproval({...actor(),userId:fixture.principal,role:'principal'},pending.approval_id!,'rejected','Learner remains enrolled');
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    expect((await fixture.q('SELECT status FROM students WHERE id=$1',[student.id]))[0].status).toBe('active');
  });

  it('rejects an entire selected group when any learner changed concurrently',async()=>{
    const first=await fixture.seed();const second=await fixture.seed();
    const command=await request(first.id,'hold',{students:[
      {id:first.id,expected_version:(await detail(first.id)).student.version},
      {id:second.id,expected_version:(await detail(second.id)).student.version},
    ]});
    await engine.command(actor(),await request(second.id,'repeat'));
    await expect(engine.command(actor(),command)).rejects.toThrow();
    expect((await detail(first.id)).student.status).toBe('upcoming');
    expect((await detail(second.id)).student.status).toBe('repeating');
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE student_id=$1',[first.id])).toHaveLength(0);
  });

  it('uses a complete scheduled calendar and activates current periods on their actual dates without closing old years',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await fixture.q("UPDATE academic_years SET status='draft' WHERE id=$1",[`${fixture.school}-2027`]);
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    await engine.synchronizeCalendar(actor(),new Date('2027-01-11T12:00:00Z'));
    expect(await fixture.q('SELECT name FROM academic_years WHERE tenant_id=$1 AND is_current',[fixture.school])).toEqual([{name:'2027'}]);
    expect(await fixture.q('SELECT academic_year_id FROM academic_terms WHERE tenant_id=$1 AND is_current',[fixture.school])).toEqual([{academic_year_id:`${fixture.school}-2027`}]);
    expect((await fixture.q('SELECT status FROM academic_years WHERE id=$1',[year()]))[0].status).toBe('active');
    await engine.synchronizeCalendar(actor(),new Date('2027-12-01T12:00:00Z'));
    expect(await fixture.q('SELECT id FROM academic_terms WHERE tenant_id=$1 AND is_current',[fixture.school])).toHaveLength(0);
  });

  it('completes the institution’s declared final stage without inventing a school transfer',async()=>{
    const student=await fixture.seed(9);
    await fixture.q("UPDATE schools SET school_type='JUNIOR_SECONDARY' WHERE id=$1",[fixture.school]);
    await engine.runYear(actor(),year(),fixture.due);
    expect((await detail(student.id)).student.status).toBe('completed');
    expect(await current(student.id)).toHaveLength(0);
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(0);
  });

  it('does not silently catch up calendars which ended before automatic processing was activated',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await fixture.q("INSERT INTO academic_progression_activation(tenant_id,activated_at) VALUES($1,'2027-02-01')",[fixture.school]);
    const system={tenantId:fixture.school,userId:null,role:'system',permissions:[],system:true};
    expect(await engine.runYear(system,year(),fixture.due)).toMatchObject({status:'attention'});
    expect((await current(student.id))[0].academic_year_id).toBe(year());
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
  });

  it('runs the real periodic entry point per enabled school and emits transactional calendar events',async()=>{
    // Production onboarding populates tenants without populating the legacy Prisma schools table.
    await fixture.q('DELETE FROM schools');
    const student=await fixture.seed();const foreign=await fixture.seed(7,'East','CBC',fixture.foreignSchool);
    await fixture.configureClass(8);
    const context=new RequestContextService();
    const runtime=new StudentProgressionRuntime({...fixture.prisma,query:async(sql:string,values:any[])=>({
      rows:await fixture.transaction('',async tx=>{
        await tx.$queryRawUnsafe("SELECT set_config('app.role',$1,true)",context.requireStore().role);
        return tx.$queryRawUnsafe(sql,...values);
      })})} as never,
      engine,context,{findFirstMissingModule:async(tenant:string)=>tenant===fixture.foreignSchool?'academics':null} as never);
    await runtime.tick(fixture.due);
    expect((await current(student.id))[0].academic_year_id).toBe(`${fixture.school}-2027`);
    expect((await fixture.q("SELECT academic_year_id FROM student_class_assignments WHERE student_id=$1 AND status='active'",[foreign.id]))[0].academic_year_id).toBe(`${fixture.foreignSchool}-2026`);
    runtime.onModuleDestroy();
  });

  it('uses canonical tenant timezone and institution settings without legacy school records',async()=>{
    await fixture.q('DELETE FROM schools');
    await fixture.q(`UPDATE tenants SET settings='{"timezone":"America/New_York","institution_category":"junior_school"}' WHERE tenant_id=$1`,[fixture.school]);
    const student=await fixture.seed(9);
    expect((await engine.overview(actor())).timezone).toBe('America/New_York');
    await engine.runYear(actor(),year(),new Date('2027-01-01T02:00:00Z'));
    expect(await current(student.id)).toHaveLength(1);
    await engine.runYear(actor(),year(),fixture.due);
    expect((await detail(student.id)).student.status).toBe('completed');
  });

  it('keeps promoted learners searchable by their historical class and stream',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.runYear(actor(),year(),fixture.due);
    const overview=await engine.overview(actor(),{academic_year_id:year(),class_section_id:fixture.classId(7),stream_id:fixture.streamId(7),status:'promoted'});
    expect(overview.total).toBe(1);
    expect(overview.students[0].id).toBe(student.id);
    expect(overview.students[0].class_name).toBe('Grade 8');
    await fixture.q("UPDATE academic_years SET status='archived',archived_at=NOW() WHERE id=$1",[year()]);
    const historical=await engine.overview(actor(),{academic_year_id:year(),class_section_id:fixture.classId(7)});
    expect(historical.total).toBe(1);
    expect(historical.years.some(row=>row.id===year())).toBe(true);
  });

  it('enforces canonical tenant approval rules even without legacy school rows',async()=>{
    await fixture.q('DELETE FROM schools');
    const student=await fixture.seed();
    await fixture.q("INSERT INTO approval_rules(school_id,module,action,requester_roles,approver_roles) VALUES($1,'students','transfer',ARRAY['deputy_principal'],ARRAY['principal'])",[fixture.school]);
    expect(await engine.command(actor(),await request(student.id,'transfer'))).toMatchObject({status:'pending_approval'});
    expect(await current(student.id)).toHaveLength(1);
  });

  it('shows approval names and consistent filtered progression counts',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.command(actor(),await request(student.id,'expel'));
    const waiting=await engine.overview({...actor(),role:'principal'},{academic_year_id:year(),status:'held'});
    expect(waiting.total).toBe(1);expect(waiting.students[0].status).toBe('held');
    expect(waiting.approvals[0].summary).toContain(student.admission_number);
    expect(waiting.approvals[0].requested_by).toBe('Deputy');
  });

  it('keeps retained learners out of the existing cohort-promotion path',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.command(actor(),await request(student.id,'hold'));
    await fixture.addClass(fixture.school,2027,8);
    const placement=(await current(student.id))[0];
    const [cohort]=await fixture.q('SELECT version FROM academic_cohort_placements WHERE id=$1',[placement.cohort_placement_id]);
    const legacy=new CohortPromotionService(fixture.prisma as never,fixture.events as never);
    await expect(legacy.promoteSingle(actor(),student.id,{action:'promotion',request_id:randomUUID(),reason:'Legacy attempt',
      source_placement_id:placement.cohort_placement_id,expected_version:cohort.version,
      target_class_section_id:fixture.classId(8,'CBC',2027),target_stream_id:fixture.streamId(8,'East','CBC',2027)})).rejects.toThrow();
    expect((await current(student.id))[0].academic_year_id).toBe(year());
  });

  it('resumes automatic processing after an audited reversal and release',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await engine.runYear(actor(),year(),fixture.due);
    await engine.command(actor(),await request(student.id,'reverse',{transition_id:(await detail(student.id)).timeline[0].id}));
    await engine.command(actor(),await request(student.id,'release'));
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].class_name).toBe('Grade 8');
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(1);
  });

  it('prepares an individual manual promotion from the existing pathway without destination mapping',async()=>{
    const student=await fixture.seed(7,'West');await fixture.configureClass(8,'West');
    await fixture.q("UPDATE academic_years SET status='draft' WHERE tenant_id=$1 AND name='2027'",[fixture.school]);
    await engine.command(actor(),await request(student.id,'promote'));
    expect((await current(student.id))[0]).toMatchObject({class_name:'Grade 8',stream_name:'West',academic_year_id:`${fixture.school}-2027`});
    expect((await fixture.q('SELECT is_current,status FROM academic_years WHERE id=$1',[year()]))[0]).toMatchObject({status:'active',is_current:true});
    expect(await fixture.q("SELECT id FROM student_academic_enrollments WHERE student_id=$1 AND academic_year='2027'",[student.id])).toHaveLength(1);
  });

  it('repairs an incomplete placement using its existing admission and resumes promotion',async()=>{
    const student=await fixture.seed();await fixture.configureClass(8);
    await fixture.q("UPDATE student_academic_enrollments SET status='completed' WHERE student_id=$1",[student.id]);
    await engine.runYear(actor(),year(),fixture.due);
    await engine.command(actor(),await request(student.id,'place',{target_class_section_id:fixture.classId(7),target_stream_id:fixture.streamId(7)}));
    await engine.runYear(actor(),year(),fixture.due);
    expect((await current(student.id))[0].class_name).toBe('Grade 8');
    expect(await fixture.q('SELECT id FROM admission_applications WHERE admitted_student_id=$1',[student.id])).toHaveLength(1);
  });

  it('keeps both student status representations consistent with the actual production trigger',async()=>{
    await fixture.installStudentStatusTrigger();
    try {
      const student=await fixture.seed();
      await fixture.q("UPDATE students SET student_status='SUSPENDED' WHERE id=$1",[student.id]);
      expect((await fixture.q('SELECT status FROM students WHERE id=$1',[student.id]))[0].status).toBe('suspended');
      await fixture.q("UPDATE students SET status='active' WHERE id=$1",[student.id]);
      expect((await fixture.q('SELECT student_status FROM students WHERE id=$1',[student.id]))[0].student_status).toBe('ACTIVE');
      const pending=await engine.command(actor(),await request(student.id,'expel'));
      await engine.decideApproval({...actor(),role:'principal',userId:fixture.principal},pending.approval_id!,'approved','Reviewed the expulsion decision');
      expect((await fixture.q('SELECT status,student_status FROM students WHERE id=$1',[student.id]))[0]).toMatchObject({status:'expelled',student_status:'WITHDRAWN'});
      await engine.command(actor(),await request(student.id,'reinstate',{target_class_section_id:fixture.classId(7),target_stream_id:fixture.streamId(7)}));
      expect((await fixture.q('SELECT status,student_status FROM students WHERE id=$1',[student.id]))[0]).toMatchObject({status:'active',student_status:'ACTIVE'});
    } finally {await fixture.q('DROP TRIGGER IF EXISTS progression_test_status ON students');}
  });
});
