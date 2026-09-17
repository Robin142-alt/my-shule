import type { AcademicIntelligence } from './analytics-engine';
import type { AnalyticsPrintReport, AnalyticsReportSection } from './analytics-report-contract';

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
    title: {summary:'Exam analytics summary',learners:'Learner results',subjects:'Subject comparison',trends:'Exam performance trends',operations:'Exam readiness'}[section],
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
  if(section==='summary') {
    add('What needs attention',['Area','Finding'],data.summary.map(item=>[item.category,item.text]));
    add('Results and completion',['Measure','Count'],[
      ['Expected learners',String(data.performance.expected_learners)],['Learners with approved results',String(data.performance.learners_examined)],
      ['Learners requiring attention',String(data.risk.at_risk_count)],['Missing assessments',String(data.operations.missing)],
      ['Marks completion',number(data.operations.completion_rate,'%')],['Interventions overdue',String(data.interventions.overdue)],
    ]);
    add('Achievement distribution',['Grade / band','Results','Share'],data.distribution.map(item=>[item.label,String(item.count),number(item.percentage,'%')]));
  }
  if(section==='learners') {
    const first = data.learners.items.length ? (data.learners.page-1)*data.learners.page_size+1 : 0;
    add('Learner results',['Learner / admission','Class','Average','Grade','Change','Risk'],data.learners.items.map(item=>[
      `${item.student_name}\n${item.admission_number}`,item.class_name,number(item.average,'%'),item.mean_grade??'Ungraded',change(item.change),item.risk.level,
    ]),`Current page only: learners ${first}-${first ? first+data.learners.items.length-1 : 0} of ${data.learners.total} matching learners. Page ${data.learners.page}.`);
  }
  if(section==='subjects') add('Subject results',['Subject','Average','Grade','Pass rate','Change','At risk'],
    data.comparisons.filter(item=>item.dimension==='subject').map(item=>[item.label,number(item.mean,'%'),item.mean_grade??'Ungraded',number(item.pass_rate,'%'),change(item.change),String(item.at_risk_count)]));
  if(section==='trends') add('Exam history',['Exam','Average','Pass rate'],data.trends.map(item=>[item.exam_series_name,number(item.average_score,'%'),number(item.pass_rate,'%')]));
  if(section==='operations') add('Marks workflow',['State','Assessments'],(['expected','recorded','missing','absent','invalid','draft','submitted','reviewed','locked','published'] as const).map(key=>[key.charAt(0).toUpperCase()+key.slice(1),String(data.operations[key])]));
  const comparison = data.options.exams.find(item=>item.id===data.filters.comparison_exam_id);
  report.notes.push(comparison ? `Comparison: ${comparison.name} / ${comparison.term_name} / ${comparison.year_name}.` : 'No previous exam is available for comparison.');
  if(!data.data_quality.final_mark_count) report.notes.unshift('No approved academic results yet. Complete and approve marks before using this report for performance decisions.');
  return report;
}
