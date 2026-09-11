import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAcademicIntelligence, calculateRisk, statistics, targetResult, trendStatus } from './analytics-engine';
import { analyticsScopeSql, parseAnalyticsFilters } from './analytics-scope';
import { analyticsQuery } from './analytics-query';

import { evidence } from './testing/evidence.fixture';

const school={level:'school' as const,role:'principal',actor_user_id:'principal-1'};
const filters={page:1,page_size:25};
test('analytics handles empty and missing evidence without fabricated zero averages or targets',()=>{
  const empty=buildAcademicIntelligence([],school,filters,['school']);
  assert.equal(empty.performance.mean,null);assert.equal(empty.performance.pass_rate,null);assert.equal(empty.performance.target.target,null);
  const missing=buildAcademicIntelligence([evidence({average:null,numeric_count:0,missing:1,recorded:0})],school,filters,['school']);
  assert.equal(missing.performance.mean,null);assert.equal(missing.performance.learners_examined,0);assert.equal(missing.operations.missing,1);
  assert.equal(missing.learners.items[0].total_points,null);
});
test('current exam and previous exam are separate; learner pagination never changes population metrics',()=>{
  const rows=[evidence({average:50}),evidence({exam_series_id:'exam-2',exam_date:'2026-04-01',average:80}),evidence({exam_series_id:'exam-2',exam_date:'2026-04-01',student_id:'learner-2',average:60})];
  const result=buildAcademicIntelligence(rows,school,{...filters,page_size:1},['school']);
  assert.equal(result.performance.mean,70);assert.equal(result.previous.mean,50);assert.equal(result.change,20);assert.equal(result.learners.items.length,1);assert.equal(result.learners.total,2);
  assert.equal(result.learners.items[0].change,30);assert.equal(result.band_movement.up,1);
  const old=buildAcademicIntelligence(rows,school,{...filters,exam_series_id:'exam-1'},['school']);assert.equal(old.performance.mean,50);assert.equal(old.change,null);
});
test('CBC uses configured achievement levels; ungraded results do not silently pass at 50%',()=>{
  const boundary=[{label:'Meeting Expectations',min:40,max:100,points:null,is_pass:true},{label:'Below Expectations',min:0,max:39.99,points:null,is_pass:false}];
  const result=buildAcademicIntelligence([evidence({average:45,reporting_mode:'cbc_competency',boundaries:boundary})],school,filters,['school']);
  assert.equal(result.performance.pass_rate,100);assert.equal(result.performance.mean_grade,'Meeting Expectations');assert.equal(result.learners.items[0].total_points,null);
  assert.equal(result.subjectPerformance[0].me_count,1);
  const ungraded=buildAcademicIntelligence([evidence({boundaries:[]})],school,filters,['school']);assert.equal(ungraded.performance.pass_rate,null);assert.equal(ungraded.risk.at_risk_count,0);
});
test('statistics, trend thresholds, target arithmetic and transparent risk are deterministic',()=>{
  assert.deepEqual(statistics([null,0,50,100]),{mean:50,median:50,highest:100,lowest:0,range:100,standard_deviation:40.82,count:3});
  assert.equal(trendStatus(null),'Insufficient history');assert.equal(trendStatus(2),'Stable');assert.equal(trendStatus(-10),'Critical Decline');
  assert.deepEqual(targetResult(60,75),{target:75,actual:60,variance:-15,achievement:80,status:'Below target'});assert.equal(targetResult(50,0).achievement,null);
  const risk=calculateRisk({failed:4,change:-13,missing:2,absent:0,consecutive_decline:2,repeated_failures:1,baseline_change:null});
  assert.equal(risk.level,'High');assert.ok(risk.reasons.includes('Average dropped 13 points'));assert.ok(risk.reasons.includes('Failing 4 subjects'));
});
test('consistency needs three exams and failures must use the same learner and subject',()=>{
  const rows=[evidence({average:75}),evidence({exam_series_id:'exam-2',exam_date:'2026-04-01',average:65})];
  assert.equal(buildAcademicIntelligence(rows,school,filters,['school']).learners.items[0].consistency.status,'Insufficient history');
  rows.push(evidence({exam_series_id:'exam-3',exam_date:'2026-06-01',average:45}));
  const learner=buildAcademicIntelligence(rows,school,filters,['school']).learners.items[0];assert.equal(learner.consistency.consecutive_decline,2);assert.equal(learner.risk.level,'Critical');
});
test('explicit exam comparison and learner filtering retain authorized cohort denominators',()=>{
  const rows=[evidence(),evidence({student_id:'learner-2',average:25})];
  const result=buildAcademicIntelligence(rows,school,{...filters,student_id:'learner-2'},['school']);
  assert.equal(result.performance.mean,50);assert.equal(result.learners.total,1);assert.equal(result.learners.items[0].student_id,'learner-2');
  assert.equal(buildAcademicIntelligence(rows,school,{...filters,exam_series_id:'foreign-exam'},['school']).performance.mean,null);
});
test('all scope SQL is tenant correlated and teacher scope never includes unrelated class-teacher subjects',()=>{
  for(const scope of ['assignment','class','subject','grade','department'] as const){const sql=analyticsScopeSql('evidence',scope);assert.match(sql,/ap.tenant_id = evidence.tenant_id/);assert.match(sql,/effective_to/);assert.match(sql,/\$2::text/);}
  assert.doesNotMatch(analyticsScopeSql('evidence','assignment'),/academics_class_teachers/);
  assert.match(analyticsScopeSql('evidence','subject'),/ap.subject_id::text = evidence.subject_id/);
  assert.match(analyticsScopeSql('evidence','grade'),/ap.stream_id::text = evidence.stream_id/);
  assert.match(analyticsQuery('assignment'),/mark.status IN \('locked','published'\) AND card.status IN \('approved','published'\)/);
});
test('query validation rejects unsafe or excessive filters and never takes school identity from the client',()=>{
  assert.throws(()=>parseAnalyticsFilters({scope:'global'}));assert.throws(()=>parseAnalyticsFilters({page_size:'1000'}));assert.throws(()=>parseAnalyticsFilters({page:'0'}));
  assert.equal((parseAnalyticsFilters({school_id:'other'}) as unknown as Record<string,unknown>).school_id,undefined);
});

