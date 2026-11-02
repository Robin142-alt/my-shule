import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './overview.module.css';

export function OverviewHeading({ icon: Icon, children, detail, action, violet = false }: {
  icon: LucideIcon; children: ReactNode; detail?: string; action?: ReactNode; violet?: boolean;
}) {
  return <div className={`${styles.heading} ${violet ? styles.violetHeading : ''}`}>
    <Icon className={styles.sectionIcon} aria-hidden="true" />
    <div><h2>{children}</h2>{detail && <p>{detail}</p>}</div>{action && <div className={styles.headingAction}>{action}</div>}
  </div>;
}

export function OverviewState({ loading, locked, onRetry, children }: {
  loading?: boolean; locked?: boolean; onRetry?: () => void; children?: ReactNode;
}) {
  if (loading) return <div className={styles.skeleton} role="status" aria-label="Loading school information" />;
  return <div className={styles.state} role={onRetry ? 'alert' : 'status'}>
    <p>{locked ? 'You do not have permission to view these records.' : children}</p>
    {onRetry && <button type="button" className={styles.outlineButton} onClick={onRetry}>Retry</button>}
  </div>;
}
