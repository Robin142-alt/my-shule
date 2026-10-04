import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAcademicIntelligence } from './analytics-engine';
import { evidence } from './testing/evidence.fixture';

const scope = { level: 'school' as const, role: 'principal', actor_user_id: 'principal' };
const build = (rows: ReturnType<typeof evidence>[]) => buildAcademicIntelligence(rows, scope, {page:1,page_size:1}, ['school']);

test('score profile includes zero, excludes missing results and uses the whole population', () => {
  const data = build([0,25,75,100,null].map((average,i)=>evidence({student_id:`s${i}`,average,numeric_count:average===null?0:1,missing:average===null?1:0})));
  assert.deepEqual(data.analysis.quartiles, {lower:18.75,upper:81.25,interquartile_range:62.5});
  assert.deepEqual(data.analysis.score_bands.map(b=>b.count), [1,1,0,1,1]);
  assert.equal(data.analysis.score_bands.reduce((n,b)=>n+(b.percentage??0),0),100);
  assert.deepEqual(data.analysis.coverage,{complete:4,partial:0,without_results:1,approved_assessments:4,expected_assessments:5,approval_rate:80});
  assert.equal(data.learners.items.length,1);
  assert.equal(build([]).analysis.quartiles.lower,null);
  assert.equal(build([]).analysis.coverage.approval_rate,null);
});

test('matched progress excludes new learners, changed subjects and changed grading policies', () => {
  const old = {exam_series_id:'old',exam_date:'2026-01-01'};
  const data = build([
    evidence({...old,average:20}),evidence({...old,subject_id:'bio',average:90}),
    evidence({average:40}),evidence({subject_id:'bio',policy_id:'new-policy',average:10}),
    evidence({student_id:'new',average:100}),
  ]);
  assert.deepEqual(data.analysis.matched_progress,{matched_results:1,matched_learners:1,current_mean:40,previous_mean:20,change:20,improved:1,stable:0,declined:0,excluded_current_results:2});
  assert.equal(build([evidence()]).analysis.matched_progress.change,null);
});

test('subject support uses configured pass boundaries and distinguishes missing from failing', () => {
  const boundaries=[{label:'Meeting',min:40,max:100,points:null,is_pass:true},{label:'Below',min:0,max:39.99,points:null,is_pass:false}];
  const data=build([35,39.5,40,null,0].map((average,i)=>evidence({student_id:`s${i}`,average,boundaries,numeric_count:average===null?0:1,missing:average===null?1:0})));
  assert.equal(data.analysis.subject_support[0].near_pass,2);
  assert.equal(data.analysis.subject_support[0].failed,3);
  assert.equal(data.analysis.subject_support[0].missing,1);
  assert.equal(build([evidence({boundaries:[]})]).analysis.subject_support[0].near_pass,0);
});

test('report population can include all matching learners without changing public pagination', () => {
  const rows=Array.from({length:125},(_,i)=>evidence({student_id:`s${i}`}));
  const data=buildAcademicIntelligence(rows,scope,{page:2,page_size:25},['school'],undefined,true);
  assert.equal(data.learners.items.length,125);
  assert.equal(data.learners.coverage,'all');
  assert.equal(build(rows).learners.items.length,1);
  const filtered=buildAcademicIntelligence(rows,scope,{page:1,page_size:25,student_id:'s124'},['school'],undefined,true);
  assert.equal(filtered.learners.items.length,1);
});
