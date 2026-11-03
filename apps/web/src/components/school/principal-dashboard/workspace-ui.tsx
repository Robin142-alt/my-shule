"use client";

import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { WorkspacePresentationProvider } from '@/components/ui/workspace-presentation';
import styles from './workspace.module.css';

export type PrincipalTone = 'blue' | 'violet' | 'mint' | 'amber' | 'rose';
export { styles as principalStyles };

export function PrincipalWorkspaceSurface({ children, overview = false }: { children: ReactNode; overview?: boolean }) {
  return <WorkspacePresentationProvider dialogClassName={styles.dialog}>
    <div className={overview ? undefined : styles.workspace} data-principal-workspace={overview ? 'overview' : 'content'}>{children}</div>
  </WorkspacePresentationProvider>;
}

export function PrincipalHeader({ title, description, icon: Icon, actions, tone = 'blue' }: {
  title: string; description: string; icon: LucideIcon; actions?: ReactNode; tone?: PrincipalTone;
}) {
  return <header className={styles.header} data-tone={tone}>
    <span className={styles.headerIcon}><Icon aria-hidden="true" /></span>
    <div className={styles.headerCopy}><h2>{title}</h2><p>{description}</p></div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>;
}

export function PrincipalMetrics({ items }: { items: Array<{ label: string; value: ReactNode; detail?: ReactNode; icon: LucideIcon; tone: PrincipalTone }> }) {
  return <div className={styles.metrics}>{items.map(({ label, value, detail, icon: Icon, tone }) =>
    <section className={styles.metric} key={label} data-tone={tone} aria-label={label}>
      <span className={styles.metricIcon}><Icon aria-hidden="true" /></span><div><p>{label}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
    </section>)}</div>;
}

export function PrincipalPanel({ title, description, actions, children, tone = 'blue', className = '' }: {
  title: string; description?: string; actions?: ReactNode; children: ReactNode; tone?: PrincipalTone; className?: string;
}) {
  return <section className={`${styles.panel} ${className}`} data-tone={tone}>
    <header className={styles.panelHeading}><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{actions && <div className={styles.actions}>{actions}</div>}</header>
    <div className={styles.panelBody}>{children}</div>
  </section>;
}

export function PrincipalTrend({ points, label, percentage = false }: { points: Array<{ label: string; value: number | null }>; label: string; percentage?: boolean }) {
  const max = percentage ? 100 : Math.max(1, ...points.map(point => point.value ?? 0));
  if (!points.length) return <p className={styles.empty}>No recorded results for this period. The trend appears when records are available.</p>;
  return <figure className={styles.trend} aria-label={label}>
    <div className={styles.plot} style={{ '--plot-columns': points.length } as CSSProperties}>
      {points.map((point, index) => <div key={`${point.label}-${index}`} className={styles.plotColumn} data-tone={(['blue', 'violet', 'mint', 'amber', 'rose'] as const)[index % 5]}>
        <strong aria-label={point.value === null ? 'No numeric results' : undefined}>{point.value === null ? '—' : `${Number(point.value.toFixed(1)).toLocaleString()}${percentage ? '%' : ''}`}</strong>
        <div className={styles.barTrack}>{point.value !== null && <span className={styles.bar} style={{ height: `${Math.max(0, Math.min(100, point.value / max * 100))}%` }} />}</div>
        <span className={styles.plotLabel} title={point.label}>{point.label}</span>
      </div>)}
    </div><figcaption>{label}{percentage ? ' · Score out of 100%' : ''}</figcaption>
  </figure>;
}
