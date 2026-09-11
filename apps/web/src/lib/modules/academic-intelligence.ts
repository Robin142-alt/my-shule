import type { AcademicIntelligence as IntelligenceData } from '../../../../api/src/modules/exams/analytics/analytics-engine';
export type AcademicIntelligence = IntelligenceData & { capabilities?: { can_start_intervention: boolean } };
export type AcademicLearner = AcademicIntelligence['learners']['items'][number];
export const scopeNames = { school:'Whole school',department:'Department scoped',subject:'Head of Subject',grade:'Grade/Form Master',class:'Class Teacher',assignment:'Subject Teacher' };
export function isAcademicIntelligence(value: unknown): value is AcademicIntelligence {
  if (!value || typeof value !== 'object') return false;
  const data = value as AcademicIntelligence;
  const objects = (items: unknown): items is Record<string, unknown>[] => Array.isArray(items) && items.every(item=>item!==null&&typeof item==='object');
  const strings = (items: unknown) => Array.isArray(items) && items.every(item=>typeof item==='string');
  return Boolean(data.scope && data.scope.level in scopeNames && Array.isArray(data.scope.available_scopes)
    && data.scope.available_scopes.every(scope=>scope in scopeNames)
    && data.filters && data.performance && data.previous && data.options
    && ['exams','departments','subjects','classes','streams','teachers'].every(key=>objects(data.options[key as keyof typeof data.options])) && strings(data.options.grades)
    && objects(data.comparisons) && data.comparisons.every(c=>c.consistency&&c.drill_down) && objects(data.gaps)
    && data.learners && objects(data.learners.items) && data.learners.items.every(l=>objects(l.subjects)&&strings(l.risk?.reasons)&&objects(l.history)&&l.consistency&&objects(l.interventions)
      &&(!l.positions||objects(l.positions.subjects)))
    && objects(data.summary) && data.summary.every(s=>typeof s.text==='string'&&typeof s.category==='string'&&typeof s.view==='string')
    && objects(data.distribution) && objects(data.benchmarks) && data.band_movement
    && data.risk && objects(data.risk.distribution) && data.operations && objects(data.operations.report_cards)
    && data.interventions && objects(data.interventions.items) && data.targets && data.availability
    && (!data.cohorts||(objects(data.cohorts)&&data.cohorts.every(c=>objects(c.progression))))
    && (!data.period_trends||(objects(data.period_trends.terms)&&objects(data.period_trends.years)))
    && (!data.period_comparisons||(objects(data.period_comparisons)&&data.period_comparisons.every(p=>p.current&&p.previous))));
}
export const displayNumber = (n: number | null | undefined, suffix='') => n === null || n === undefined || !Number.isFinite(n) ? 'Not available' : `${n.toFixed(1)}${suffix}`;
export const displayChange = (n: number | null | undefined) => n === null || n === undefined || !Number.isFinite(n) ? 'No previous exam' : `${n>0?'+':''}${n.toFixed(1)} points`;
