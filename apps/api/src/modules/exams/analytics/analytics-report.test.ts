import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAcademicIntelligence } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';
import { buildAnalyticsPrintReport } from './analytics-report-model';
import { createAnalyticsReportPdf } from './analytics-report-pdf';
import { AnalyticsReportService } from './analytics-report.service';

const identity={school_name:'QA School - sample document',school_address:'Nairobi, Kenya',school_motto:'Learning with purpose',generated_by:'QA Teacher'};
const data=()=>buildAcademicIntelligence(Array.from({length:75},(_,index)=>evidence({student_id:`learner-${index}`,student_name:`Sample learner ${index+1} with a longer family name`,admission_number:`QA${index+1}`,average:index%2?75:25})),{level:'assignment',role:'teacher',actor_user_id:'teacher-1'},{page:1,page_size:100},['assignment']);

test('learner print labels pagination and keeps scope-wide statistics truthful',()=>{
  const analytics=data();analytics.learners.page=2;analytics.learners.page_size=25;analytics.learners.items=analytics.learners.items.slice(25,50);
  const report=buildAnalyticsPrintReport(analytics,'learners',identity,'AI-QA-1','2026-09-11T10:00:00Z');
  assert.match(report.sections[0].note!,/26-50 of 75/);assert.equal(report.sections[0].rows.length,25);
  assert.ok(report.notes.some(note=>note.includes('scope')));assert.equal(report.scope,'Teaching assignment');
  assert.equal(report.metrics[0].value,`${analytics.performance.mean!.toFixed(1)}%`);
});
test('print model preserves unavailable results and explicit missing evidence',()=>{
  const analytics=buildAcademicIntelligence([],{level:'school',role:'principal',actor_user_id:'principal'},{page:1,page_size:25},['school']);
  const report=buildAnalyticsPrintReport(analytics,'summary',identity,'AI-QA-EMPTY','2026-09-11T10:00:00Z');
  assert.equal(report.metrics[0].value,'Not available');assert.match(report.notes[0],/No approved/);
});
test('PDF export supports long learner names, repeated headers and page footers',async()=>{
  const report=buildAnalyticsPrintReport(data(),'learners',identity,'AI-QA-PRINT-001','2026-09-11T10:00:00Z');
  const artifact=await createAnalyticsReportPdf(report);
  assert.equal(artifact.content.subarray(0,5).toString(),'%PDF-');assert.equal(artifact.rowCount,75);assert.match(artifact.checksumSha256,/^[a-f0-9]{64}$/);
  mkdirSync('output/pdf',{recursive:true});writeFileSync('output/pdf/analytics-print-qa.pdf',artifact.content);
});
test('report generation recomputes authorized scope before branding and binds snapshot, actor and event',async()=>{
  const calls:string[]=[];const manifests:Record<string,unknown>[]=[];
  const service=new AnalyticsReportService({requireStore:()=>({tenant_id:'school-a',user_id:'teacher-1',role:'teacher'})} as never,
    {getAnalytics:async(filters:Record<string,string>)=>{calls.push('scope');assert.equal(filters.scope,'assignment');return data();}} as never,
    {executeSql:async(_sql:string,params:unknown[])=>{calls.push('identity');assert.deepEqual(params,['school-a','teacher-1','teacher']);return {rows:[identity]};}} as never,
    {saveManifest:async(manifest:Record<string,unknown>)=>{calls.push('audit');manifests.push(manifest);}} as never,
    {recordSchoolOperation:async(input:{event:{payload:{scope:string}}})=>{calls.push('event');assert.equal(input.event.payload.scope,'assignment');}} as never);
  const result=await service.generate({section:'summary',filters:{scope:'assignment'},data:{school_name:'FORGED',mean:100}});
  assert.equal(result.report.school_name,identity.school_name);assert.equal(manifests[0].tenant_id,'school-a');assert.equal(manifests[0].generated_by_user_id,'teacher-1');
  assert.deepEqual(calls,['scope','identity','audit','event']);assert.equal(Buffer.from(result.pdf_base64,'base64').subarray(0,5).toString(),'%PDF-');
});
test('invalid filters, denied scopes and persistence errors cannot return a document',async()=>{
  let writes=0;
  const service=new AnalyticsReportService({requireStore:()=>({tenant_id:'school-a',user_id:'teacher-1',role:'teacher'})} as never,
    {getAnalytics:async()=>{throw new Error('Scope denied');}} as never,{executeSql:async()=>{writes++;}} as never,{} as never,{} as never);
  for(const input of [null,{section:'all',filters:{}},{section:'summary',filters:{scope:{}}}])await assert.rejects(()=>service.generate(input));
  await assert.rejects(()=>service.generate({section:'summary',filters:{scope:'school'}}),/Scope denied/);assert.equal(writes,0);
  const failing=new AnalyticsReportService({requireStore:()=>({tenant_id:'school-a',user_id:'teacher-1',role:'teacher'})} as never,
    {getAnalytics:async()=>data()} as never,{executeSql:async()=>({rows:[identity]})} as never,{saveManifest:async()=>{throw new Error('Audit unavailable');}} as never,
    {recordSchoolOperation:async()=>{writes++;}} as never);
  await assert.rejects(()=>failing.generate({section:'summary',filters:{}}),/Audit unavailable/);assert.equal(writes,0);
});
