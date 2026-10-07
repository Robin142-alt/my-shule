import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAcademicIntelligence } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';
import { parseAnalyticsFilters } from './analytics-scope';
import { buildAnalyticsPrintReport } from './analytics-report-model';
import { analyticsCsvCell, createAnalyticsReportCsv } from './analytics-report-csv';
import { AnalyticsReportService } from './analytics-report.service';

const scope={level:'school' as const,actor_user_id:'manager',role:'exams_manager'};
const identity={school_name:'QA Analytics School',school_address:'Nairobi',school_motto:'Learn',generated_by:'QA Exam Manager'};
const rows=[0,20,40,60,80,100,null].flatMap((average,i)=>[
  evidence({student_id:`s${i}`,student_name:`Student ${i}`,average,numeric_count:average===null?0:1,missing:average===null?1:0,ranking_enabled:true,class_section_id:i<3?'c1':'c2',class_name:i<3?'Class 1':'Class 2'}),
  evidence({student_id:`s${i}`,student_name:`Student ${i}`,exam_series_id:'old',exam_date:'2025-01-01',academic_year_id:'2025',year_name:'2025',academic_term_id:'old-term',average:average===null?null:Math.max(0,average-10),ranking_enabled:true,class_section_id:i<3?'c1':'c2',class_name:i<3?'Class 1':'Class 2'})]);
const build=(filters:Record<string,string>={},all=false,input=rows)=>buildAcademicIntelligence(input,scope,parseAnalyticsFilters({analytics_mode:'library',...filters}),['school'],undefined,all);
const analytic=(id:string,filters:Record<string,string>={})=>build({analytic_ids:id,...filters}).library!.items[0];

