import { numeric, summarize, gradeFor, type CoreAcademicIntelligence, type SubjectEvidence } from './analytics-engine';
import type { AnalyticsFilters } from './analytics-contract';
import { InvalidAnalyticSelectionError, OVERVIEW_ANALYTICS, type AnalyticRow, type AnalyticValue, type AnalyticsLibrary, type LibraryAnalytic, type LibraryCategory } from './analytics-library-contract';

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const mean = (values: number[]) => values.length ? round(values.reduce((a,b)=>a+b,0)/values.length) : null;
const change = (a: number | null, b: number | null) => a===null||b===null ? null : round(a-b);
const rate = (n: number, d: number) => d ? round(n/d*100) : null;
const row = (values: AnalyticValue[], drill?: Record<string,string>): AnalyticRow => ({values, ...(drill?{drill}:{})});
function group<T>(values:T[], key:(value:T)=>string) {
  const result=new Map<string,T[]>();
  for(const value of values){const id=key(value); const entries=result.get(id); if(entries)entries.push(value);else result.set(id,[value]);}
  return result;
}
const score = (r:SubjectEvidence) => numeric(r.average);
const approvedNote = 'Approved numeric results only; missing or absent work is not zero. Each learner has equal weight; subjects have equal weight within each learner after assessment weighting.';
const progressNote = 'Descriptive changes in percentage points. Cohorts, subject mix and assessment difficulty can change. Use matched progress for same-learner, same-subject, same-policy comparisons; it does not establish equal exam difficulty.';
const historyNote = 'Only loaded cycles through the selected exam are included. Periods may be incomplete. Historical placements are used; current classes are not projected backwards.';

/** Library filtering happens AFTER the SQL authorization boundary so benchmarks can retain
 * their authorized parent population. This function cannot expand a role's scope. */
export function filterLibraryEvidence(rows: SubjectEvidence[], filters: AnalyticsFilters) {
  return rows.filter(r=>(!filters.department_id||r.department_id===filters.department_id)
    &&(!filters.subject_id||r.subject_id===filters.subject_id)&&(!filters.grade_level||r.grade_level===filters.grade_level)
    &&(!filters.class_section_id||r.class_section_id===filters.class_section_id)&&(!filters.stream_id||r.stream_id===filters.stream_id)
    &&(!filters.teacher_user_id||r.teachers?.some(t=>t.id===filters.teacher_user_id))
    &&(!filters.student_id||r.student_id===filters.student_id));
}

