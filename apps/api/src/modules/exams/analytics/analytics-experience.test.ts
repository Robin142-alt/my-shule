import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAcademicIntelligence, gradeFor } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';
import { buildAnalyticsPrintReport } from './analytics-report-model';
import { createAnalyticsReportPdf } from './analytics-report-pdf';
import { createAnalyticsReportCsv } from './analytics-report-csv';
import { mkdirSync, writeFileSync } from 'node:fs';

const scope={level:'school' as const,role:'principal',actor_user_id:'principal'};
const build=(rows:ReturnType<typeof evidence>[],filters:Record<string,string|number>={})=>buildAcademicIntelligence(rows,scope,{page:1,page_size:25,analytics_mode:'library',...filters},['school'],undefined,true);
const old=evidence({exam_series_id:'old',exam_date:'2025-01-01',average:0});
const blank=evidence({exam_series_id:'blank',exam_date:'2026-01-01',average:null,numeric_count:0,report_status:'draft_generated'});
const upcoming=evidence({exam_series_id:'upcoming',exam_date:'2026-05-01',average:null,numeric_count:0,report_status:'draft_generated'});

test('automatic selection finds scored cycles; an explicit unfinished exam or comparison remains empty',()=>{
  const rows=[old,blank,evidence({average:60}),upcoming];
  const automatic=build(rows);
  assert.equal(automatic.filters.exam_series_id,'exam-1');assert.equal(automatic.filters.comparison_exam_id,'old');
  assert.equal(automatic.change,60);assert.equal(automatic.analysis.matched_progress.change,60);
  const explicit=build(rows,{exam_series_id:'upcoming',comparison_exam_id:'blank'});
  assert.equal(explicit.filters.exam_series_id,'upcoming');assert.equal(explicit.performance.mean,null);assert.equal(explicit.previous.mean,null);
});

test('one prior result supplies a historical average and two-exam direction without claiming sustained consistency',()=>{
  const learner=build([old,evidence({average:60})]).learners.items[0];
  assert.equal(learner.historical_average,0);assert.equal(learner.consistency.best,60);assert.equal(learner.consistency.weakest,0);
  assert.equal(learner.consistency.status,'Strong Improvement');assert.equal(learner.consistency.variability,null);
  assert.equal(learner.consistency.consecutive_improvement,0);
  assert.ok(!learner.risk.reasons.some(reason=>reason.includes('historical average')));
});

test('area history contains a first recorded exam and stale pages are clamped to real results',()=>{
  const data=build([evidence()],{analytic_ids:'class-history',analytic_page:7});
  assert.equal(data.library!.items[0].rows.length,1);assert.equal(data.library!.items[0].rows[0].values[1],'Mid term');
  const screen=buildAcademicIntelligence([evidence()],scope,{page:1,page_size:25,analytics_mode:'library',analytic_ids:'student-profiles',analytic_page:7},['school']);
  assert.equal(screen.library!.items[0].page,1);assert.equal(screen.library!.items[0].rows.length,1);
});

test('grade thresholds match report cards for decimal marks and saved academic scales never invent pass rules',()=>{
  const boundaries=[{label:'A',min:80,max:100,points:12,is_pass:true},{label:'B',min:60,max:79,points:9,is_pass:true},{label:'E',min:0,max:59,points:1,is_pass:false}];
  assert.equal(gradeFor(79.5,boundaries)?.label,'B');assert.equal(gradeFor(80,boundaries)?.label,'A');assert.equal(gradeFor(101,boundaries),null);
  const saved={source:'academic_setup',id:'stored-scale',version:2,reporting_mode:'traditional',rules:[{label:'High',min:60,max:100,is_pass:true},{label:'Low',min:0,max:59}]};
  const rows=[evidence({student_id:'missing',student_name:'Z Missing',average:null,numeric_count:0}),evidence({average:75,policy_id:null,boundaries:[],grading_snapshot:saved}),evidence({student_id:'second',average:30,policy_id:null,boundaries:[],grading_snapshot:saved})];
  const data=build(rows,{analytic_ids:'grade-distribution'});
  assert.equal(data.performance.mean_grade,'Low');assert.equal(data.performance.pass_rate,100);assert.equal(data.performance.failed,0);
  assert.equal(data.performance.graded_results,2);assert.equal(data.distribution.reduce((n,b)=>n+(b.percentage??0),0),100);
  assert.equal(data.learners.items[1].subjects[0].is_pass,null);
  const pinned=build([evidence({average:75,grading_snapshot:saved})]);
  assert.equal(pinned.performance.mean_grade,'High');
  const changed=build([rows[1],evidence({...old,policy_id:null,boundaries:[],grading_snapshot:{...saved,version:1}})]);
  assert.equal(changed.analysis.matched_progress.change,null);
});

