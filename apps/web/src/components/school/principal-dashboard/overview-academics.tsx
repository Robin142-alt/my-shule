"use client";
import { useState, type CSSProperties } from 'react';
import { Award, ChartNoAxesColumnIncreasing, Trophy, ArrowDown, ArrowUp } from 'lucide-react';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { usePermissions } from '@/components/providers/permission-context';
import { Modal } from '@/components/ui/modal';
import { OverviewHeading, OverviewState } from './overview-section';
import type { OverviewNavigate } from './overview-types';
import styles from './overview.module.css';

type ClassResult = { dimension: string; id: string; label: string; mean: number | null;
  learners_examined: number; expected_learners: number; marks_completion: number | null };
type Performance = {
  filters: { exam_series_id: string | null; comparison_exam_id: string | null };
  options: { exams: Array<{ id: string; name: string }> };
  kpis: { school_average: number | null }; previous: { mean: number | null };
  comparisons: ClassResult[];
};
const percent = (value: number | null | undefined) => value == null ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

export function OverviewAcademics({ onNavigate }: { onNavigate?: OverviewNavigate }) {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [exam, setExam] = useState('');
  const [selected, setSelected] = useState<ClassResult | null>(null);
  const allowed = hasPermission('exams:read');
  const query = useSchoolQuery<Performance>(`/exams/analytics?scope=school&page_size=1${exam ? `&exam_series_id=${encodeURIComponent(exam)}` : ''}`,
    { enabled: allowed, refetchInterval: 60_000 });
  const data = query.data;
  const classes = data?.comparisons?.filter(row => row.dimension === 'class') ?? [];
  const scored = classes.filter((row): row is ClassResult & { mean: number } => row.mean !== null);
  const strongest = scored.length ? Math.max(...scored.map(row => row.mean)) : null;
  const weakest = scored.length ? Math.min(...scored.map(row => row.mean)) : null;
  const average = data?.kpis?.school_average;
  const previous = data?.previous?.mean;
  const change = average != null && previous != null ? average - previous : null;
  const namesAt = (score: number | null) => scored.filter(row => row.mean === score).map(row => row.label).join(', ');
  return <section className={`${styles.panel} ${styles.academicsPanel}`} aria-label="Academic performance">
    <OverviewHeading icon={ChartNoAxesColumnIncreasing} detail="Average score by class" action={
      <select className={styles.examSelect} aria-label="Academic performance exam" value={exam}
        disabled={!allowed || query.isLoading || !data?.options?.exams?.length}
        onChange={event => { setExam(event.target.value); setSelected(null); }}>
        <option value="">Latest Exam</option>
        {data?.options?.exams?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    }>Academic Performance</OverviewHeading>
    {permissionsLoading || query.isLoading ? <OverviewState loading /> : !allowed ? <OverviewState locked />
      : query.isError || !data ? <OverviewState onRetry={() => void query.refetch()}>Academic results could not be loaded.</OverviewState>
      : !scored.length ? <OverviewState>No numeric class results are available for this exam. Approved results will appear here as they are recorded.
        {onNavigate && <button className={styles.textButton} onClick={() => onNavigate('exams-reports')}>Review exams and results</button>}
      </OverviewState> : <>
        <div className={styles.chartScroll} tabIndex={0} aria-label="Class performance chart, scroll to view all classes">
          <div className={styles.chart} style={{ '--class-count': classes.length } as CSSProperties}>
            <div className={styles.axis} aria-hidden="true">{[100, 80, 60, 40, 20, 0].map(tick => <span key={tick}>{tick}%</span>)}</div>
            <div className={styles.bars}>
              {classes.map((row, index) => <button key={row.id} type="button" className={styles.barColumn}
                aria-label={`${row.label}: ${row.mean == null ? 'no numeric results' : percent(row.mean)}. View class details`}
                onClick={() => setSelected(row)}>
                <div className={styles.barTrack}><div className={styles.bar} data-color={index % 5}
                  style={{ '--score': `${Math.max(0, Math.min(100, row.mean ?? 0))}%` } as CSSProperties}>
                  <strong>{percent(row.mean)}</strong>
                </div></div><span className={styles.className}>{row.label}</span>
              </button>)}
            </div>
          </div>
        </div>
        <div className={styles.academicSummary}>
          <div className={styles.schoolAverage} role="group" aria-label="School average summary"><Award aria-hidden="true" /><div><h3>School Average</h3><strong>{percent(average)}</strong></div>
            {change !== null && <span className={change >= 0 ? styles.positive : styles.negative}>
              {change >= 0 ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
              {Math.abs(change).toFixed(1)} pts vs previous
            </span>}
          </div>
          <div className={styles.classHighlights}>
            <p><Trophy aria-hidden="true" /><span>Strongest class{scored.filter(row => row.mean === strongest).length > 1 ? 'es' : ''}</span><strong>{namesAt(strongest)} ({percent(strongest)})</strong></p>
            <p><ArrowDown aria-hidden="true" /><span>Weakest class{scored.filter(row => row.mean === weakest).length > 1 ? 'es' : ''}</span><strong>{namesAt(weakest)} ({percent(weakest)})</strong></p>
          </div>
        </div>
      </>}
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.label} results` : 'Class results'}>
      {selected && <dl className={styles.detailList}>
        <dt>Average score</dt><dd>{percent(selected.mean)}</dd>
        <dt>Learners with numeric results</dt><dd>{selected.learners_examined} of {selected.expected_learners}</dd>
        <dt>Marks completion</dt><dd>{percent(selected.marks_completion)}</dd>
      </dl>}
      <p className="mt-4 text-sm text-muted">Uses the school&apos;s saved subject weightings and grading configuration. Missing marks are not counted as zero.</p>
      {onNavigate && <button className={styles.outlineButton} onClick={() => onNavigate('exam-analytics')}>Open Exam Analytics</button>}
    </Modal>
  </section>;
}