test('library registers a broad stable catalog and every analytic has a complete branded report and safe CSV',()=>{
  const data=build();const ids=data.library!.catalog.map(c=>c.id);
  assert.equal(ids.length,93);assert.equal(ids.length,new Set(ids).size);
  const full=build({analytic_ids:ids.join(',')},true);
  assert.equal(full.library!.items.length,ids.length);
  const report=buildAnalyticsPrintReport(full,'library',identity,'AI-LIBRARY-QA','2026-10-07T12:00:00Z');
  assert.equal(report.sections.length,ids.length);assert.equal(report.school_name,identity.school_name);
  for(const item of full.library!.items){assert.ok(item.title&&item.question&&item.note,item.id);assert.equal(item.rows.length,item.total);assert.ok(item.rows.every(r=>r.values.length===item.columns.length),item.id);}
  const csv=createAnalyticsReportCsv(report).content.toString('utf8');
  for(const item of full.library!.items)assert.ok(csv.includes(item.title),item.id);
  assert.ok(report.filters.some(f=>f.label==='Comparison exam'&&f.value==='Mid term'));
});
test('class and student drill-downs preserve authorized parent benchmarks without leaking child averages into school means',()=>{
  const a=analytic('parent-benchmarks',{class_section_id:'c1'});assert.deepEqual(a.rows[0].values,['School',50,20,-30,6]);
  const student=build({student_id:'s0',analytic_ids:'student-benchmarks'});assert.equal(student.performance.mean,0);
  assert.equal(student.library!.items[0].rows[0].values[2],-20);assert.equal(student.library!.items[0].rows[0].values[4],-50);
  assert.equal(student.options.classes.length,2);
});
test('data pages are bounded but report generation includes all rows and all nulls honestly',()=>{
  const input=Array.from({length:130},(_,i)=>evidence({student_id:`s${i}`,student_name:`Student ${i}`}));
  const page=build({analytic_ids:'student-profiles',analytic_page:'2'},false,input).library!.items[0];
  assert.equal(page.rows.length,25);assert.equal(page.total,130);assert.equal(page.page,2);
  const full=build({analytic_ids:'student-profiles',analytic_page:'2'},true,input).library!.items[0];
  assert.equal(full.rows.length,130);
  const empty=build({analytic_ids:'mean,median,pass-rate'},true,[]);assert.ok(empty.library!.items.every(i=>i.rows[0].values[1]===null));
});
test('score distribution shares are based on each exam denominator and movement excludes changed policies',()=>{
  const a=analytic('distribution-change');assert.equal(a.rows.reduce((sum,r)=>sum+Number(r.values[1]),0),6);
  assert.ok(Math.abs(a.rows.reduce((sum,r)=>sum+Number(r.values[3]),0)-100)<.05);
  const input=[evidence({average:90}),evidence({exam_series_id:'old',exam_date:'2025-01-01',average:40,policy_id:'other'})];
  const a2=build({analytic_ids:'grade-movement-matrix,score-movement-matrix'},false,input);assert.ok(a2.library!.items.every(i=>i.total===0));
});
test('focused comparisons use selected entities and retain missing values instead of zero',()=>{
  const a=analytic('focused-comparison',{comparison_dimension:'student',compare_left_id:'s0',compare_right_id:'s5'});
  assert.deepEqual(a.rows.find(r=>r.values[0]==='Average %')!.values,['Average %',0,100,-100]);
  const unknown=analytic('focused-comparison',{compare_left_id:'foreign',compare_right_id:'c1'});assert.deepEqual(unknown.rows[1].values,['Average %',null,20,null]);
});
test('ranking follows policy; invalid analytics and excessive windows fail explicitly',()=>{
  assert.equal(build({analytic_ids:'learner-rankings'},false,[evidence({ranking_enabled:false})]).library!.items[0].total,0);
  assert.equal(build({analytic_ids:'class-rankings'},false,[evidence({ranking_enabled:true,reporting_mode:'cbc_competency'})]).library!.items[0].total,0);
  assert.throws(()=>build({analytic_ids:'invented'}),/not available/);
  for(const filter of [{history_limit:'121'},{analytic_page:'0'},{analytic_ids:'mean;DROP'},{comparison_dimension:'tenant'}])assert.throws(()=>parseAnalyticsFilters(filter));
  assert.equal('tenant_id' in parseAnalyticsFilters({tenant_id:'foreign'}),false);
});
test('CSV protects cells from formulas, quotes and embedded row breaks',()=>{
  assert.equal(analyticsCsvCell(' =HYPERLINK("bad")'),'"\' =HYPERLINK(""bad"")"');
  assert.equal(analyticsCsvCell('normal\nsecond'),'"normal\nsecond"');
  assert.equal(analyticsCsvCell('@cmd'),'"\'@cmd"');
});
test('library exports recompute school scope and audit both PDF and CSV before returning content',async()=>{
  const manifests:Record<string,unknown>[]=[],events:unknown[]=[];
  const service=new AnalyticsReportService({requireStore:()=>({tenant_id:'school-a',user_id:'manager',role:'exams_manager'})} as never,
    {getAnalytics:async(filters:Record<string,string>,all:boolean)=>{assert.equal(filters.analytics_mode,'library');assert.equal(all,true);return build(filters,all);}} as never,
    {executeSql:async(_q:unknown,args:unknown[])=>{assert.equal(args[0],'school-a');return {rows:[identity]};}} as never,
    {saveManifest:async(m:Record<string,unknown>)=>{manifests.push(m);}} as never,{recordSchoolOperation:async(e:unknown)=>events.push(e)} as never);
  const output=await service.generate({section:'library',filters:{analytic_ids:'mean'}});
  assert.equal(manifests.length,2);assert.ok(manifests.every(m=>m.tenant_id==='school-a'&&m.generated_by_user_id==='manager'));assert.equal(events.length,1);
  assert.equal(Buffer.from(output.pdf_base64,'base64').subarray(0,5).toString(),'%PDF-');assert.ok(Buffer.from(output.csv_base64!,'base64').toString().includes('QA Analytics School'));
  const csv=await service.generate({section:'library',format:'csv',filters:{analytic_ids:'mean'}});
  assert.equal(csv.pdf_base64,'');assert.equal(manifests.length,3);assert.equal(events.length,2);assert.ok(csv.csv_base64);
});
test('student profiles keep peer positions and transfers do not imply rank movement',()=>{
  const profile=build({student_id:'s0'}).learners.items[0];assert.equal(profile.positions?.class,3);
  const moved=build({},false,[evidence({ranking_enabled:true}),evidence({exam_series_id:'old',exam_date:'2025-01-01',ranking_enabled:true,class_section_id:'different'})]);
  assert.equal(moved.learners.items[0].position_movement,null);
});

test('recorded cohort, risk, support and readiness measures are exportable without inventing missing outcomes',()=>{
  const input=[evidence({cohort_id:'intake-2025',interventions:[{id:'support-1',status:'completed',due_on:null,starts_on:null,completed_at:'2026-02-01',baseline:{score:40},target:{score:60},outcome:{score:55}}]})];
  const result=build({analytic_ids:'cohort-progression,risk-distribution,risk-movement,intervention-summary,intervention-outcomes,assessment-pipeline,report-readiness'},true,input);
  const item=(id:string)=>result.library!.items.find(i=>i.id===id)!;
  assert.equal(item('cohort-progression').rows[0].values[0],'intake-2025');
  assert.equal(item('risk-distribution').rows.reduce((n,r)=>n+Number(r.values[1]),0),1);
  assert.deepEqual(item('intervention-outcomes').rows[0].values,['support-1','completed',null,40,55,15,60,-5]);
  assert.equal(item('report-readiness').rows.find(r=>r.values[0]==='approved')?.values[1],1);
  const absent=build({analytic_ids:'intervention-summary'},true,[]).library!.items[0];
  assert.equal(absent.rows.find(r=>String(r.values[0]).includes('improved scores'))?.values[1],null);
  assert.equal(buildAnalyticsPrintReport(result,'library',identity,'AI-SUPPORT','2026-10-07').sections.length,7);
});
