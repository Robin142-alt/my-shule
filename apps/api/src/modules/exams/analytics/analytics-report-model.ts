import type { AcademicIntelligence } from './analytics-engine';
import type { AnalyticsPrintReport, AnalyticsReportSection } from './analytics-report-contract';
import { ANALYTICS_REPORT_LABELS } from './analytics-report-contract';

const number = (value: number | null | undefined, suffix = '') => value == null || !Number.isFinite(value) ? 'Not available' : `${value.toFixed(1)}${suffix}`;
const change = (value: number | null | undefined) => value == null ? 'No comparison' : `${value > 0 ? '+' : ''}${number(value)} points`;
const names = { school: 'Whole school', department: 'Department', subject: 'Subject', grade: 'Grade / Form', class: 'Class', assignment: 'Teaching assignment' };
export function buildAnalyticsPrintReport(data: AcademicIntelligence, section: AnalyticsReportSection,
  identity: Pick<AnalyticsPrintReport, 'school_name' | 'school_address' | 'school_motto' | 'generated_by'>,
  documentNumber: string, generatedAt: string): AnalyticsPrintReport {
  const exam = data.options.exams.find(item => item.id === data.filters.exam_series_id);
  const filters: AnalyticsPrintReport['filters'] = [];
  const selected = (key: keyof typeof data.filters, label: string, items?: { id: string; name: string }[]) => {
    const value = data.filters[key];
    if (value) filters.push({ label, value: items?.find(item => item.id === value)?.name ?? String(value).replaceAll('_', ' ') });
  };
  selected('department_id', 'Department', data.options.departments);
  selected('subject_id', 'Subject', data.options.subjects);
  selected('class_section_id', 'Class', data.options.classes);
  selected('stream_id', 'Stream', data.options.streams);
  selected('grade_level', 'Grade / Form'); selected('teacher_user_id', 'Teacher', data.options.teachers);
  selected('risk_level', 'Learner risk'); selected('learner_query', 'Learner search');
  selected('learner_group', 'Learner group'); selected('grade', 'Achievement');
  selected('marks_status', 'Marks status'); selected('publication_status', 'Publication');
  const report: AnalyticsPrintReport = {
    ...identity, document_number: documentNumber, generated_at: generatedAt,
    title: ANALYTICS_REPORT_LABELS[section],
    scope: names[data.scope.level], exam: exam?.name ?? 'No exam evidence',
    period: exam ? `${exam.term_name} / ${exam.year_name}` : 'No period available', filters,
    generated_by: identity.generated_by,
    metrics: [
      {label:'Average score',value:number(data.performance.mean,'%')},
      {label:'Mean grade',value:data.performance.mean_grade ?? 'Not available'},
      {label:'Pass rate',value:number(data.performance.pass_rate,'%')},
      {label:'Change from comparison',value:change(data.change)},
    ], sections: [], notes: [
      'Internal academic review. This is an analytics snapshot, not a published learner report card.',
      'A subject result is one learner in one subject. Only approved numeric results contribute to averages. Missing work is never scored as zero.',
      data.performance.pass_denominator,
      'Summary statistics describe the selected academic scope. Learner search, risk and recognition filters narrow the learner list only.',
    ],
  };
  const add = (title:string,headers:string[],rows:string[][],note?:string) => report.sections.push({title,headers,rows,note});
  const includes=(...sections:AnalyticsReportSection[])=>section==='all'||sections.includes(section);
  if(includes('summary')) {
    add('What needs attention',['Area','Finding'],data.summary.map(item=>[item.category,item.text]));
    add('Results and completion',['Measure','Count'],[
      ['Expected learners',String(data.performance.expected_learners)],['Learners with approved results',String(data.performance.learners_examined)],
      ['Learners requiring attention',String(data.risk.at_risk_count)],['Missing assessments',String(data.operations.missing)],
      ['Marks completion',number(data.operations.completion_rate,'%')],['Interventions overdue',String(data.interventions.overdue)],
      ['High performers',String(data.risk.high_performers)],['Improved learners',String(data.risk.most_improved_count)],
    ]);
  }
  if(includes('summary','performance','exam-analysis')) {
    add('Performance evidence',['Measure','Value'],[
      ['Expected learners',String(data.performance.expected_learners)],['Learners examined',String(data.performance.learners_examined)],
      ['Learners passing all subjects',String(data.performance.learners_passing_all)],['Learners failing any subject',String(data.performance.learners_failing_any)],
      ['Assessment attendance',number(data.performance.attendance_rate,'%')],['Assessment absenteeism',number(data.performance.absenteeism_rate,'%')],
      ['Learners with absences',String(data.performance.learners_absent)],['Passed subject results',String(data.performance.passed)],
      ['Failed subject results',String(data.performance.failed)],['Failure rate',number(data.performance.failure_rate,'%')],
    ]);
    add('Achievement distribution',['Grade / band','Score range','Results','Share','Previous count'],data.distribution.map(item=>[
      item.label,item.min===null?'Ungraded':`${item.min}-${item.max}`,String(item.count),number(item.percentage,'%'),String(item.previous_count??'No comparison')]));
  }
  if(includes('learners','risk')) {
    const first = data.learners.items.length ? (data.learners.page-1)*data.learners.page_size+1 : 0;
    const learners=section==='risk'?data.learners.items.filter(item=>item.risk.level!=='Low'):data.learners.items;
    add('Learner results',['Learner / admission','Class','Average','Grade','Change','Risk'],learners.map(item=>[
      `${item.student_name}\n${item.admission_number}`,item.class_name,number(item.average,'%'),item.mean_grade??'Ungraded',change(item.change),item.risk.level,
    ]),data.learners.coverage==='all'?`All matching learners: ${learners.length}${section==='risk'?' requiring attention':''}. Learner filters apply; no pagination limit.`:`Current page only: learners ${first}-${first ? first+data.learners.items.length-1 : 0} of ${data.learners.total} matching learners. Page ${data.learners.page}.`);
    add('Learner support evidence',['Learner / admission','Previous average','Passed / failed','Missing / absent','Risk reasons','Consistency'],learners.map(l=>[
      `${l.student_name}\n${l.admission_number}`,number(l.previous_average,'%'),`${l.subjects_passed} / ${l.subjects_failed}`,`${l.missing} / ${l.absent}`,l.risk.reasons.join('\n')||'No current triggers',l.consistency.status]));
    add('Learner-subject results',['Learner / admission','Subject','Average / grade','Previous','Change','Missing / absent'],learners.flatMap(l=>l.subjects.map(s=>[
      `${l.student_name}\n${l.admission_number}`,s.subject_name,`${number(s.average,'%')} / ${s.grade??'Ungraded'}`,number(s.previous_average,'%'),change(s.change),`${s.missing} / ${s.absent}`])),
      'The student-by-subject table is listed vertically to keep every subject readable on A4.');
    add('Learner history',['Learner / admission','Exam','Date','Average'],learners.flatMap(l=>l.history.map(h=>[`${l.student_name}\n${l.admission_number}`,h.exam_name,h.date,number(h.average,'%')])));
    add('Learner progress details',['Learner / admission','Strongest / weakest','Total points','Improved / declined subjects','Recent / historical average','Best / weakest / variability'],learners.map(l=>[
      `${l.student_name}\n${l.admission_number}`,`${l.strongest_subject??'Not available'} / ${l.weakest_subject??'Not available'}`,String(l.total_points??'Not applicable'),
      `${l.subjects_improved} / ${l.subjects_declined}`,`${number(l.consistency.recent_average)} / ${number(l.historical_average)}`,`${number(l.consistency.best)} / ${number(l.consistency.weakest)} / ${number(l.consistency.variability)}`]));
    add('Learner positions',['Learner / admission','Class','Stream','Grade / Form','Previous class','Movement'],learners.filter(l=>l.positions).map(l=>[
      `${l.student_name}\n${l.admission_number}`,String(l.positions!.class??'Not available'),String(l.positions!.stream??'Not available'),String(l.positions!.grade??'Not available'),String(l.previous_positions?.class??'Not available'),String(l.position_movement??'Not available')]),data.availability.ranking);
    add('Subject positions',['Learner / admission','Subject','Current','Previous'],learners.flatMap(l=>(l.positions?.subjects??[]).map(s=>[
      `${l.student_name}\n${l.admission_number}`,l.subjects.find(subject=>subject.subject_id===s.subject_id)?.subject_name??s.subject_id,String(s.position??'Not available'),String(l.previous_positions?.subjects.find(p=>p.subject_id===s.subject_id)?.position??'Not available')])));
  }
  if(includes('subjects','comparisons')) {
    for(const dimension of ['subject','class','stream','grade','department','teacher'] as const){
      if(section==='subjects'&&dimension!=='subject')continue;
      const rows=data.comparisons.filter(item=>item.dimension===dimension);
      const title={subject:'Subject',class:'Class',stream:'Stream',grade:'Grade / Form',department:'Department',teacher:'Teacher allocation'}[dimension];
      add(`${title} comparison`,['Area','Average / grade','Pass rate','Change','At risk','Marks complete'],rows.map(item=>[
        item.label+(dimension==='subject'&&item.heads_of_subject.length?`\nHOS: ${item.heads_of_subject.map(h=>h.name).join(', ')}`:''),`${number(item.mean,'%')} / ${item.mean_grade??'Ungraded'}`,number(item.pass_rate,'%'),change(item.change),String(item.at_risk_count),number(item.marks_completion,'%')]));
      add(`${title} history and consistency`,['Area','Previous average','Historical average','Previous pass rate','Pass-rate change','Consistency'],rows.map(item=>[
        item.label,number(item.previous_mean),number(item.historical_average),number(item.previous_pass_rate,'%'),change(item.pass_rate_change),item.consistency.status]));
    }
    add('Exam comparison',['Measure','Current','Comparison','Change'],[
      ['Average score',number(data.performance.mean),number(data.previous.mean),change(data.change)],
      ['Mean grade',data.performance.mean_grade??'Ungraded',data.previous.mean_grade??'Ungraded','Configured grading policy'],
      ['Pass rate',number(data.performance.pass_rate,'%'),number(data.previous.pass_rate,'%'),data.performance.pass_rate!==null&&data.previous.pass_rate!==null?change(data.performance.pass_rate-data.previous.pass_rate):'No comparison'],
    ]);
    add('Period comparisons',['Period','Current average','Previous average','Change','Pass-rate change'],data.period_comparisons.map(p=>[p.name,number(p.current.mean),number(p.previous.mean),change(p.change),change(p.pass_rate_change)]));
    report.notes.push('Teacher allocation comparisons describe authorized class and subject results, not teacher effectiveness.');
  }
  if(includes('trends')) {
    add('Exam history',['Exam','Average','Pass rate','Learners'],data.trends.map(item=>[item.exam_series_name,number(item.average_score,'%'),number(item.pass_rate,'%'),String(item.learners_examined)]));
    add('Historical benchmarks',['Benchmark','Average','Pass rate','Change'],data.benchmarks.map(b=>[b.name,number(b.mean),number(b.pass_rate,'%'),change(b.change)]));
    for(const [title,rows] of [['Term trends',data.period_trends.terms],['Year trends',data.period_trends.years]] as const)
      add(title,['Period','Average','Grade','Pass rate','Learners'],rows.map(p=>[p.name,number(p.mean),p.mean_grade??'Ungraded',number(p.pass_rate,'%'),String(p.learners_examined)]));
    add('Subject performance',['Subject','Mean score','Pass rate'],data.subjectPerformance.map(s=>[s.subject_name,number(s.mean_score),number(s.pass_rate,'%')]));
  }
  if(includes('operations')) {
    add('Marks workflow',['State','Assessments','Share of expected'],(['expected','recorded','missing','absent','invalid','draft','submitted','reviewed','locked','published'] as const).map(key=>[key.charAt(0).toUpperCase()+key.slice(1),String(data.operations[key]),number(data.operations.expected?data.operations[key]/data.operations.expected*100:null,'%')]));
    add('Data quality',['Measure','Count'],[['Approved numeric assessments',String(data.data_quality.final_mark_count)],['Explicit non-numeric evidence',String(data.data_quality.explicit_evidence_count)],['Missing or incomplete',String(data.data_quality.missing_or_incomplete_count)],['Invalid marks',String(data.data_quality.invalid_marks)],['Ungraded numeric results',String(data.data_quality.ungraded_results)]]);
  }
  if(includes('reports','operations')) add('Report-card readiness',['Status','Learners'],[
    ...data.operations.report_cards.map(r=>[r.status.replaceAll('_',' '),String(r.count)]),['Not approved or published',String(data.operations.incomplete_report_cards)]]);
  if(includes('risk','advanced')) {
    add('Risk distribution',['Risk','Learners'],data.risk.distribution.map(r=>[r.level,String(r.count)]));
    add('Risk movement',['Measure','Learners'],Object.entries(data.risk.movement).map(([key,value])=>[key.replaceAll('_',' '),String(value)]));
  }
  if(includes('advanced','performance','exam-analysis')) {
    add('Score profile',['Statistic','Value'],[
      ['Median',number(data.performance.median)],['Highest learner average',number(data.performance.highest)],['Lowest learner average',number(data.performance.lowest)],
      ['Score range',number(data.performance.range)],['Standard deviation',number(data.performance.standard_deviation)],
      ['Lower quartile (25th percentile)',number(data.analysis.quartiles.lower)],['Upper quartile (75th percentile)',number(data.analysis.quartiles.upper)],['Interquartile range',number(data.analysis.quartiles.interquartile_range)],
    ],'Quartiles use linear interpolation of approved learner averages. Missing results are excluded.');
    add('Learner score bands',['Average score range','Learners','Share'],data.analysis.score_bands.map(b=>[b.label,String(b.count),number(b.percentage,'%')]),'Descriptive score ranges, not grading-policy pass thresholds.');
    const c=data.analysis.coverage;
    add('Approved result coverage',['Measure','Value'],[['Complete learners',String(c.complete)],['Partial results',String(c.partial)],['Without approved results',String(c.without_results)],['Approved assessments',String(c.approved_assessments)],['Expected assessments',String(c.expected_assessments)],['Approval coverage',number(c.approval_rate,'%')]],'Complete means every expected assessment has an approved numeric result. Partial averages may change when outstanding marks are approved.');
    add('Subject support priorities',['Subject','Failed results','Within 5 points of passing','Missing','Absent','Median'],data.analysis.subject_support.map(s=>[s.subject_name,String(s.failed),String(s.near_pass),String(s.missing),String(s.absent),number(s.median)]),'Near-pass counts use each result’s configured grading policy; ungraded and missing results are excluded.');
  }
  if(includes('advanced','comparisons','exam-analysis')) {
    const m=data.analysis.matched_progress;
    add('Matched learner progress',['Measure','Value'],[['Matched learners',String(m.matched_learners)],['Matched learner-subject results',String(m.matched_results)],['Current average',number(m.current_mean)],['Comparison average',number(m.previous_mean)],['Change',change(m.change)],['Improved',String(m.improved)],['Stable',String(m.stable)],['Declined',String(m.declined)],['Excluded current results',String(m.excluded_current_results)]],
      'Matches the same learner, subject and grading policy across both exams. Each learner has equal weight. Stable means a change within 2 points. Assessment content may differ.');
  }
  if(includes('advanced')) {
    add('Performance gaps',['Area','Strongest','Weakest','Gap'],data.gaps.map(g=>[g.dimension,g.strongest??'Not available',g.weakest??'Not available',number(g.gap,' points')]));
    add('Band movement',['Direction','Results'],Object.entries(data.band_movement).map(([key,value])=>[key,String(value)]),'Matched learner-subject results using the same grading policy.');
    for(const cohort of data.cohorts)add(`Cohort progression: ${cohort.id}`,['Exam','Date','Grade / Form','Average','Pass rate','Learners'],cohort.progression.map(p=>[p.exam_name,p.date,p.grade??'Not set',number(p.mean),number(p.pass_rate,'%'),String(p.learners_examined)]));
    add('Evidence limits',['Area','Explanation'],[['Ranking',data.availability.ranking],['Cohorts',data.availability.cohort]]);
    add('Risk and trend thresholds',['Rule','Value'],Object.entries(data.risk.rules).map(([key,value])=>[key.replaceAll('_',' '),String(value)]));
  }
  if(includes('targets','interventions')) {
    add('Academic targets',['Status','Explanation'],[['No target configured',data.targets.reason]]);
    add('Intervention summary',['Measure','Value'],[['Total',String(data.interventions.total)],['Open',String(data.interventions.open)],['Overdue',String(data.interventions.overdue)],['Completed',String(data.interventions.completed)],['Measured outcomes',String(data.interventions.measured_outcomes)],['Improved among measured outcomes',number(data.interventions.success_rate,'%')]]);
    add('Intervention follow-up',['Reference / status','Review date','Before','After','Change','Target / outcome'],data.interventions.items.map(i=>[
      `${i.id}\n${i.status}`,i.due_on??'Not set',number(i.pre_result),number(i.post_result),change(i.change),`${number(i.target_result.target)} / ${i.target_result.status}`]),
      `Includes ${data.interventions.items.length} of ${data.interventions.total} interventions. Improvement among completed interventions with before/after evidence does not imply causation.`);
  }
  if(includes('exam-analysis'))add('Question analysis',['Availability','Next step'],[[data.availability.question_analysis,'Record question-by-question marks before drawing question-level conclusions.']]);
  report.notes.push(...data.data_quality.notes);
  const comparison = data.options.exams.find(item=>item.id===data.filters.comparison_exam_id);
  report.notes.push(comparison ? `Comparison: ${comparison.name} / ${comparison.term_name} / ${comparison.year_name}.` : 'No previous exam is available for comparison.');
  if(!data.data_quality.final_mark_count) report.notes.unshift('No approved academic results yet. Complete and approve marks before using this report for performance decisions.');
  return report;
}