test('zero matching patterns have specific empty states and reports carry exact chart values and all rows',()=>{
  const data=build([evidence({ranking_enabled:true}),evidence({...old,average:80,ranking_enabled:true})],{analytic_ids:'student-improvement,student-volatility,exam-trend,mean'});
  assert.match(data.library!.items.find(i=>i.id==='student-improvement')!.empty_title!,/No comparable changes/);
  assert.match(data.library!.items.find(i=>i.id==='student-volatility')!.empty_title!,/More exams/);
  const report=buildAnalyticsPrintReport(data,'library',{school_name:'QA',school_address:null,school_motto:null,generated_by:'QA'},'AI-QA','2026-10-12');
  const chart=report.sections.find(s=>s.title==='Performance over time')!;
  assert.deepEqual(chart.chart!.points.map(p=>p.value),[80,75]);assert.equal(chart.rows.length,2);
  assert.equal(report.sections.find(s=>s.title==='Average score')!.metric!.value,'75');
  assert.ok(createAnalyticsReportCsv(report).content.toString('utf8').includes('No comparable changes in this direction'));
});

test('year comparisons use recorded year identities and match exam names within the same term',()=>{
  const data=build([evidence({...old,academic_year_id:'prior-year',year_name:'Academic 2025',academic_term_id:'prior-term',average:40}),
    evidence({...old,exam_series_id:'later-term',exam_date:'2025-08-01',academic_year_id:'prior-year',year_name:'Academic 2025',academic_term_id:'prior-term-3',term_name:'Term 3',average:90}),
    evidence({year_name:'Academic 2026',average:70})]);
  assert.equal(data.period_comparisons[1].previous.mean,40);
  assert.equal(data.period_comparisons[2].previous.mean,65);
  assert.equal(data.benchmarks.find(b=>b.name==='Same exam and term in previous recorded year')!.mean,40);
});

test('complete library PDF includes all evidence and renders chart, metric, empty and long table sections',async()=>{
  const rows=Array.from({length:12},(_,student)=>Array.from({length:4},(_,exam)=>['Mathematics','English','Biology'].map((name,subject)=>evidence({
    student_id:`s${student}`,student_name:`QA Learner ${student+1}`,admission_number:`QA${student+1}`,
    exam_series_id:`e${exam}`,exam_name:['Opener','Mid term','End term','Revision'][exam],exam_date:`2026-0${exam+1}-01`,
    subject_id:`subject${subject}`,subject_name:name,class_section_id:student<6?'class1':'class2',class_name:student<6?'Form 1':'Form 2',
    average:35+student*3+subject*4+exam*3,ranking_enabled:true,
  }))).flat()).flat();
  const all=build(rows,{analytic_ids:build(rows).library!.catalog.map(c=>c.id).join(',')});
  const report=buildAnalyticsPrintReport(all,'library',{school_name:'QA School · Analytics verification',school_address:'Nairobi, Kenya',school_motto:null,generated_by:'QA Exam Manager'},'AI-COMPLETE-QA','2026-10-12T12:00:00Z');
  const pdf=await createAnalyticsReportPdf(report);
  assert.equal(pdf.rowCount,report.sections.reduce((count,s)=>count+s.rows.length,0));assert.equal(pdf.content.subarray(0,5).toString(),'%PDF-');
  mkdirSync('output/pdf',{recursive:true});writeFileSync('output/pdf/exam-analytics-complete-qa.pdf',pdf.content);
});
