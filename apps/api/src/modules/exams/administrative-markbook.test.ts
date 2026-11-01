import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { SubmitAdministrativeMarkbookDto } from './dto/submit-administrative-markbook.dto';

const row = {exam_series_id:'exam',assessment_id:'paper',academic_term_id:'term',class_section_id:'class',
  subject_id:'subject',student_id:'learner',score:null,score_status:'absent' as const,expected_updated_at:'2026-11-01T00:00:00Z'};
const manager = {is_authenticated:true,tenant_id:'school',user_id:'manager',role:'exams_manager',permissions:['exams:write','exams:enter-marks']};

for (const status of ['submitted','locked','published']) test(`administrative save validates school data with ${status} series and no teacher`,async()=>{
  let saved: any;
  const service = new ExamsService({getStore:()=>manager} as never,{
    findSeriesState:async()=>({status,locked_at:status!=='submitted'?'2026-10-01':null,published_at:status==='published'?'2026-10-01':null}),
    findOpenMarkEntryWindow:async(input:any)=>input.manager_entry?{id:'window'}:null,
    findStudentMarkEligibility:async()=>({id:'learner'}),
    findAssessmentScope:async()=>({id:'paper',exam_series_id:'exam',academic_term_id:'term',class_section_id:'class',subject_id:'subject',max_score:80}),
    saveTeacherMarkSheet:async(input:any)=>{saved=input;return {status:'draft',saved_count:1,submitted_count:0,mark_ids:['mark']};},
  } as never,undefined,undefined,{recordSchoolOperation:async()=>undefined} as never);
  await service.saveTeacherMarkEntries([row],'window',false,null);
  assert.equal(saved.manager_entry,true); assert.equal(saved.actor_user_id,'manager'); assert.equal(saved.tenant_id,'school');
});

test('a teacher cannot activate the administrative path by selecting a teacher or omitting assignment',async()=>{
  const service = new ExamsService({getStore:()=>({...manager,role:'teacher'})} as never,{} as never,undefined,undefined,{} as never);
  await assert.rejects(()=>service.saveTeacherMarkEntries([row],'window',false,null),ForbiddenException);
  await assert.rejects(()=>service.submitAdministrativeMarkbook({mark_entry_window_id:'window',assessment_id:'paper',stream_ids:[''],expected_revision:'a'.repeat(32)}),ForbiddenException);
});

test('direct submission validates completeness and revision before invoking the existing authoritative save',async()=>{
  const input={mark_entry_window_id:'window',assessment_id:'paper',stream_ids:[''],expected_revision:'a'.repeat(32)};
  let scope:any={revision:input.expected_revision,is_submitted:false,exam_series_id:'exam',class_section_id:'class',subject_id:'subject',academic_term_id:'term',marks:[{...row,mark_id:null}]};
  const service=new ExamsService({getStore:()=>manager} as never,{loadAdministrativeMarkbook:async()=>scope} as never);
  let submitted:any;
  service.saveTeacherMarkEntries=async(...args:any[])=>{submitted=args;return {success:true,message:'submitted',data:{} as never};};
  await assert.rejects(()=>service.submitAdministrativeMarkbook(input),/1 learner mark entry is missing/);
  scope={...scope,marks:[{...row,mark_id:'mark'}],revision:'b'.repeat(32)};
  await assert.rejects(()=>service.submitAdministrativeMarkbook(input),/changed/);
  scope={...scope,revision:input.expected_revision,is_submitted:true};
  await assert.rejects(()=>service.submitAdministrativeMarkbook(input),/already submitted/);
  scope.is_submitted=false;
  await service.submitAdministrativeMarkbook(input);
  assert.equal(submitted[2],true); assert.equal(submitted[3],null);
  assert.deepEqual(submitted[4],['']); assert.equal(submitted[5],input.expected_revision);
});

test('direct submit body rejects actor/tenant overrides, missing revisions and multiple streams',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const input={mark_entry_window_id:id,assessment_id:id,teacher_user_id:null,stream_ids:[''],expected_revision:'a'.repeat(32)};
  const pipe=new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true});
  assert.ok(await pipe.transform(input,{type:'body',metatype:SubmitAdministrativeMarkbookDto}));
  for(const invalid of [{...input,tenant_id:'foreign'},{...input,actor_user_id:id},{...input,expected_revision:undefined},{...input,stream_ids:['a','b']}]) {
    await assert.rejects(()=>pipe.transform(invalid,{type:'body',metatype:SubmitAdministrativeMarkbookDto}));
  }
});
