import type { AnalyticsFilters, ExamAnalyticsScope, ExamAnalyticsScopeLevel } from './analytics-scope';

export interface Boundary { label: string; min: number; max: number; points: number | null; is_pass: boolean }
export interface InterventionEvidence {
  id: string; status: string; due_on: string | null; starts_on: string | null; completed_at: string | null;
  baseline: Record<string, unknown>; target: Record<string, unknown>; outcome: Record<string, unknown>;
}
export interface SubjectEvidence {
  exam_series_id: string; exam_name: string; exam_date: string; academic_term_id: string; academic_year_id: string;
  term_name: string; year_name: string; student_id: string; student_name: string; admission_number: string;
  subject_id: string; subject_name: string; department_id: string | null; department_name: string | null;
  class_section_id: string; class_name: string; grade_level: string | null; stream_id: string | null; stream_name: string | null;
  average: number | string | null; expected: number; recorded: number; numeric_count: number; absent: number; missing: number;
  explicit_count: number; invalid: number; draft: number; submitted: number; reviewed: number; locked: number; published: number;
  report_status: string | null; policy_id: string | null; reporting_mode: string | null; boundaries: Boundary[];
  teachers: { id: string; name: string }[]; interventions: InterventionEvidence[];
  heads_of_subject?: { id: string; name: string }[];
  cohort_id?: string | null; ranking_enabled?: boolean;
  exam_status?: string; ends_on?: string | Date;
}

// Published, deterministic thresholds; changes to these rules require regression tests.
export const ANALYTICS_RULES = { strong_change: 10, stable_change: 2, minimum_history: 3,
  critical_failed_subjects: 5, high_failed_subjects: 3, sharp_drop: 10, critical_drop: 20,
  multiple_missing: 2, consistency_deviation: 10 } as const;
