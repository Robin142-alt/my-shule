import test from 'node:test';
import assert from 'node:assert/strict';
import { ExamsService } from '../exams.service';
import { buildAcademicIntelligence } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';
import type { ExamAnalyticsScope } from './analytics-scope';

test('all eight academic roles resolve default scopes using the authenticated school context',async()=>{
  for(const [role,level] of [['teacher','assignment'],['head_of_subject','subject'],['class_teacher','class'],['hod','department'],
    ['grade_master','grade'],['dean_of_academics','school'],['deputy_principal','school'],['principal','school']]) {
    let actual:unknown;
    const service=new ExamsService({getStore:()=>({tenant_id:'school-a',user_id:'staff-a',role,permissions:['exams:read']})} as never,
      {getAnalytics:async(tenant:string,scope:ExamAnalyticsScope)=>{actual={tenant,...scope};return buildAcademicIntelligence([],scope,{page:1,page_size:25},[scope.level]);}} as never);
    await service.getAnalytics({school_id:'school-b',actor_user_id:'another-user'});
    assert.deepEqual(actual,{tenant:'school-a',level,role,actor_user_id:'staff-a'});
    if(level!=='school') await assert.rejects(()=>service.getAnalytics({scope:'school'}),/leadership/);
  }
});

for (const subjectHead of [false, true]) {
test(`${subjectHead ? 'Head of Subject' : 'Subject teacher'} intervention uses checked learner-subject scope, derives its baseline and emits persisted workflow events`,async()=>{
  const calls:Record<string,unknown>[]=[];
  let allowed=true;
  const scope:ExamAnalyticsScope={level:subjectHead?'subject':'assignment',role:subjectHead?'head_of_subject':'teacher',actor_user_id:'teacher-1'};
  const service=new ExamsService({getStore:()=>({tenant_id:'school-a',user_id:'teacher-1',role:scope.role,permissions:subjectHead?['academics:read','exams:subject-analytics']:['academics:read','teacher:write','exams:read']})} as never,
    {getAnalytics:async()=>buildAcademicIntelligence(allowed?[evidence({average:25})]:[],scope,{page:1,page_size:25},[scope.level]),
      resolveAcademicInterventionScope:async()=>({student_id:'learner-1',class_section_id:'form-1',subject_id:'math',exam_series_id:'exam-1',owner_user_id:'teacher-1'}),
      createAcademicIntervention:async(input:Record<string,unknown>)=>{calls.push(input);return {...input,id:'intervention-1',status:'planned'};},
      listAcademicInterventionRecipients:async()=>[{user_id:'teacher-1'}],
    } as never,undefined,undefined,
    {recordSchoolOperation:async(input:Record<string,unknown>)=>{calls.push({event:input});}} as never,undefined,
    {createNotification:async(input:Record<string,unknown>)=>{calls.push({notification:input});},createTask:async(input:Record<string,unknown>)=>{calls.push({task:input});}} as never);
  const dto={analytics_scope:scope.level,student_id:'learner-1',class_section_id:'form-1',subject_id:'math',exam_series_id:'exam-1',owner_user_id:'teacher-1',
    trigger_reason:'Repeated low result',plan:'Weekly guided support',baseline:{average:99}};
  const result=await service.createAcademicIntervention(dto);
  assert.equal(result.success,true);assert.equal((calls[0].baseline as {average:number}).average,25);
  assert.equal(calls[0].tenant_id,'school-a');assert.ok(calls.some(c=>c.event));assert.ok(calls.some(c=>c.notification));assert.ok(calls.some(c=>c.task));
  calls.length=0;allowed=false;
  await assert.rejects(()=>service.createAcademicIntervention(dto),/outside your academic appointment/);assert.equal(calls.length,0);
  await assert.rejects(()=>service.createAcademicIntervention({...dto,analytics_scope:undefined}),/write or review authority/);
});

}
