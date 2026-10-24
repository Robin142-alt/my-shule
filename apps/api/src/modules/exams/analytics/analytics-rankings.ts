import { numeric, type SubjectEvidence } from './analytics-engine';
import type { RankingDimension, RankingMeasure } from './analytics-contract';

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const average = (values: number[]) => round(values.reduce((a, b) => a + b, 0) / values.length);
const learnerAverage = (rows: SubjectEvidence[]) => round(rows.reduce((sum, row) => sum + numeric(row.average)! * (row.subject_weight ?? 1), 0)
  / rows.reduce((sum, row) => sum + (row.subject_weight ?? 1), 0));
function group<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) { const id = key(row); const list = groups.get(id) ?? []; list.push(row); groups.set(id, list); }
  return groups;
}
export const rankingAllowed = (r: SubjectEvidence) => r.ranking_enabled === true && r.reporting_mode === 'traditional';
export function completeRankEvidence(r: SubjectEvidence) {
  const score = numeric(r.average);
  return rankingAllowed(r) && !r.overall_override && score !== null && score >= 0 && score <= 100 && Number(r.expected) > 0
    && Number(r.numeric_count) === Number(r.expected) && !Number(r.missing) && !Number(r.absent) && !Number(r.invalid);
}

/** Competition positions: 1, 2, 2, 4. Ties use the same precision shown on screen. */
export function competitionPositions<T>(items: T[], value: (item: T) => number, identity: (item: T) => string, ascending = false) {
  const sorted = [...items].sort((a, b) => (ascending ? 1 : -1) * (round(value(a)) - round(value(b))) || identity(a).localeCompare(identity(b)));
  let position = 0;
  return sorted.map((item, index) => {
    if (index === 0 || round(value(item)) !== round(value(sorted[index - 1]))) position = index + 1;
    return { item, position };
  });
}
function entity(r: SubjectEvidence, dimension: RankingDimension): {id: string | null; name: string | null; drill: Record<string,string>} {
  switch (dimension) {
    case 'student': return { id: r.student_id, name: `${r.student_name} · ${r.admission_number}`, drill: { student_id: r.student_id } };
    case 'class': return { id: r.class_section_id, name: r.class_name, drill: { class_section_id: r.class_section_id } };
    case 'grade': return { id: r.grade_level, name: r.grade_level, drill: { grade_level: r.grade_level! } };
    case 'stream': return { id: r.stream_id, name: `${r.class_name} · ${r.stream_name}`, drill: { class_section_id: r.class_section_id, stream_id: r.stream_id! } };
    case 'subject': return { id: r.subject_id, name: r.subject_name, drill: { subject_id: r.subject_id } };
    case 'department': return { id: r.department_id, name: r.department_name, drill: { department_id: r.department_id! } };
  }
}
// Stream names/IDs may be reused across forms. Never combine those populations.
const entityKey = (r: SubjectEvidence, dimension: RankingDimension) => dimension === 'stream'
  ? JSON.stringify([r.class_section_id, r.stream_id]) : String(entity(r, dimension).id);
const subjectsKey = (rs: SubjectEvidence[]) => JSON.stringify(rs.map(r => r.subject_id).sort());
function completeLearners(rows: SubjectEvidence[]) {
  return new Map([...group(rows, r => r.student_id)].filter(([, rs]) => rs.every(completeRankEvidence)
    && new Set(rs.map(r => r.subject_id)).size === rs.length));
}
function comparable(now: SubjectEvidence[], before: SubjectEvidence[] | undefined) {
  if (!before || subjectsKey(now) !== subjectsKey(before)) return false;
  const prior = new Map(before.map(r => [r.subject_id, r]));
  return now.every(r => {
    const old = prior.get(r.subject_id)!;
    return !!r.policy_id && r.policy_id === old.policy_id && r.class_section_id === old.class_section_id;
  });
}

export interface RankedResult {
  id: string; name: string; position: number; average: number; previous: number | null; change: number | null;
  learners: number; subjects: number; excluded: number; drill: Record<string, string>;
}
/** Input is already tenant/role/exam/filter scoped. No query or wider population is read here. */
export function buildRankings(current: SubjectEvidence[], previous: SubjectEvidence[], dimension: RankingDimension,
  measure: RankingMeasure = 'average', ascending = false) {
  const currentGroups = group(current.filter(r => entity(r, dimension).id), r => entityKey(r, dimension));
  const previousGroups = group(previous.filter(r => entity(r, dimension).id), r => entityKey(r, dimension));
  const candidates: Omit<RankedResult, 'position'>[] = [];
  let excludedLearners = 0;
  for (const [id, rows] of currentGroups) {
    const population = new Set(rows.map(r => r.student_id)).size;
    // A mixed/disabled group is not ranked by silently removing its protected members.
    if (!rows.every(rankingAllowed)) { excludedLearners += population; continue; }
    const currentLearners = completeLearners(rows);
    const priorRows = previousGroups.get(id) ?? [];
    const priorLearners = completeLearners(priorRows);
    const matched = new Map([...currentLearners].filter(([student, rs]) => comparable(rs, priorLearners.get(student))));
    const selected = measure === 'average' ? currentLearners : matched;
    const excluded = population - selected.size;
    excludedLearners += excluded;
    if (!selected.size) continue;
    const mean = average([...selected.values()].map(learnerAverage));
    // A performance comparison requires the whole same population in both exams.
    // Progress rankings explicitly use only complete matched learners instead.
    const canCompare = measure !== 'average' || (matched.size === currentLearners.size && excluded === 0
      && priorLearners.size === currentLearners.size && new Set(priorRows.map(r => r.student_id)).size === currentLearners.size);
    const old = canCompare ? average([...selected.keys()].map(student => learnerAverage(priorLearners.get(student)!))) : null;
    const change = old === null ? null : round(mean - old);
    if (measure === 'improvement' && !(change !== null && change > 0) || measure === 'decline' && !(change !== null && change < 0)) continue;
    const first = entity(rows[0], dimension);
    candidates.push({ id, name: first.name ?? String(first.id), average: mean, previous: old, change,
      learners: selected.size, subjects: new Set([...selected.values()].flat().map(r => r.subject_id)).size,
      excluded, drill: first.drill });
  }
  const ranked = competitionPositions(candidates, r => measure === 'average' ? r.average : r.change!, r => `${r.name}|${r.id}`, measure === 'decline' || measure === 'average' && ascending)
    .map(({ item, position }) => ({ ...item, position }));
  return { rows: ranked, considered: currentGroups.size, excluded: currentGroups.size - candidates.length, excludedLearners,
    policyBlocked: current.length > 0 && !current.some(rankingAllowed),
    note: `Competition positions: tied values share a position (1, 2, 2, 4), using two decimal places. ${measure === 'average'
      ? 'Averages use learners with all expected assessments approved and numeric in the selected subjects. Previous averages require the same complete population, subjects, class and saved grading policy.'
      : 'Changes use only the same learners, subjects, class and saved grading policy with complete results in both exams. New, transferred and incomplete learners are excluded; only changes in the chosen direction are listed.'} Each learner has equal weight. ${excludedLearners} learner entries excluded across groups. Missing work is never zero. Rankings follow school settings and are descriptive, not official report-card positions or proof of equal exam difficulty.` };
}