export function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const mean = (items: number[]) => items.length ? round(sum(items) / items.length) : null;
const delta = (a: number | null, b: number | null) => a !== null && b !== null ? round(a - b) : null;
const rate = (a: number, b: number) => b ? round(a / b * 100) : null;
function group<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) { const id = key(row); const list = groups.get(id) ?? []; list.push(row); groups.set(id, list); }
  return groups;
}
export function statistics(values: Array<number | null>) {
  const sorted = values.filter((n): n is number => n !== null && Number.isFinite(n)).sort((a, b) => a - b);
  const average = mean(sorted);
  return { mean: average, median: sorted.length ? round((sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2) : null,
    highest: sorted.length ? sorted[sorted.length - 1] : null, lowest: sorted[0] ?? null,
    range: sorted.length ? round(sorted[sorted.length - 1] - sorted[0]) : null,
    standard_deviation: average === null ? null : round(Math.sqrt(sum(sorted.map(n => (n - average) ** 2)) / sorted.length)), count: sorted.length };
}
export function trendStatus(change: number | null) {
  if (change === null) return 'Insufficient history';
  if (change >= ANALYTICS_RULES.strong_change) return 'Strong Improvement';
  if (change > ANALYTICS_RULES.stable_change) return 'Improving';
  if (change <= -ANALYTICS_RULES.strong_change) return 'Critical Decline';
  if (change < -ANALYTICS_RULES.stable_change) return 'Declining';
  return 'Stable';
}
export function targetResult(actual: number | null, target: number | null) {
  return { target, actual, variance: delta(actual, target), achievement: actual !== null && target !== null && target > 0 ? round(actual / target * 100) : null,
    status: target === null ? 'No target configured' : actual === null ? 'No approved results' : actual >= target ? 'Achieved' : 'Below target' };
}
function gradeFor(score: number | null, boundaries: Boundary[]) {
  if (score === null) return null;
  return [...boundaries].sort((a,b) => Number(b.min)-Number(a.min)).find(b => score >= Number(b.min) && score <= Number(b.max)) ?? null;
}
function consistency(values: number[]) {
  if (values.length < ANALYTICS_RULES.minimum_history) return { status: 'Insufficient history', consecutive_improvement: 0, consecutive_decline: 0, recent_average: mean(values), best: null, weakest: null, variability: null };
  const recent = values.slice(-5); const stats = statistics(recent);
  let up = 0; let down = 0;
  for (let i=values.length-1; i>0 && values[i]>values[i-1]; i--) up++;
  for (let i=values.length-1; i>0 && values[i]<values[i-1]; i--) down++;
  return { status: up >= 2 ? 'Consistently improving' : down >= 2 ? 'Consecutive decline' : stats.standard_deviation! <= ANALYTICS_RULES.consistency_deviation ? 'Consistent' : 'Variable',
    consecutive_improvement: up, consecutive_decline: down, recent_average: stats.mean, best: stats.highest, weakest: stats.lowest, variability: stats.standard_deviation };
}
function summarize(rows: SubjectEvidence[]) {
  const learners = [...group(rows,r=>r.student_id).values()];
  const learnerMeans = learners.map(subjects => mean(subjects.map(r=>numeric(r.average)).filter((n): n is number=>n!==null)));
  const grades = rows.map(r=>gradeFor(numeric(r.average),r.boundaries));
  const assessed = grades.filter((g): g is Boundary => g!==null);
  const passed = assessed.filter(g=>g.is_pass).length;
  // Pass rates describe graded learner-subject results, not ungraded/missing assessments.
  const stats = statistics(learnerMeans);
  const policyIds = new Set(rows.filter(r=>numeric(r.average)!==null).map(r=>r.policy_id));
  const meanGrade = policyIds.size===1 ? gradeFor(stats.mean,rows.find(r=>r.policy_id)?.boundaries ?? [])?.label ?? null : null;
  return { ...stats, mean_grade: meanGrade, expected_learners: learners.length, learners_examined: stats.count,
    learners_passing_all: learners.filter(rs=>rs.length>0&&rs.every(r=>gradeFor(numeric(r.average),r.boundaries)?.is_pass===true)).length,
    learners_failing_any: learners.filter(rs=>rs.some(r=>gradeFor(numeric(r.average),r.boundaries)?.is_pass===false)).length,
    learners_absent: learners.filter(rs=>rs.some(r=>r.absent>0)).length,
    attendance_rate: rate(sum(rows.map(r=>r.numeric_count)),sum(rows.map(r=>r.numeric_count+r.absent))),
    absenteeism_rate: rate(sum(rows.map(r=>r.absent)),sum(rows.map(r=>r.numeric_count+r.absent))),
    passed, failed: assessed.length-passed, pass_rate: rate(passed,assessed.length), failure_rate: rate(assessed.length-passed,assessed.length),
    pass_denominator: 'Graded learner-subject results', graded_results: assessed.length, ungraded_results: grades.filter((g,i)=>!g && numeric(rows[i].average)!==null).length,
    target: targetResult(stats.mean,null) };
}
function positionIndex(rows: SubjectEvidence[]) {
  type Positions={class:number|null;stream:number|null;grade:number|null;subjects:{subject_id:string;position:number|null}[]};
  const output=new Map<string,Positions>();
  for(const [id,rs] of group(rows,r=>r.student_id)) if(rs.every(r=>r.ranking_enabled===true&&r.reporting_mode==='traditional')) output.set(id,{class:null,stream:null,grade:null,subjects:[]});
  for(const dimension of ['class','stream','grade','subject'] as const) {
    const groups=group(rows,r=>dimension==='class'?r.class_section_id:dimension==='stream'?(r.stream_id??''):dimension==='grade'?(r.grade_level??''):r.class_section_id+'|'+r.subject_id);
    for(const [key,population] of groups) {
      if(!key)continue;
      const ordered=[...group(population,r=>r.student_id)].map(([id,rs])=>({id,mean:summarize(rs).mean})).filter(r=>r.mean!==null).sort((a,b)=>b.mean!-a.mean!);
      let position=0;
      ordered.forEach((row,index)=>{
        if(index===0||row.mean!==ordered[index-1].mean)position=index+1;
        const entry=output.get(row.id);if(!entry)return;
        if(dimension==='subject')entry.subjects.push({subject_id:population[0].subject_id,position});else entry[dimension]=position;
      });
    }
  }
  return output;
}
export function calculateRisk(input: { failed: number; change: number | null; missing: number; absent: number; consecutive_decline: number; repeated_failures: number; baseline_change: number | null }) {
  const reasons: string[] = []; let weight=0;
  if(input.failed) { reasons.push(`Failing ${input.failed} subject${input.failed===1?'':'s'}`); weight=Math.max(weight,input.failed>=5?3:input.failed>=3?2:1); }
  if(input.change!==null && input.change<=-ANALYTICS_RULES.sharp_drop) { reasons.push(`Average dropped ${Math.abs(input.change)} points`); weight=Math.max(weight,input.change<=-20?3:2); }
  if(input.missing>=ANALYTICS_RULES.multiple_missing) { reasons.push(`${input.missing} missing assessments`); weight=Math.max(weight,1); }
  if(input.absent>=2) { reasons.push(`Absent for ${input.absent} assessments`); weight=Math.max(weight,1); }
  if(input.consecutive_decline>=2) { reasons.push(`Declined for ${input.consecutive_decline} consecutive exams`); weight=Math.max(weight,2); }
  if(input.repeated_failures) { reasons.push(`Repeated failure in ${input.repeated_failures} subjects`); weight=Math.max(weight,2); }
  if(input.baseline_change!==null && input.baseline_change<=-10) { reasons.push(`${Math.abs(input.baseline_change)} points below personal historical average`); weight=Math.max(weight,1); }
  return { level: (['Low','Moderate','High','Critical'] as const)[weight], reasons };
}

function historicalRisk(subjects: SubjectEvidence[], history: SubjectEvidence[]) {
  if (!subjects.length) return null;
  const cycles = [...group(history, r=>r.exam_series_id).values()].sort((a,b)=>a[0].exam_date.localeCompare(b[0].exam_date));
  const previous = cycles.at(-1)??[];
  const averages = cycles.map(rs=>summarize(rs).mean).filter((n):n is number=>n!==null);
  const average = summarize(subjects).mean;
  const trajectory = consistency([...averages,...(average===null?[]:[average])]);
  return calculateRisk({failed:subjects.filter(r=>gradeFor(numeric(r.average),r.boundaries)?.is_pass===false).length,
    change:delta(average,summarize(previous).mean),missing:sum(subjects.map(r=>r.missing)),absent:sum(subjects.map(r=>r.absent)),
    consecutive_decline:trajectory.consecutive_decline,
    repeated_failures:subjects.filter(r=>gradeFor(numeric(r.average),r.boundaries)?.is_pass===false&&previous.some(p=>p.subject_id===r.subject_id&&gradeFor(numeric(p.average),p.boundaries)?.is_pass===false)).length,
    baseline_change:delta(average,averages.length>=ANALYTICS_RULES.minimum_history?mean(averages):null)});
}

export function buildAcademicIntelligence(input: SubjectEvidence[], scope: ExamAnalyticsScope, filters: AnalyticsFilters, availableScopes: ExamAnalyticsScopeLevel[], today = new Date().toISOString().slice(0,10)) {
  const rows = input.map(row => ({...row, average:numeric(row.average), boundaries:Array.isArray(row.boundaries)?row.boundaries:[], teachers:row.teachers??[], interventions:row.interventions??[]}));
  const exams = [...group(rows,r=>r.exam_series_id).values()].map(rs=>({ id:rs[0].exam_series_id,name:rs[0].exam_name,date:rs[0].exam_date,
    academic_term_id:rs[0].academic_term_id,academic_year_id:rs[0].academic_year_id,term_name:rs[0].term_name,year_name:rs[0].year_name })).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const choices = exams.filter(e=>(!filters.academic_year_id||e.academic_year_id===filters.academic_year_id)&&(!filters.academic_term_id||e.academic_term_id===filters.academic_term_id));
  const selected = filters.exam_series_id ? choices.find(e=>e.id===filters.exam_series_id) : choices.at(-1);
  const earlier = selected ? exams.filter(e=>e.date<selected.date) : [];
  const comparison = filters.comparison_exam_id ? exams.find(e=>e.id===filters.comparison_exam_id && e.id!==selected?.id) : earlier.at(-1);
  const current = rows.filter(r=>r.exam_series_id===selected?.id);
  const previous = rows.filter(r=>r.exam_series_id===comparison?.id);
  const performance = summarize(current); const prior = summarize(previous);
  const historical = rows.filter(r=>earlier.some(e=>e.id===r.exam_series_id));
  const historyByStudent = group(historical,r=>r.student_id);
  const allByStudent = group(rows,r=>r.student_id);
  const priorByStudent = group(previous,r=>r.student_id);
  const currentPositions=positionIndex(current), priorPositions=positionIndex(previous);
  const learnerRows = [...group(current,r=>r.student_id).values()].map(subjects=>{
    const first=subjects[0]; const ownHistory = historyByStudent.get(first.student_id)??[];
    const ownPrevious=priorByStudent.get(first.student_id)??[];
    const history = [...group(ownHistory,r=>r.exam_series_id).values()].map(rs=>({exam_series_id:rs[0].exam_series_id,exam_name:rs[0].exam_name,date:rs[0].exam_date,average:summarize(rs).mean})).sort((a,b)=>a.date.localeCompare(b.date));
    const average=summarize(subjects).mean; const previousAverage=summarize(ownPrevious).mean;
    const change=delta(average,previousAverage);
    const trajectory=consistency([...history.map(h=>h.average),average].filter((n):n is number=>n!==null));
    const subjectRows=subjects.map(r=>{ const old=ownPrevious.find(p=>p.subject_id===r.subject_id); const boundary=gradeFor(r.average,r.boundaries);
      return {subject_id:r.subject_id,subject_name:r.subject_name,average:r.average,grade:boundary?.label??null,points:r.reporting_mode==='cbc_competency'?null:boundary?.points??null,
        is_pass:boundary?.is_pass??null,previous_average:numeric(old?.average),change:delta(r.average,numeric(old?.average)),missing:r.missing,absent:r.absent}; });
    const failed=subjectRows.filter(r=>r.is_pass===false).length;
    const repeated=subjects.filter(r=>gradeFor(r.average,r.boundaries)?.is_pass===false && ownPrevious.some(p=>p.subject_id===r.subject_id && gradeFor(numeric(p.average),p.boundaries)?.is_pass===false)).length;
    const missing=sum(subjects.map(r=>r.missing)); const absent=sum(subjects.map(r=>r.absent));
    const baseline=history.length>=3?mean(history.map(h=>h.average).filter((n):n is number=>n!==null)):null;
    const risk=calculateRisk({failed,change,missing,absent,consecutive_decline:trajectory.consecutive_decline,repeated_failures:repeated,baseline_change:delta(average,baseline)});
    const previousRisk=historicalRisk(ownPrevious,(allByStudent.get(first.student_id)??[]).filter(r=>comparison&&r.exam_date<comparison.date));
    const sortedSubjects=subjectRows.filter(r=>r.average!==null).sort((a,b)=>b.average!-a.average!);
    const interventions=[...new Map(subjects.flatMap(r=>r.interventions).map(i=>[i.id,i])).values()];
    const high=subjects.length>0 && subjects.every(r=>r.average!==null && gradeFor(r.average,r.boundaries)?.label===[...r.boundaries].sort((a,b)=>b.min-a.min)[0]?.label && r.boundaries.length>0);
    const consistentlyHigh=high&&history.length>=2&&[...group(ownHistory,r=>r.exam_series_id).values()].sort((a,b)=>a[0].exam_date.localeCompare(b[0].exam_date)).slice(-2).every(rs=>rs.every(r=>numeric(r.average)!==null&&r.boundaries.length>0&&gradeFor(numeric(r.average),r.boundaries)?.label===[...r.boundaries].sort((a,b)=>b.min-a.min)[0]?.label));
    const currentPosition=currentPositions.get(first.student_id)??null,priorPosition=priorPositions.get(first.student_id)??null;
    return {student_id:first.student_id,student_name:first.student_name,admission_number:first.admission_number,class_section_id:first.class_section_id,class_name:first.class_name,
      average,mean_grade:summarize(subjects).mean_grade,previous_average:previousAverage,change,subjects:subjectRows,subjects_passed:subjectRows.filter(r=>r.is_pass===true).length,subjects_failed:failed,
      subjects_improved:subjectRows.filter(r=>(r.change??0)>0).length,subjects_declined:subjectRows.filter(r=>(r.change??0)<0).length,
      strongest_subject:sortedSubjects[0]?.subject_name??null,weakest_subject:sortedSubjects.at(-1)?.subject_name??null,
      total_points:subjectRows.length && subjectRows.every(r=>r.points!==null)?round(sum(subjectRows.map(r=>Number(r.points)))):null,
      missing,absent,assessments_taken:sum(subjects.map(r=>r.numeric_count)),risk,previous_risk:previousRisk,trend:trendStatus(change),consistency:trajectory,history,
      historical_average:baseline,target:targetResult(average,null),high_performer:high,consistently_high:consistentlyHigh,passing_all_subjects:subjectRows.length>0&&subjectRows.every(r=>r.is_pass===true),interventions,
      positions:currentPosition,previous_positions:priorPosition,position_movement:delta(priorPosition?.class??null,currentPosition?.class??null)};
  }).sort((a,b)=>a.student_name.localeCompare(b.student_name)||a.student_id.localeCompare(b.student_id));
  const risks = ['Low','Moderate','High','Critical'].map(level=>({level,count:learnerRows.filter(l=>l.risk.level===level).length}));
  const comparisons = (['department','grade','stream','class','subject','teacher'] as const).flatMap(dimension=>{
    const key=(r:SubjectEvidence)=>String(dimension==='department'?r.department_id:dimension==='grade'?r.grade_level:dimension==='stream'?r.stream_id:dimension==='class'?r.class_section_id:dimension==='subject'?r.subject_id:`${r.teachers.map(t=>t.id).sort().join(',')}|${r.class_section_id}|${r.subject_id}`);
    const label=(r:SubjectEvidence)=>String(dimension==='department'?r.department_name:dimension==='grade'?r.grade_level:dimension==='stream'?r.stream_name:dimension==='class'?r.class_name:dimension==='subject'?r.subject_name:`${r.teachers.map(t=>t.name).join(', ')||'Allocation unavailable'} · ${r.class_name} · ${r.subject_name}`);
    const previousGroups=group(previous,key), historicalGroups=group(historical,key);
    return [...group(current,key).entries()].filter(([id])=>id!=='null').map(([id,rs])=>{const now=summarize(rs);const before=summarize(previousGroups.get(id)??[]);
      const population=new Set(rs.map(r=>r.student_id));
      const history=[...group(historicalGroups.get(id)??[],r=>r.exam_series_id).values()].sort((a,b)=>a[0].exam_date.localeCompare(b[0].exam_date)).map(cycle=>({exam:cycle[0].exam_name,...summarize(cycle)}));
      return {dimension,id,label:label(rs[0]),...now,previous_mean:before.mean,change:delta(now.mean,before.mean),at_risk_count:learnerRows.filter(l=>l.risk.level!=='Low'&&population.has(l.student_id)).length,
        previous_pass_rate:before.pass_rate,pass_rate_change:delta(now.pass_rate,before.pass_rate),previous_mean_grade:before.mean_grade,
        historical_average:summarize(historicalGroups.get(id)??[]).mean,history,consistency:consistency([...history.map(h=>h.mean),now.mean].filter((n):n is number=>n!==null)),
        marks_completion:rate(sum(rs.map(r=>Math.max(0,r.expected-r.missing-r.invalid))),sum(rs.map(r=>r.expected))),
        heads_of_subject:[...new Map(rs.flatMap(r=>r.heads_of_subject??[]).map(h=>[h.id,h])).values()],
        drill_down:dimension==='teacher'?{teacher_user_id:rs[0].teachers[0]?.id??'',class_section_id:rs[0].class_section_id,subject_id:rs[0].subject_id}:{[dimension==='department'?'department_id':dimension==='grade'?'grade_level':dimension==='stream'?'stream_id':dimension==='class'?'class_section_id':'subject_id']:id}};
    });
  });
  const distribution=(rs:SubjectEvidence[])=>[...group(rs.filter(r=>numeric(r.average)!==null),r=>{const b=gradeFor(numeric(r.average),r.boundaries);return b?`${r.policy_id}:${b.label}`:'ungraded';}).entries()].map(([id,rs])=>{
    const b=gradeFor(numeric(rs[0].average),rs[0].boundaries);return {id,label:b?.label??'No grading policy',min:b?.min??null,max:b?.max??null,count:rs.length,percentage:rate(rs.length,performance.graded_results+performance.ungraded_results)};});
  const priorDistribution=distribution(previous);
  const distributions=distribution(current).map(b=>({...b,previous_count:priorDistribution.find(p=>p.id===b.id)?.count??(comparison?0:null)}));
  const movement={up:0,down:0,stable:0,comparable:0};
  const previousSubjects=new Map(previous.map(r=>[r.student_id+'|'+r.subject_id,r]));
  for(const row of current) {const old=previousSubjects.get(row.student_id+'|'+row.subject_id);if(!old||old.policy_id!==row.policy_id)continue;
    const b=gradeFor(numeric(row.average),row.boundaries),p=gradeFor(numeric(old.average),old.boundaries);if(!b||!p)continue;
    movement.comparable++;if(b.min>p.min)movement.up++;else if(b.min<p.min)movement.down++;else movement.stable++;
  }
  const operations = Object.fromEntries((['expected','recorded','numeric_count','absent','missing','invalid','draft','submitted','reviewed','locked','published'] as const).map(key=>[key,sum(current.map(r=>Number(r[key])))])) as Record<'expected'|'recorded'|'numeric_count'|'absent'|'missing'|'invalid'|'draft'|'submitted'|'reviewed'|'locked'|'published',number>;
  const reportCards=[...group(current,r=>r.student_id).values()].map(rs=>rs[0].report_status);
  const reportCounts=['draft_requested','draft_generated','under_review','approved','published','withdrawn','regeneration_required'].map(status=>({status,count:reportCards.filter(s=>s===status).length}));
  const interventions=[...new Map(current.flatMap(r=>r.interventions).map(i=>[i.id,i])).values()];
  const interventionResults=interventions.map(i=>{ const before=numeric(i.baseline.average??i.baseline.score),after=numeric(i.outcome.average??i.outcome.score);
    return {...i,pre_result:before,post_result:after,change:delta(after,before),target_result:targetResult(after,numeric(i.target.average??i.target.score))}; });
  const measured=interventionResults.filter(i=>i.status==='completed'&&i.change!==null);
  const trendRows=exams.filter(e=>!selected||e.date<=selected.date).map(exam=>({...exam,...summarize(rows.filter(r=>r.exam_series_id===exam.id))}));
  const throughSelected=rows.filter(r=>!selected||r.exam_date<=selected.date);
  const periods=(dimension:'term'|'year')=>[...group(throughSelected,r=>dimension==='term'?r.academic_term_id:r.academic_year_id).entries()].map(([id,rs])=>({id,
    name:dimension==='term'?`${rs[0].year_name} · ${rs[0].term_name}`:rs[0].year_name,date:rs.map(r=>r.exam_date).sort()[0],...summarize(rs)})).sort((a,b)=>a.date.localeCompare(b.date));
  const termTrends=periods('term'),yearTrends=periods('year');
  const currentTerm=throughSelected.filter(r=>r.academic_term_id===selected?.academic_term_id), currentYear=throughSelected.filter(r=>r.academic_year_id===selected?.academic_year_id);
  const comparePeriod=(name:string,currentRows:SubjectEvidence[],previousRows:SubjectEvidence[])=>{const current=summarize(currentRows),previous=summarize(previousRows);return {name,current,previous,change:delta(current.mean,previous.mean),pass_rate_change:delta(current.pass_rate,previous.pass_rate)};};
  const riskOrder=['Low','Moderate','High','Critical'];
  const matchedRisks=learnerRows.filter(l=>l.previous_risk!==null);
  const riskMovement={comparable:matchedRisks.length,
    reduced:matchedRisks.filter(l=>riskOrder.indexOf(l.risk.level)<riskOrder.indexOf(l.previous_risk!.level)).length,
    increased:matchedRisks.filter(l=>riskOrder.indexOf(l.risk.level)>riskOrder.indexOf(l.previous_risk!.level)).length,
    entered_high:matchedRisks.filter(l=>riskOrder.indexOf(l.risk.level)>=2&&riskOrder.indexOf(l.previous_risk!.level)<2).length,
    left_high:matchedRisks.filter(l=>riskOrder.indexOf(l.risk.level)<2&&riskOrder.indexOf(l.previous_risk!.level)>=2).length};
  const change=delta(performance.mean,prior.mean);
  const riskCount=learnerRows.filter(l=>l.risk.level!=='Low').length;
  const insightRows:Array<{category:string;text:string;view:string;filters?:Record<string,string>}> = [];
  if(change!==null)insightRows.push({category:change<0?'Watch':'Positive',text:`Average ${change<0?'decreased':'increased'} by ${Math.abs(change)} points.`,view:'Comparisons'});
  if(performance.pass_rate!==null&&prior.pass_rate!==null)insightRows.push({category:'Watch',text:`Pass rate changed from ${prior.pass_rate}% to ${performance.pass_rate}%.`,view:'Performance'});
  if(riskCount)insightRows.push({category:risks[3].count?'Critical':'High Priority',text:`${riskCount} learners require academic follow-up.`,view:'At Risk'});
  if(operations.missing)insightRows.push({category:'High Priority',text:`${operations.missing} assessments are missing or incomplete.`,view:'Exam Operations'});
  if(riskMovement.entered_high)insightRows.push({category:'High Priority',text:`${riskMovement.entered_high} learners entered High or Critical risk.`,view:'At Risk'});
  if(riskMovement.left_high)insightRows.push({category:'Positive',text:`${riskMovement.left_high} learners moved out of High or Critical risk.`,view:'Advanced'});
  if(learnerRows.some(l=>l.high_performer))insightRows.push({category:'Positive',text:`${learnerRows.filter(l=>l.high_performer).length} learners achieved the highest configured band in every assessed subject.`,view:'Learners'});
  const improved=[...comparisons.filter(c=>c.dimension==='class'&&c.change!==null)].sort((a,b)=>b.change!-a.change!)[0];
  if(improved && improved.change!>0)insightRows.push({category:'Positive',text:`${improved.label} improved by ${improved.change} points.`,view:'Learners',filters:improved.drill_down});
  const currentByStudent=group(current,r=>r.student_id);
  const filteredLearners=learnerRows.filter(l=>(!filters.student_id||l.student_id===filters.student_id)
    &&(!filters.learner_query||`${l.student_name} ${l.admission_number}`.toLowerCase().includes(filters.learner_query.toLowerCase()))
    &&(!filters.risk_level||(filters.risk_level==='At Risk'?l.risk.level!=='Low':l.risk.level===filters.risk_level))
    &&(!filters.learner_group||(filters.learner_group==='high_performers'?l.high_performer:filters.learner_group==='most_improved'?(l.change??0)>0:filters.learner_group==='declining'?(l.change??0)<0:filters.learner_group==='consistent_improvers'?l.consistency.consecutive_improvement>=2:filters.learner_group==='consistent_high'?l.consistently_high:l.passing_all_subjects))
    &&(!filters.grade||l.mean_grade===filters.grade)&&(!filters.marks_status||(currentByStudent.get(l.student_id)??[]).some(r=>filters.marks_status==='missing'?r.missing>0:Number(r[filters.marks_status as keyof SubjectEvidence])>0))
    &&(!filters.publication_status||(currentByStudent.get(l.student_id)??[]).some(r=>r.report_status===filters.publication_status)));
  const top=[...learnerRows].filter(l=>l.average!==null).sort((a,b)=>b.average!-a.average!).slice(0,10);
  const improvers=[...learnerRows].filter(l=>(l.change??0)>0).sort((a,b)=>b.change!-a.change!).slice(0,10);
  const gaps=(['department','grade','stream','class','subject'] as const).map(dimension=>{const areas=comparisons.filter(c=>c.dimension===dimension&&c.mean!==null).sort((a,b)=>b.mean!-a.mean!);return {dimension,strongest:areas[0]?.label??null,weakest:areas.at(-1)?.label??null,gap:areas.length>1?delta(areas[0].mean,areas.at(-1)!.mean):null};});
  const benchmark=(name:string,rs:SubjectEvidence[])=>{const stats=summarize(rs);return {name,...stats,change:delta(performance.mean,stats.mean)};};
  const priorYear=selected?Number(selected.year_name)-1:NaN;
  const sameYearExam=earlier.filter(e=>e.name===selected?.name&&Number(e.year_name)===priorYear).at(-1);
  return {
    scope:{level:scope.level,role:scope.role,available_scopes:availableScopes},
    filters:{...filters,exam_series_id:selected?.id??null,comparison_exam_id:comparison?.id??null},
    options:{exams,departments:[...new Map(rows.filter(r=>r.department_id).map(r=>[r.department_id!,{id:r.department_id!,name:r.department_name??r.department_id!}])).values()],
      subjects:[...new Map(rows.map(r=>[r.subject_id,{id:r.subject_id,name:r.subject_name}])).values()],
      classes:[...new Map(rows.map(r=>[r.class_section_id,{id:r.class_section_id,name:r.class_name}])).values()],
      streams:[...new Map(rows.filter(r=>r.stream_id).map(r=>[r.stream_id!,{id:r.stream_id!,name:r.stream_name??r.stream_id!}])).values()],
      grades:[...new Set(rows.map(r=>r.grade_level).filter((v):v is string=>v!==null))],teachers:[...new Map(rows.flatMap(r=>r.teachers).map(t=>[t.id,t])).values()]},
    kpis:{school_average:performance.mean,pending_reviews:operations.submitted,missing_marks_alerts:operations.missing,
      active_exams:new Set(rows.filter(r=>['draft','submitted','reviewed'].includes(r.exam_status??'')&&r.exam_date<=today
        && (r.ends_on instanceof Date?r.ends_on.toISOString().slice(0,10):String(r.ends_on??''))>=today).map(r=>r.exam_series_id)).size},
    performance,change,previous:prior,summary:insightRows,comparisons,distribution:distributions,band_movement:movement,gaps,
    trends:trendRows.map(r=>({...r,exam_series_id:r.id,exam_series_name:r.name,starts_on:r.date,average_score:r.mean})),
    period_trends:{terms:termTrends,years:yearTrends},
    period_comparisons:[comparePeriod('Current term vs previous term',currentTerm,throughSelected.filter(r=>r.academic_term_id===termTrends.filter(t=>t.id!==selected?.academic_term_id).at(-1)?.id)),
      comparePeriod('Current term vs same term last year',currentTerm,rows.filter(r=>r.term_name===selected?.term_name&&Number(r.year_name)===priorYear)),
      comparePeriod('Current year vs previous year',currentYear,rows.filter(r=>Number(r.year_name)===priorYear))],
    benchmarks:[benchmark('Previous exam',previous),benchmark('Historical average',historical),benchmark('Same exam previous year',rows.filter(r=>r.exam_series_id===sameYearExam?.id)),
      benchmark('Previous term',rows.filter(r=>earlier.some(e=>e.id===r.exam_series_id&&e.academic_term_id===earlier.filter(e=>e.academic_term_id!==selected?.academic_term_id).at(-1)?.academic_term_id))),
      benchmark('Previous year',rows.filter(r=>Number(r.year_name)===priorYear))],
    learners:{items:filteredLearners.slice((filters.page-1)*filters.page_size,filters.page*filters.page_size),total:filteredLearners.length,page:filters.page,page_size:filters.page_size},
    risk:{distribution:risks,movement:riskMovement,at_risk_count:riskCount,high_performers:learnerRows.filter(l=>l.high_performer).length,most_improved_count:learnerRows.filter(l=>(l.change??0)>0).length,rules:ANALYTICS_RULES},
    targets:{available:false,reason:'No academic target has been configured for this scope.'},
    operations:{...operations,completion_rate:rate(Math.max(0,operations.expected-operations.missing-operations.invalid),operations.expected),report_cards:reportCounts,
      incomplete_report_cards:reportCards.filter(s=>!s||!['approved','published'].includes(s)).length},
    interventions:{items:interventionResults.slice(0,100),total:interventions.length,open:interventions.filter(i=>['planned','active','monitoring'].includes(i.status)).length,
      overdue:interventions.filter(i=>i.due_on&&i.due_on<today&&['planned','active','monitoring'].includes(i.status)).length,
      completed:interventions.filter(i=>i.status==='completed').length,measured_outcomes:measured.length,success_rate:rate(measured.filter(i=>i.change!>0).length,measured.length)},
    cohorts:[...group(rows.filter(r=>r.cohort_id),r=>r.cohort_id!).entries()].map(([id,cohortRows])=>({id,
      progression:[...group(cohortRows,r=>r.exam_series_id).values()].map(rs=>({exam_series_id:rs[0].exam_series_id,exam_name:rs[0].exam_name,date:rs[0].exam_date,grade:rs[0].grade_level,...summarize(rs)})).sort((a,b)=>a.date.localeCompare(b.date))})),
    availability:{question_analysis:'Question-by-question learner scores are not recorded in the exams source.',ranking:'Positions appear only when ranking is enabled and the grading policy is traditional. Positions use the currently authorized and filtered subject evidence, with tied scores sharing a position.',cohort:'Cohort progression requires persisted cohort identifiers on historical learner placements. No cohort is inferred from a class name.'},
    subjectPerformance:comparisons.filter(c=>c.dimension==='subject').map(c=>{
      const labels=current.filter(r=>r.subject_id===c.id).map(r=>gradeFor(r.average,r.boundaries)?.label.toLowerCase()??'');
      const count=(code:string,word:string)=>labels.filter(l=>l===code||l.includes(word)).length;
      return {subject_id:c.id,subject_name:c.label,mean_score:c.mean,pass_rate:c.pass_rate,
        ee_count:count('ee','exceed'),me_count:count('me','meet'),ae_count:count('ae','approach'),be_count:count('be','below')};}),
    studentProgress:{topPerformers:top.map(l=>({student_id:l.student_id,student_name:l.student_name,admission_number:l.admission_number,average_percentage:l.average!,assessments_taken:l.assessments_taken})),
      topImprovers:improvers.map(l=>({student_id:l.student_id,student_name:l.student_name,admission_number:l.admission_number,latest_exam_series:selected?.name??'',latest_average:l.average!,previous_exam_series:comparison?.name??'',previous_average:l.previous_average!,improvement:l.change!})),
      atRiskStudents:learnerRows.filter(l=>l.risk.level!=='Low').slice(0,10).map(l=>({student_id:l.student_id,student_name:l.student_name,admission_number:l.admission_number,average_percentage:l.average,assessments_taken:l.assessments_taken,reasons:l.risk.reasons}))},
    data_quality:{final_mark_count:operations.numeric_count,explicit_evidence_count:sum(current.map(r=>r.explicit_count)),missing_or_incomplete_count:operations.missing,invalid_marks:operations.invalid,
      ungraded_results:performance.ungraded_results,notes:['Average uses approved numeric results only. Missing work is never zero.','Pass rates count graded learner-subject results. Attendance counts scored or explicitly absent assessments.','Teacher comparisons describe allocations, not teacher effectiveness.','History includes up to 24 exam cycles before the selected exam, plus the explicit comparison. Select an older year to explore earlier history.']},
  };
}
export type AcademicIntelligence = ReturnType<typeof buildAcademicIntelligence>;