export function buildAnalyticsLibrary(evidence:SubjectEvidence[], authorized:SubjectEvidence[], data:CoreAcademicIntelligence, filters:AnalyticsFilters, forReport:boolean):AnalyticsLibrary {
  const current=evidence.filter(r=>r.exam_series_id===data.filters.exam_series_id);
  const previous=evidence.filter(r=>r.exam_series_id===data.filters.comparison_exam_id);
  const exam=data.options.exams.find(e=>e.id===data.filters.exam_series_id);
  const through=evidence.filter(r=>exam&&r.exam_date<=exam.date);
  const cycles=group(through,r=>r.exam_series_id);
  const learners=data.learners.items;
  const comparisons=data.comparisons;
  const specs:{meta:Omit<LibraryAnalytic,'rows'>; build:()=>AnalyticRow[]}[]=[];
  function add(id:string,category:LibraryCategory,title:string,question:string,columns:string[],build:()=>AnalyticRow[],note=approvedNote,kind:LibraryAnalytic['kind']='table',value_column?:number) {
    specs.push({meta:{id,category,title,question,columns,note,kind,value_column,total:0,page:1,page_size:25},build});
  }
  function metric(id:string,title:string,value:AnalyticValue,unit:string,note=approvedNote) {
    add(id,'Performance',title,`What is the ${title.toLowerCase()} in this selection?`,['Measure','Value','Unit'],()=>[row([title,value,unit])],note,'metric',1);
  }
  const p=data.performance, coverage=data.analysis.coverage, matched=data.analysis.matched_progress;
  metric('mean','Average score',p.mean,'%');
  metric('median','Median score',p.median,'%');
  metric('mean-grade','Mean grade',p.mean_grade,'Configured grade','Available only when a single grading policy covers the selection.');
  metric('pass-rate','Pass rate',p.pass_rate,'%',`${p.pass_denominator}. Missing and ungraded results are excluded; no pass boundary is invented.`);
  metric('failure-rate','Failure rate',p.failure_rate,'%',`${p.pass_denominator}. Uses configured pass boundaries.`);
  metric('highest','Highest learner average',p.highest,'%');
  metric('lowest','Lowest learner average',p.lowest,'%');
  metric('spread','Performance range',p.range,'points');
  metric('deviation','Standard deviation',p.standard_deviation,'points','Population standard deviation of learner averages in the selected exam. Describes spread, not exam reliability.');
  metric('quartile-lower','Lower quartile',data.analysis.quartiles.lower,'%','25th percentile of learner averages using linear interpolation.');
  metric('quartile-upper','Upper quartile',data.analysis.quartiles.upper,'%','75th percentile of learner averages using linear interpolation.');
  metric('interquartile-range','Interquartile range',data.analysis.quartiles.interquartile_range,'points','Middle 50% of learner averages; upper quartile minus lower quartile.');
  metric('coverage','Approved assessment coverage',coverage.approval_rate,'%',`${coverage.approved_assessments} approved numeric assessments / ${coverage.expected_assessments} expected assessments.`);
  metric('examined','Learners with results',p.learners_examined,'learners');
  metric('matched-growth','Matched progress',matched.change,'points',`Same learners, subjects and grading policies: ${matched.matched_learners} learners, ${matched.matched_results} subject results; ${matched.excluded_current_results} current numeric results excluded. ${progressNote}`);
  metric('exam-change','Change from comparison exam',data.change,'points',progressNote);
  const comparisonDimension=filters.comparison_dimension??'class';
  const comparisonKey:Record<typeof comparisonDimension,keyof SubjectEvidence>={student:'student_id',class:'class_section_id',stream:'stream_id',subject:'subject_id',exam:'exam_series_id',term:'academic_term_id',year:'academic_year_id'};
  const comparisonLabel:Record<typeof comparisonDimension,keyof SubjectEvidence>={student:'student_name',class:'class_name',stream:'stream_name',subject:'subject_name',exam:'exam_name',term:'term_name',year:'year_name'};
  const comparisonGroups=group((['exam','term','year'].includes(comparisonDimension)?through:current).filter(r=>r[comparisonKey[comparisonDimension]]),r=>String(r[comparisonKey[comparisonDimension]]));
  const comparisonOptions=[...comparisonGroups].map(([id,rs])=>({id,name:comparisonDimension==='student'?`${rs[0].student_name} · ${rs[0].admission_number}`:comparisonDimension==='term'?`${rs[0].term_name} · ${rs[0].year_name}`:String(rs[0][comparisonLabel[comparisonDimension]])})).sort((a,b)=>a.name.localeCompare(b.name));
  add('focused-comparison','Comparisons','Compare any two','How do two selected populations compare?',['Measure','Left selection','Right selection','Difference (pp)'],()=>{
    const leftId=filters.compare_left_id??comparisonOptions[0]?.id,rightId=filters.compare_right_id??comparisonOptions.find(o=>o.id!==leftId)?.id;
    const left=comparisonGroups.get(leftId??'')??[],right=comparisonGroups.get(rightId??'')??[];
    const a=summarize(left),b=summarize(right);
    return [row(['Selected '+comparisonDimension,comparisonOptions.find(o=>o.id===leftId)?.name??'No selection',comparisonOptions.find(o=>o.id===rightId)?.name??'No selection',null]),
      row(['Average %',a.mean,b.mean,change(a.mean,b.mean)]),row(['Median %',a.median,b.median,change(a.median,b.median)]),row(['Pass rate %',a.pass_rate,b.pass_rate,change(a.pass_rate,b.pass_rate)]),
      row(['Highest %',a.highest,b.highest,change(a.highest,b.highest)]),row(['Lowest %',a.lowest,b.lowest,change(a.lowest,b.lowest)]),row(['Spread (pp)',a.range,b.range,change(a.range,b.range)]),
      row(['Standard deviation',a.standard_deviation,b.standard_deviation,change(a.standard_deviation,b.standard_deviation)]),row(['Learners with results',a.learners_examined,b.learners_examined,null]),row(['Mean grade',a.mean_grade,b.mean_grade,null])];
  },`Left minus right; unavailable evidence remains unavailable. ${approvedNote} ${progressNote} ${historyNote}`);
  add('result-coverage','Performance','Result completeness','How complete is the evidence?',['Coverage','Learners'],()=>[
    row(['Complete',coverage.complete]),row(['Partial',coverage.partial]),row(['Without approved scores',coverage.without_results])],
  'Complete means an approved numeric result for every expected assessment. Partial scores can change as marking is completed.','bar',1);
  add('achievement','Performance','Achievement and attendance','How many learners are achieving and taking assessments?',['Measure','Value'],()=>[
    row(['Passing all graded subjects',p.learners_passing_all]),row(['Failing any graded subject',p.learners_failing_any]),
    row(['Assessment attendance (%)',p.attendance_rate]),row(['Assessment absenteeism (%)',p.absenteeism_rate]),row(['Ungraded subject results',p.ungraded_results])],
  'Pass outcomes describe available graded subjects, not a complete report. Attendance denominator is scored plus explicitly absent assessments.');

  for(const dimension of ['class','stream','subject','department','grade','teacher'] as const) {
    const areas=comparisons.filter(c=>c.dimension===dimension);
    const category:LibraryCategory=dimension==='subject'||dimension==='teacher'?'Subjects':dimension==='class'||dimension==='stream'?'Classes & Streams':'Comparisons';
    const name=dimension==='teacher'?'Teacher / subject allocations':dimension==='class'?'Classes':dimension==='grade'?'Grades / forms':`${dimension[0].toUpperCase()}${dimension.slice(1)}s`;
    const note=dimension==='teacher'?`${approvedNote} Allocations overlapping the exam dates are descriptive associations, not measures of teacher effectiveness. Shared allocations are shown together.`:approvedNote;
    add(`${dimension}-performance`,category,`${name}: performance`,`How do ${name.toLowerCase()} compare?`,['Area','Average %','Median %','Pass %','Learners','Change (pp)'],()=>[...areas].sort((a,b)=>(b.mean??-1)-(a.mean??-1)).map(c=>row([c.label,c.mean,c.median,c.pass_rate,c.learners_examined,c.change],c.drill_down)),`${note} ${progressNote}`,'bar',1);
    add(`${dimension}-movement`,category,`${name}: improvement and decline`,`Which ${name.toLowerCase()} changed most?`,['Area','Previous %','Current %','Change (pp)','Historical %','Trend'],()=>[...areas].filter(c=>c.change!==null).sort((a,b)=>b.change!-a.change!).map(c=>row([c.label,c.previous_mean,c.mean,c.change,c.historical_average,c.consistency.status],c.drill_down)),progressNote,'bar',3);
    add(`${dimension}-spread`,category,`${name}: gaps and consistency`,`Where is performance most varied?`,['Area','Lowest %','Highest %','Range (pp)','Deviation','History deviation'],()=>[...areas].sort((a,b)=>(b.range??-1)-(a.range??-1)).map(c=>row([c.label,c.lowest,c.highest,c.range,c.standard_deviation,c.consistency.variability],c.drill_down)),`${approvedNote} History variability needs at least three exams. Within-exam spread and between-exam variability measure different things.`);
    add(`${dimension}-history`,'Trends',`${name}: historical performance`,`How have ${name.toLowerCase()} changed across exams?`,['Area','Exam','Average %','Pass %','Learners'],()=>areas.flatMap(c=>c.history.map(h=>row([c.label,h.exam,h.mean,h.pass_rate,h.learners_examined],c.drill_down))),`${historyNote} ${progressNote}`);
  }
  for(const dimension of ['class','stream'] as const) {
    const key=(r:SubjectEvidence)=>dimension==='class'?r.class_section_id:r.stream_id;
    const populations=group(current.filter(r=>key(r)),r=>`${key(r)}|${r.subject_id}`);
    add(`subject-${dimension}-matrix`,'Subjects',`Subjects across ${dimension==='class'?'classes':'streams'}`,`Where is each subject strongest and weakest?`,['Subject',dimension==='class'?'Class':'Stream','Average %','Pass %','Learners','Spread (pp)'],()=>[...populations.values()].map(rs=>{const s=summarize(rs);return row([rs[0].subject_name,dimension==='class'?rs[0].class_name:rs[0].stream_name,s.mean,s.pass_rate,s.learners_examined,s.range],{subject_id:rs[0].subject_id,[dimension==='class'?'class_section_id':'stream_id']:key(rs[0])!});}),approvedNote,'matrix',2);
  }
  add('subject-support','Subjects','Subject support priorities','Which subjects need academic follow-up?',['Subject','Failed results','Near pass','Missing','Absent','Median %'],()=>data.analysis.subject_support.map(s=>row([s.subject_name,s.failed,s.near_pass,s.missing,s.absent,s.median],{subject_id:s.subject_id})),
  'Near pass: failed subject results within five points below a configured passing band. Lower scores may reflect assessment difficulty, preparation or cohort differences; they do not prove a subject is inherently difficult.');

  const trendRows=data.trends;
  add('exam-trend','Trends','Performance over time','Is academic performance improving?',['Exam','Average %','Median %','Pass %','Learners','Date'],()=>trendRows.map(t=>row([t.name,t.mean,t.median,t.pass_rate,t.learners_examined,t.date],{exam_series_id:t.id,academic_year_id:t.academic_year_id,academic_term_id:t.academic_term_id})),`${historyNote} ${progressNote}`,'line',1);
  for(const dimension of ['terms','years'] as const) {
    add(`${dimension}-trend`,'Trends',dimension==='terms'?'Term-to-term performance':'Year-to-year performance','How do academic periods compare?',['Period','Average %','Median %','Pass %','Learners'],()=>data.period_trends[dimension].map(t=>row([t.name,t.mean,t.median,t.pass_rate,t.learners_examined],{[dimension==='terms'?'academic_term_id':'academic_year_id']:t.id,exam_series_id:'',...(dimension==='years'?{academic_term_id:''}:{academic_year_id:''})})),`${historyNote} Learners have equal weight across available subject/exam results; periods are descriptive aggregates, not official weighted term grades.`,'line',1);
  }
  add('period-comparison','Comparisons','Academic period comparisons','How do the current term and year compare with earlier periods?',['Comparison','Current %','Previous %','Change (pp)','Pass change (pp)'],()=>data.period_comparisons.map(t=>row([t.name,t.current.mean,t.previous.mean,t.change,t.pass_rate_change])),`${historyNote} ${progressNote}`);
  add('historical-benchmarks','Comparisons','Current vs historical benchmarks','How does this exam compare with its history?',['Benchmark','Reference %','Current %','Difference (pp)','Learners'],()=>data.benchmarks.map(b=>row([b.name,b.mean,p.mean,b.change,b.learners_examined])),`${historyNote} ${progressNote}`,'bar',3);
  add('best-exams','Trends','Best and weakest exams','Which historical exams recorded the highest and lowest averages?',['Exam','Average %','Pass %','Learners','Date'],()=>[...trendRows].filter(t=>t.mean!==null).sort((a,b)=>b.mean!-a.mean!).map(t=>row([t.name,t.mean,t.pass_rate,t.learners_examined,t.date],{exam_series_id:t.id,academic_year_id:t.academic_year_id,academic_term_id:t.academic_term_id})),progressNote,'bar',1);
  add('momentum','Trends','Performance momentum','Is the direction of change accelerating?',['Exam','Average %','Change (pp)','Change in growth (pp)','Learners'],()=>trendRows.map((t,i)=>{const growth=change(t.mean,trendRows[i-1]?.mean??null),prior=change(trendRows[i-1]?.mean??null,trendRows[i-2]?.mean??null);return row([t.name,t.mean,growth,change(growth,prior),t.learners_examined]);}),`Momentum is the difference between successive exam-to-exam changes, not a forecast. ${progressNote}`,'line',2);

  const authorizedCurrent=authorized.filter(r=>r.exam_series_id===data.filters.exam_series_id);
  const context=authorizedCurrent.filter(r=>(!filters.subject_id||r.subject_id===filters.subject_id));
  const classGroups=group(context,r=>r.class_section_id), streamGroups=group(context,r=>r.stream_id??'');
  const classMeans=new Map([...classGroups].map(([id,rs])=>[id,summarize(rs).mean]));
  const streamMeans=new Map([...streamGroups].map(([id,rs])=>[id,summarize(rs).mean]));
  const schoolMean=summarize(context).mean;
  const placements=new Map(current.map(r=>[r.student_id,r]));
  add('parent-benchmarks','Comparisons','Selection vs parent populations','How does this selection compare with its class, stream and school?',['Population','Average %','Selection %','Difference (pp)','Learners'],()=>{
    const sets:{name:string;rs:SubjectEvidence[]}[]=[{name:data.scope.level==='school'?'School':'Authorized responsibility',rs:context}];
    if(filters.class_section_id)sets.push({name:classGroups.get(filters.class_section_id)?.[0]?.class_name??'Selected class',rs:classGroups.get(filters.class_section_id)??[]});
    if(filters.stream_id)sets.push({name:streamGroups.get(filters.stream_id)?.[0]?.stream_name??'Selected stream',rs:streamGroups.get(filters.stream_id)??[]});
    return sets.map(({name,rs})=>{const s=summarize(rs);return row([name,s.mean,p.mean,change(p.mean,s.mean),s.learners_examined]);});
  },`Parent populations retain the subject selection, but remove child/student filters. Only the user's authorized responsibility is used. ${approvedNote}`,'bar',1);
  add('student-benchmarks','Students','Learners vs class, stream and school','Who is above or below their reference populations?',['Learner / admission','Average %','Class gap (pp)','Stream gap (pp)',data.scope.level==='school'?'School gap (pp)':'Scope gap (pp)'],()=>learners.map(l=>{const placement=placements.get(l.student_id);return row([`${l.student_name} · ${l.admission_number}`,l.average,change(l.average,classMeans.get(l.class_section_id)??null),change(l.average,streamMeans.get(placement?.stream_id??'')??null),change(l.average,schoolMean)],{student_id:l.student_id});}),`Gaps compare available learner averages; subject selection is retained for reference groups. ${approvedNote}`);
  add('student-profiles','Students','Student performance profiles','What are each learner’s strengths and support needs?',['Learner / admission','Average %','Strongest subject','Weakest subject','Risk','Evidence'],()=>learners.map(l=>row([`${l.student_name} · ${l.admission_number}`,l.average,l.strongest_subject,l.weakest_subject,l.risk.level,l.risk.reasons.join('; ')||'No current risk triggers'],{student_id:l.student_id})),approvedNote);
  add('student-subjects','Students','Student subject profiles','How does each learner perform across subjects?',['Learner / admission','Subject','Average %','Grade','Previous %','Change (pp)'],()=>learners.flatMap(l=>l.subjects.map(s=>row([`${l.student_name} · ${l.admission_number}`,s.subject_name,s.average,s.grade,s.previous_average,s.change],{student_id:l.student_id,subject_id:s.subject_id}))),progressNote,'matrix',2);
  add('student-history','Students','Student progress over time','How has each learner progressed across exams?',['Learner / admission','Exam','Date','Average %'],()=>learners.flatMap(l=>[...l.history.map(h=>row([`${l.student_name} · ${l.admission_number}`,h.exam_name,h.date,h.average],{student_id:l.student_id,exam_series_id:h.exam_series_id,academic_year_id:'',academic_term_id:''})),row([`${l.student_name} · ${l.admission_number}`,exam?.name??'Selected exam',exam?.date??'',l.average],{student_id:l.student_id})]),`${historyNote} ${progressNote}`);
  const studentList=(id:string,title:string,question:string,select:()=>typeof learners,note=progressNote)=>add(id,'Students',title,question,['Learner / admission','Average %','Change (pp)','Historical %','History deviation','Pattern'],()=>select().map(l=>row([`${l.student_name} · ${l.admission_number}`,l.average,l.change,l.historical_average,l.consistency.variability,l.consistency.status],{student_id:l.student_id})),note);
  studentList('student-improvement','Most improved learners','Which learners improved most?',()=>learners.filter(l=>(l.change??0)>0).sort((a,b)=>b.change!-a.change!));
  studentList('student-decline','Most declined learners','Which learners declined most?',()=>learners.filter(l=>(l.change??0)<0).sort((a,b)=>a.change!-b.change!));
  studentList('sustained-improvement','Sustained learner improvement','Who improved across at least three exams?',()=>learners.filter(l=>l.consistency.consecutive_improvement>=2));
  studentList('sustained-decline','Sustained learner decline','Who declined across at least three exams?',()=>learners.filter(l=>l.consistency.consecutive_decline>=2));
  studentList('consistent-excellence','Consistently excelling learners','Who repeatedly reaches the highest configured band?',()=>learners.filter(l=>l.consistently_high),'Highest configured band in every available subject in the current and two previous exams; missing evidence does not count as excellence.');
  studentList('student-volatility','Learner stability and volatility','Whose recent results vary most?',()=>learners.filter(l=>l.consistency.variability!==null).sort((a,b)=>b.consistency.variability!-a.consistency.variability!),'Population deviation of the latest five available exam averages. At least three exams are required. Variation is not a diagnosis or a forecast.');
  studentList('exceptional-change','Exceptional improvement or decline','Who changed by at least ten points?',()=>learners.filter(l=>l.change!==null&&Math.abs(l.change)>=10).sort((a,b)=>Math.abs(b.change!)-Math.abs(a.change!)),`Ten percentage points is a disclosed review threshold, not statistical significance. ${progressNote}`);
  add('repeated-struggle','Students','Repeated subject struggles','Which learners failed the same subject in successive exams?',['Learner / admission','Subject','Previous %','Current %','Grade'],()=>{
    const prior=new Map(previous.map(r=>[`${r.student_id}|${r.subject_id}`,r]));
    return current.flatMap(r=>{const old=prior.get(`${r.student_id}|${r.subject_id}`);return old&&r.policy_id&&old.policy_id===r.policy_id&&gradeFor(score(r),r.boundaries)?.is_pass===false&&gradeFor(score(old),old.boundaries)?.is_pass===false?[row([`${r.student_name} · ${r.admission_number}`,r.subject_name,score(old),score(r),gradeFor(score(r),r.boundaries)?.label??null],{student_id:r.student_id,subject_id:r.subject_id})]:[];});
  },'Same learner, subject and grading policy in both exams; only configured failing bands count.');

  const rankNote=data.availability.ranking+' These positions are descriptive and are not official published report-card positions. Different subject coverage can affect ordering.';
  add('learner-rankings','Rankings','Student rankings and movement','How have permitted student positions changed?',['Learner / admission','Class rank','Stream rank','Grade rank','Previous class rank','Movement'],()=>learners.filter(l=>l.positions).sort((a,b)=>(a.positions?.class??Infinity)-(b.positions?.class??Infinity)).map(l=>row([`${l.student_name} · ${l.admission_number}`,l.positions!.class,l.positions!.stream,l.positions!.grade,l.previous_positions?.class??null,l.position_movement],{student_id:l.student_id})),rankNote);
  add('learner-subject-rankings','Rankings','Student subject rankings','How do learners rank within a subject?',['Learner / admission','Subject','Position','Previous position'],()=>learners.flatMap(l=>(l.positions?.subjects??[]).map(s=>row([`${l.student_name} · ${l.admission_number}`,l.subjects.find(x=>x.subject_id===s.subject_id)?.subject_name??s.subject_id,s.position,l.previous_positions?.subjects.find(x=>x.subject_id===s.subject_id)?.position??null],{student_id:l.student_id,subject_id:s.subject_id}))),rankNote);
  for(const direction of ['top','bottom'] as const)add(`${direction}-performers`,'Rankings',direction==='top'?'Top performers':'Lowest scoring learners',direction==='top'?'Which permitted learners have the highest averages?':'Which permitted learners have the lowest averages?',['Learner / admission','Class','Average %','Grade','Class rank','Approved assessments'],()=>learners.filter(l=>l.positions&&l.average!==null).sort((a,b)=>direction==='top'?b.average!-a.average!:a.average!-b.average!).map(l=>row([`${l.student_name} · ${l.admission_number}`,l.class_name,l.average,l.mean_grade,l.positions!.class,l.assessments_taken],{student_id:l.student_id})),rankNote);
  for(const dimension of ['class','stream','subject'] as const) {
    add(`${dimension}-rankings`,'Rankings',`${dimension[0].toUpperCase()+dimension.slice(1)} rankings`,`Which ${dimension} groups lead the selection?`,['Area','Rank','Average %','Previous rank','Movement'],()=>{
      if(!current.length||!current.every(r=>r.ranking_enabled&&r.reporting_mode==='traditional'))return [];
      const areas=comparisons.filter(c=>c.dimension===dimension&&c.mean!==null).sort((a,b)=>b.mean!-a.mean!);
      const old=[...areas].filter(c=>c.previous_mean!==null).sort((a,b)=>b.previous_mean!-a.previous_mean!);
      return areas.map(c=>{const pos=areas.findIndex(v=>v.mean===c.mean)+1, previousPos=c.previous_mean===null?null:old.findIndex(v=>v.previous_mean===c.previous_mean)+1;return row([c.label,pos,c.mean,previousPos,change(previousPos,pos)],c.drill_down);});
    },`${rankNote} Prior group positions are calculated among current groups with previous results.`);
  }
  add('score-distribution','Distributions','Score distribution','Where are learner scores concentrated?',['Score band','Learners','Share %'],()=>data.analysis.score_bands.map(b=>row([b.label,b.count,b.percentage])),`${approvedNote} Bands describe scores, not school pass thresholds.`,'bar',1);
  add('grade-distribution','Distributions','Grade distribution','Which configured achievement bands are most frequent?',['Grade / policy','Range','Results','Share %','Previous count'],()=>data.distribution.map(b=>row([`${b.label} (${b.id})`,b.min===null?'Ungraded':`${b.min}–${b.max}`,b.count,b.percentage,b.previous_count])), 'Counts of learner-subject results; grades from different policies remain separate.','bar',2);
  const learnerScores=(rs:SubjectEvidence[])=>[...group(rs,r=>r.student_id).values()].map(v=>summarize(v).mean).filter((v):v is number=>v!==null);
  const band=(value:number)=>Math.min(4,Math.floor(value/20));
  const bandName=(index:number)=>index===4?'80–100':`${index*20}–<${index*20+20}`;
  add('distribution-change','Distributions','Score distribution changes','How has the shape of the score distribution changed?',['Score band','Current count','Previous count','Current %','Previous %','Share change (pp)'],()=>{
    const now=learnerScores(current),old=learnerScores(previous);
    return Array.from({length:5},(_,i)=>{const a=now.filter(n=>band(n)===i).length,b=old.filter(n=>band(n)===i).length;return row([bandName(i),a,b,rate(a,now.length),rate(b,old.length),change(rate(a,now.length),rate(b,old.length))]);});
  },`Share change accounts for different population sizes, but not different cohorts. ${progressNote}`);
  for(const dimension of ['grade','score'] as const) {
    add(`${dimension}-movement-matrix`,'Distributions',`${dimension==='grade'?'Grade':'Score-band'} movement`,`How do matched learner-subject results move between bands?`,['Previous band','Current band','Results'],()=>{
      const prior=new Map(previous.map(r=>[`${r.student_id}|${r.subject_id}`,r]));
      const transitions=current.flatMap(r=>{const old=prior.get(`${r.student_id}|${r.subject_id}`),n=score(r);if(!old||n===null||score(old)===null||!r.policy_id||r.policy_id!==old.policy_id)return [];
        const a=dimension==='score'?bandName(band(score(old)!)):gradeFor(score(old),old.boundaries)?.label;
        const b=dimension==='score'?bandName(band(n)):gradeFor(n,r.boundaries)?.label;
        return a&&b?[{a:dimension==='grade'?`${a} (${r.policy_id})`:a,b:dimension==='grade'?`${b} (${r.policy_id})`:b}]:[];});
      return [...group(transitions,t=>`${t.a}|${t.b}`).values()].map(rs=>row([rs[0].a,rs[0].b,rs.length]));
    },'Matched learner, subject and policy only. Score bands are fixed descriptive intervals; grades use the stored policy.','matrix',2);
  }
  add('score-frequency','Distributions','High and low score frequency','How often do learners score at least 80% or below 40%?',['Learner / admission','Results ≥80%','Results <40%','Numeric results','High %','Low %'],()=>[...group(through,r=>r.student_id).values()].filter(rs=>!filters.learner_query||`${rs[0].student_name} ${rs[0].admission_number}`.toLowerCase().includes(filters.learner_query.toLowerCase())).map(rs=>{const values=rs.map(score).filter((n):n is number=>n!==null),high=values.filter(n=>n>=80).length,low=values.filter(n=>n<40).length;return row([`${rs[0].student_name} · ${rs[0].admission_number}`,high,low,values.length,rate(high,values.length),rate(low,values.length)],{student_id:rs[0].student_id});}),`These are descriptive score cutoffs, not configured pass rules. Counts use subject results across the loaded history. ${historyNote}`);

  add('matched-cohort','Comparisons','Matched learner progress','What changed for learners with comparable subject evidence?',['Measure','Value'],()=>Object.entries(matched).map(([k,v])=>row([k.replaceAll('_',' '),v])),progressNote);
  add('area-gaps','Deep Insights','Largest academic gaps','Where is the widest difference between groups?',['Dimension','Strongest','Weakest','Gap (pp)'],()=>data.gaps.map(g=>row([g.dimension,g.strongest,g.weakest,g.gap])),progressNote,'bar',3);
  add('outliers','Deep Insights','Unusual learner performance','Which learner averages lie outside the usual score range?',['Learner / admission','Average %','Lower fence','Upper fence','Direction'],()=>{
    const {lower,upper,interquartile_range:iqr}=data.analysis.quartiles;
    if(p.count<8||lower===null||upper===null||iqr===null||iqr===0)return [];
    const low=round(lower-1.5*iqr),high=round(upper+1.5*iqr);
    return learners.filter(l=>l.average!==null&&(l.average<low||l.average>high)).map(l=>row([`${l.student_name} · ${l.admission_number}`,l.average,low,high,l.average!<low?'Below usual range':'Above usual range'],{student_id:l.student_id}));
  },'Tukey fences: Q1 − 1.5×IQR and Q3 + 1.5×IQR. Requires at least eight learner averages and nonzero IQR. A statistical flag warrants review; it is not evidence of misconduct.');
  add('performance-groups','Deep Insights','Performance and progress groups','How do improving, stable and declining learners compare?',['Group','Learners','Current %','Previous %','Change (pp)'],()=>[
    {name:'Improving (>2 points)',select:(n:number)=>n>2},{name:'Stable (±2 points)',select:(n:number)=>Math.abs(n)<=2},{name:'Declining (<−2 points)',select:(n:number)=>n< -2}
  ].map(g=>{const ls=learners.filter(l=>l.change!==null&&g.select(l.change));return row([g.name,ls.length,mean(ls.map(l=>l.average!)),mean(ls.map(l=>l.previous_average!)),mean(ls.map(l=>l.change!))]);}),`Transparent rule-based groups, not inferred psychological or ability clusters. ${progressNote}`,'bar',2);
  add('sustained-areas','Deep Insights','Sustained and emerging strengths','Which subjects, classes and streams show persistent direction?',['Area','Dimension','Current %','Historical %','Pattern','Consecutive changes'],()=>comparisons.filter(c=>['subject','class','stream'].includes(c.dimension)&&c.history.filter(h=>h.mean!==null).length>=2).map(c=>row([c.label,c.dimension,c.mean,c.historical_average,c.consistency.status,Math.max(c.consistency.consecutive_improvement,c.consistency.consecutive_decline)],c.drill_down)),`At least three available exams. Consecutive direction describes the scores; it does not isolate the cause. ${progressNote}`);
  add('observations','Deep Insights','Academic observations','What deserves attention now?',['Area','Observation'],()=>{
    const observations=data.summary.map(s=>row([s.category,s.text],s.filters));
    for(const dimension of ['subject','class','stream'] as const){
      const areas=comparisons.filter(c=>c.dimension===dimension&&c.mean!==null).sort((a,b)=>b.mean!-a.mean!);
      if(areas.length>1){const best=areas[0],weak=areas.at(-1)!;observations.push(row([`${dimension} gap`,`${best.label} averages ${best.mean}%; ${weak.label} averages ${weak.mean}% — a ${round(best.mean!-weak.mean!)} point gap.`],weak.drill_down));}
      const shifts=areas.filter(c=>c.change!==null&&Math.abs(c.change)>=10);
      for(const c of shifts.slice(0,5))observations.push(row(['Review change',`${c.label} ${c.change!>0?'rose':'fell'} by ${Math.abs(c.change!)} points; ${c.learners_examined} learners have numeric results.`],c.drill_down));
    }
    if(coverage.partial)observations.push(row(['Coverage',`${coverage.partial} learners have partial approved results. Their averages may change as marking is completed.`]));
    if(matched.matched_learners)observations.push(row(['Matched evidence',`${matched.matched_learners} comparable learners changed by ${matched.change} points on matched subjects; ${matched.excluded_current_results} current subject results were excluded.`]));
    const featured=[observations.find(r=>['Critical','High Priority'].includes(String(r.values[0]))),
      observations.find(r=>r.values[0]==='subject gap'),observations.find(r=>r.values[0]==='class gap'),observations[0]].filter((r):r is AnalyticRow=>!!r);
    return [...new Set([...featured,...observations])];
  },`Deterministic observations from recorded evidence; no causal claims or predictions. ${progressNote}`,'insight');
  add('evidence-quality','Deep Insights','Evidence quality and limitations','Which limitations affect interpretation?',['Measure','Value'],()=>[
    row(['Approved numeric assessments',data.data_quality.final_mark_count]),row(['Missing or incomplete assessments',data.data_quality.missing_or_incomplete_count]),row(['Invalid marks excluded',data.data_quality.invalid_marks]),row(['Ungraded results',data.data_quality.ungraded_results]),row(['Loaded exam cycles',cycles.size]),row(['Question analysis',data.availability.question_analysis]),row(['Academic targets',data.targets.reason])],`${approvedNote} ${historyNote}`);

  add('cohort-progression','Trends','Cohort progression','How do recorded cohorts progress across grades and exams?',
    ['Cohort identifier','Exam','Date','Grade / form','Average %','Pass %','Learners'],
    ()=>data.cohorts.flatMap(c=>c.progression.filter(h=>!exam||h.date<=exam.date).map(h=>row([c.id,h.exam_name,h.date,h.grade,h.mean,h.pass_rate,h.learners_examined]))),
    `${data.availability.cohort} Cohort identifiers come from stored placements; membership can change. ${historyNote} ${progressNote}`);
  const riskNote='Academic follow-up flags use the existing transparent rules for failed subjects, missing work and score decline. They are not diagnoses or predictions. Learner profiles show the reasons.';
  add('risk-distribution','Deep Insights','Academic follow-up distribution','How many learners need each level of academic follow-up?',
    ['Follow-up level','Learners'],()=>data.risk.distribution.map(r=>row([r.level,r.count])),riskNote,'bar',1);
  add('risk-movement','Deep Insights','Academic follow-up movement','Who moved into or out of higher academic concern?',
    ['Measure','Learners'],()=>Object.entries(data.risk.movement).map(([key,value])=>row([key.replaceAll('_',' '),value])),
    `${riskNote} Counts compare learners with risk evidence in both selected exams; different subject coverage may affect flags.`);
  add('intervention-summary','Deep Insights','Academic support overview','What academic support has been recorded and measured?',
    ['Measure','Value'],()=>Object.entries(data.interventions).filter(([key])=>key!=='items').map(([key,value])=>row([key==='success_rate'?'Completed measured interventions with improved scores (%)':key.replaceAll('_',' '),typeof value==='number'?value:null])),
    'Recorded interventions linked to the selected results only. Improvement rate uses completed interventions with numeric before and after scores; it does not establish that support caused the change.');
  add('intervention-outcomes','Deep Insights','Academic support outcomes','How do recorded before and after results compare with support targets?',
    ['Intervention identifier','Status','Due date','Before','After','Change','Target','Target gap'],
    ()=>data.interventions.items.map(i=>row([i.id,i.status,i.due_on,i.pre_result,i.post_result,i.change,numeric(i.target.average??i.target.score),i.target_result.variance])),
    'Values are recorded baseline/outcome scores in their original scale, not newly normalized percentages. A positive change is descriptive, not proof of intervention effectiveness; missing measurements stay unavailable.');
  add('assessment-pipeline','Performance','Assessment evidence pipeline','How far has marking progressed for this selection?',
    ['Assessment state','Count'],()=>['expected','recorded','numeric_count','absent','missing','invalid','draft','submitted','reviewed','locked','published'].map(key=>row([key.replaceAll('_',' '),data.operations[key as keyof typeof data.operations] as number])),
    'Counts describe assessments in the selected exam. Recorded, approved numeric, missing and workflow states are different measures and must not be added together.','bar',1);
  add('report-readiness','Performance','Report availability','Which learner reports are approved, published or still in progress?',
    ['Report status','Learners'],()=>[...data.operations.report_cards.map(r=>row([r.status.replaceAll('_',' '),r.count])),row(['Unclassified / no report',Math.max(0,new Set(current.map(r=>r.student_id)).size-data.operations.report_cards.reduce((n,r)=>n+r.count,0))])],
    'One status per learner represented in the selected exam evidence. Report approval and publication are distinct workflow steps.','bar',1);

  const selected=filters.analytic_ids ? [...new Set(filters.analytic_ids.split(','))] : OVERVIEW_ANALYTICS;
  if(selected.some(id=>!specs.some(s=>s.meta.id===id)))throw new InvalidAnalyticSelectionError('An analytic in the selection is not available. Refresh the analytics library.');
  const items=specs.filter(s=>selected.includes(s.meta.id)).map(s=>{
    const all=s.build(),size=25,page=filters.analytic_page??1;
    return {...s.meta,total:all.length,page:forReport?1:page,page_size:forReport?all.length:size,rows:forReport?all:all.slice((page-1)*size,page*size)};
  });
  const dates=[...cycles.values()].map(rs=>rs[0].exam_date).sort();
  return {version:1,catalog:specs.map(s=>s.meta),items,comparison_options:selected.includes('focused-comparison')?comparisonOptions:[],history:{cycles:cycles.size,limit:filters.history_limit??24,first:dates[0]??null,last:dates.at(-1)??null}};
}
