import { Check, Clock3 } from 'lucide-react';
import styles from './syllabus-workspace.module.css';

export function CoverageProgress({ value, label }: { value: number; label: string }) {
  return <div className={styles.progress} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>;
}

export function CoverageStatus({ status }: { status: string }) {
  return <span className={styles.badge} data-status={status}>
    {['Completed', 'On track'].includes(status) ? <Check size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{status}
  </span>;
}

export function syllabusDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
}
