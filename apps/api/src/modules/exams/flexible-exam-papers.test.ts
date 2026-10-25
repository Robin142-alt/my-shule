import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePaperConfiguration } from './exam-paper-configuration.service';
import { ReportCardTemplateService } from './services/report-card-template.service';
import { summarize, type SubjectEvidence } from './analytics/analytics-engine';

const template=new ReportCardTemplateService();
const paper=(subject:string,name:string,score:number|null,max:number,status='entered')=>({
  subject_id:subject,subject_name:subject,assessment_name:name,score,max_score:max,score_status:status,
});
const build=(subjects:unknown[])=>template.buildPayload({school:{name:'School'},student:{full_name:'Learner'},
  subjects,grading_policy:{rules:[{label:'A',min:80,max:100},{label:'B',min:60,max:79},{label:'C',min:0,max:59}]},
  result_snapshot:{grade_label:'Y',percentage:99,position:1,cohort_size:20}},'2026-10-24T10:00:00.000Z');

test('reports combine maxima, display paper percentages and restore the configured grade',()=>{
  const result=build([paper('Maths','Paper 1',10,20),paper('Maths','Practical',60,80),paper('English','Oral',120,150)]);
  assert.equal(result.subjects[0].score,70);
  assert.equal(result.subjects[1].score,80);
  assert.equal(result.totals.percentage,75);
  assert.equal(result.totals.overall_grade,'B');
  const html=template.renderHtml(result,'FLEX').toString();
  assert.match(html,/Paper 1: 50%/);
  assert.match(html,/Practical: 75%/);
});

test('one X overrides every other excellent subject; Y has priority without discarding valid evidence',()=>{
  for(const status of ['X','Y']) {
    const result=build([paper('Maths','Paper 1',null,20,'X'),paper('Maths','Practical',80,80),
      paper('English','Oral',status==='Y'?null:150,150,status==='Y'?'Y':'entered')]);
    assert.equal(result.totals.overall_grade,status);
    for(const key of ['percentage','mean_score','total_score','total_max_score','class_position'] as const) assert.equal(result.totals[key],null);
    assert.equal(result.subjects[0].assessment_components?.[1].percentage,100);
    if(status==='X')assert.equal(result.subjects[1].score,100);
    assert.match(template.renderHtml(result,'FLEX').toString(),/Practical: 100%/);
  }
});

test('configuration validates maxima, duplicate identities, totals and all-or-none weighting',()=>{
  const valid={version:1,papers:[{name:'Oral',max_score:20,categories:[{name:'Speech',max_score:12},{name:'Listening',max_score:8}]}]};
  assert.doesNotThrow(()=>validatePaperConfiguration(valid));
  for(const input of [
    {...valid,version:0}, {...valid,papers:[]}, {...valid,papers:[{name:'Paper',max_score:NaN}]},
    {...valid,papers:[{name:'Paper',max_score:0}]}, {...valid,papers:[{name:'Paper',max_score:20.001}]},
    {...valid,papers:[{name:'Paper',max_score:20},{name:' PAPER ',max_score:80}]},
    {...valid,papers:[{name:'Paper',max_score:20,weight:1},{name:'Practical',max_score:80}]},
    {...valid,papers:[{...valid.papers[0],max_score:30}]},
  ]) assert.throws(()=>validatePaperConfiguration(input));
});

test('filtered analytics preserve subject results while withholding overall percentage and pass-all claims',()=>{
  const row={student_id:'student',average:99,overall_override:'Y',subject_weight:1,numeric_count:1,absent:0,
    boundaries:[{label:'A',min:80,max:100,is_pass:true,points:12}],policy_id:'policy'} as SubjectEvidence;
  const result=summarize([row]);
  assert.equal(result.mean,null);
  assert.equal(result.mean_grade,'Y');
  assert.equal(result.learners_passing_all,0);
  assert.equal(result.passed,1);
  assert.equal(summarize([{...row,overall_override:null,average:50},{...row,overall_override:null,average:90,subject_weight:3}]).mean,80);
});