test('ranking is opt-in, shares ties and stays absent for CBC; cohort identifiers drive progression',()=>{
  const rows=[evidence({ranking_enabled:true,average:80,cohort_id:'cohort-1'}),
    evidence({ranking_enabled:true,average:80,student_id:'learner-2',cohort_id:'cohort-1'}),
    evidence({ranking_enabled:true,average:60,student_id:'learner-3',cohort_id:'cohort-1'}),
    evidence({ranking_enabled:true,average:90,exam_series_id:'exam-2',exam_date:'2026-06-01',grade_level:'2',cohort_id:'cohort-1'})];
  const current=buildAcademicIntelligence(rows,school,filters,['school']);
  assert.equal(current.learners.items[0].positions?.class,1);
  assert.equal(current.cohorts.length,1);assert.deepEqual(current.cohorts[0].progression.map(p=>p.grade),['1','2']);
  const previous=buildAcademicIntelligence(rows,school,{...filters,exam_series_id:'exam-1'},['school']);
  assert.deepEqual(previous.learners.items.map(l=>l.positions?.class),[1,1,3]);
  const cbc=buildAcademicIntelligence([evidence({ranking_enabled:true,reporting_mode:'cbc_competency'})],school,filters,['school']);
  assert.equal(cbc.learners.items[0].positions,null);
});

test('at-risk pagination excludes low-risk learners before slicing and exposes measured intervention outcomes only',()=>{
  const result=buildAcademicIntelligence([
    evidence({student_name:'A Low Risk',average:90}),evidence({student_id:'risk',student_name:'Z Risk',average:20,
      interventions:[{id:'plan',status:'completed',due_on:null,starts_on:null,completed_at:null,baseline:{average:20},target:{average:60},outcome:{average:50}}]})
  ],school,{...filters,risk_level:'At Risk',page_size:1},['school']);
  assert.equal(result.learners.total,1);assert.equal(result.learners.items[0].student_id,'risk');
  assert.equal(result.interventions.success_rate,100);assert.equal(result.interventions.items[0].target_result.variance,-10);
  assert.equal(result.targets.available,false);
});

test('term and year comparisons use period results, and risk movement uses history available at each exam',()=>{
  const result=buildAcademicIntelligence([
    evidence({exam_series_id:'prior-year',exam_date:'2025-02-01',academic_year_id:'2025',year_name:'2025',academic_term_id:'2025-term-1',average:80}),
    evidence({average:80}),
    evidence({exam_series_id:'exam-2',exam_date:'2026-04-01',academic_term_id:'term-2',term_name:'Term 2',average:60}),
    evidence({exam_series_id:'exam-3',exam_date:'2026-06-01',academic_term_id:'term-2',term_name:'Term 2',average:40}),
  ],school,filters,['school']);
  assert.equal(result.period_trends.terms.at(-1)?.mean,50);
  assert.equal(result.period_comparisons[0].current.mean,50);
  assert.equal(result.period_comparisons[0].previous.mean,80);
  assert.equal(result.period_comparisons[0].change,-30);
  assert.equal(result.learners.items[0].previous_risk?.level,'Critical');
  assert.equal(result.risk.movement.comparable,1);
  assert.equal(result.risk.movement.entered_high,0);
  assert.equal(result.performance.learners_failing_any,1);
  assert.equal(result.performance.learners_passing_all,0);
  assert.equal(result.comparisons.find(c=>c.dimension==='class')?.consistency.status,'Consecutive decline');
});
