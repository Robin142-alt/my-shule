import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRankings } from './analytics-rankings';
import { buildAcademicIntelligence } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';
import { parseAnalyticsFilters } from './analytics-scope';
import { buildAnalyticsPrintReport } from './analytics-report-model';

const row=(student:string,score:number|null,extra:Parameters<typeof evidence>[0]={})=>evidence({student_id:student,student_name:student,admission_number:student,average:score,ranking_enabled:true,...extra});
const old=(r:ReturnType<typeof evidence>,extra:Parameters<typeof evidence>[0]={})=>({...r,exam_series_id:'old',exam_date:'2025-01-01',...extra});
const scope={level:'school' as const,role:'principal',actor_user_id:'qa'};
const build=(rows:ReturnType<typeof evidence>[],filters:Record<string,string>={},report=false)=>buildAcademicIntelligence(rows,scope,parseAnalyticsFilters({analytics_mode:'library',analytic_ids:'rankings',...filters}),['school'],undefined,report);

test('competition ranks use displayed precision, skip incomplete or protected evidence, and keep zero',()=>{
  const rows=[row('first',90),row('tie-a',80.001),row('tie-b',80.002),row('zero',0),row('partial',99,{expected:2,missing:1}),row('absent',95,{absent:1}),row('disabled',100,{ranking_enabled:false}),row('cbc',100,{reporting_mode:'cbc_competency'}),row('missing',null,{numeric_count:0})];
  const ranked=buildRankings(rows,[],'student');
  assert.deepEqual(ranked.rows.map(r=>[r.id,r.position,r.average]),[['first',1,90],['tie-a',2,80],['tie-b',2,80],['zero',4,0]]);
  assert.equal(ranked.excluded,5);
  assert.deepEqual(buildRankings(rows,[],'student','average',true).rows.map(r=>[r.id,r.position]),[['zero',1],['tie-a',2],['tie-b',2],['first',4]]);
  const profile=build(rows,{class_section_id:'form-1'}).learners.items.find(l=>l.student_id==='zero');
  assert.equal(profile!.positions?.class,4);
});

test('progress requires complete matching subjects, placements and saved policies in both exams',()=>{
  const now=[row('improved',80),row('declined',30),row('unchanged',60),row('new',90),row('policy',70),row('promoted',80),row('mix',80),row('partial',80)];
  const prior=[old(now[0],{average:60}),old(now[1],{average:50}),old(now[2]),old(now[4],{average:40,policy_id:'other'}),old(now[5],{average:30,class_section_id:'old-form'}),old(now[6],{subject_id:'english',average:50}),old(now[7],{average:60,expected:2,missing:1})];
  assert.deepEqual(buildRankings(now,prior,'student','improvement').rows.map(r=>[r.id,r.change,r.position]),[['improved',20,1]]);
  assert.deepEqual(buildRankings(now,prior,'student','decline').rows.map(r=>[r.id,r.change,r.position]),[['declined',-20,1]]);
  assert.equal(buildRankings(now,prior,'student').rows.find(r=>r.id==='policy')!.previous,null);
});

test('area progress uses matching learners with equal weights and discloses exclusions',()=>{
  const now=[row('one',80),row('one',60,{subject_id:'english'}),row('two',50),row('new',100),row('incomplete',99,{expected:2,missing:1})];
  const prior=[old(now[0],{average:60}),old(now[1],{average:40}),old(now[2],{average:30}),old(row('left',0))];
  for(const dimension of ['class','department','grade','stream'] as const){
    const result=buildRankings(now,prior,dimension,'improvement').rows[0];
    assert.equal(result.average,60);assert.equal(result.previous,40);assert.equal(result.change,20);assert.equal(result.learners,2);assert.equal(result.excluded,2);
    assert.equal(buildRankings(now,prior,dimension).rows[0].previous,null);
  }
  assert.equal(buildRankings(now,prior,'subject','improvement').rows[0].change,20);
  assert.equal(buildRankings([...now,row('disabled',90,{ranking_enabled:false})],prior,'class').rows.length,0);
});

test('streams with reused IDs in different forms never merge',()=>{
  const data=[row('one',60),row('two',90,{class_section_id:'form-2',class_name:'Form 2'})];
  const result=buildRankings(data,[],'stream').rows;
  assert.deepEqual(result.map(r=>[r.name,r.average,r.learners]),[['Form 2 · Blue',90,1],['Form 1 · Blue',60,1]]);
  assert.equal(build(data).learners.items.find(l=>l.student_id==='one')!.positions?.stream,1);
});

test('rank filters validate, refresh with the view cache, and respect exam and population filters',()=>{
  assert.throws(()=>parseAnalyticsFilters({ranking_dimension:'school_id'}));
  assert.throws(()=>parseAnalyticsFilters({ranking_measure:'unapproved'}));
  assert.throws(()=>parseAnalyticsFilters({ranking_order:'random'}));
  const now=[row('one',50),row('two',90,{class_section_id:'form-2',class_name:'Form 2',subject_id:'english',subject_name:'English'})];
  const rows=[...now,old(now[0],{average:30}),old(now[1],{average:80})];
  assert.equal(build(rows,{class_section_id:'form-1'}).library!.items[0].rows.length,1);
  const subjects=build(rows,{ranking_dimension:'subject'}).library!.items[0];
  assert.equal(subjects.rows[0].values[0],'English');
  const changes=build(rows,{ranking_measure:'improvement'}).library!.items[0];
  assert.equal(changes.rows[0].values[0],'one · one');assert.equal(changes.rows[0].values[4],20);
  assert.equal(build(rows,{exam_series_id:'old'}).library!.items[0].rows[0].values[2],80);
});

test('search and pagination retain positions; printed reports include every ranked row and selection',()=>{
  const rows=Array.from({length:31},(_,i)=>row(`learner-${String(i).padStart(2,'0')}`,100-i));
  const paged=build(rows,{analytic_page:'2'}).library!.items[0];
  assert.equal(paged.rows[0].values[1],26);assert.equal(paged.total,31);
  const found=build(rows,{learner_query:'learner-29'}).library!.items[0];
  assert.equal(found.rows[0].values[1],30);
  const data=build(rows,{class_section_id:'form-1',analytic_page:'2'},true);
  const report=buildAnalyticsPrintReport(data,'library',{school_name:'QA',school_address:null,school_motto:null,generated_by:'QA'},'QA-1','2026-10-13');
  assert.equal(report.sections[0].rows.length,31);assert.equal(report.sections[0].rows[30][1],'31');
  assert.equal(report.filters.find(f=>f.label==='Grade / Form')!.value,'Form 1');
  assert.ok(report.sections[0].headers.includes('Position'));
});
