"use client";
import { useEffect, useState } from 'react';
import { ChevronRight, Clock3, UsersRound } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { OverviewHeading, OverviewState } from './overview-section';
import type { SectionData, WaitingVisitor } from './overview-types';
import styles from './overview.module.css';

export function waitingTime(arrival: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(arrival)) / 60_000));
  if (!Number.isFinite(minutes)) return 'Time unavailable';
  if (minutes < 1) return 'Just arrived';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function OverviewVisitors({ section, loading, onRetry }: {
  section?: SectionData<WaitingVisitor[]>; loading: boolean; onRetry: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); tick();
    const timer = window.setInterval(tick, 15_000); return () => window.clearInterval(timer);
  }, []);
  const visitors = section?.state === 'ready' ? section.data : [];
  const active = visitors.find(visitor => visitor.id === selected);
  return <section className={`${styles.panel} ${styles.visitorsPanel}`} aria-label="People waiting to see you">
    <OverviewHeading icon={UsersRound} violet detail="Checked in by the secretary, in order of arrival." action={visitors.length > 2 ?
      <button className={styles.outlineButton} onClick={() => setAll(true)}>View All<ChevronRight aria-hidden="true" /></button> : undefined}>
      People Waiting to See You {section?.state === 'ready' && <span className={styles.badge}>{visitors.length}</span>}
    </OverviewHeading>
    {loading ? <OverviewState loading /> : section?.state === 'locked' ? <OverviewState locked />
      : !section || section.state === 'error' ? <OverviewState onRetry={onRetry}>The reception queue could not be loaded.</OverviewState>
      : !visitors.length ? <OverviewState>No one is waiting to see you. Visitors checked in by the Secretary will appear here.</OverviewState>
      : <div className={styles.visitorTable} role="table" aria-label="Visitors in arrival order">
        <div className={styles.visitorTableHead} role="row"><span role="columnheader">Name</span><span role="columnheader">Role / Relationship</span><span role="columnheader">Purpose of Visit</span><span role="columnheader">Waiting Time</span><span role="columnheader" className="sr-only">Details</span></div>
        {visitors.slice(0, 4).map(visitor => <div className={styles.visitorRow} role="row" key={visitor.id}>
          <strong role="cell">{visitor.visitor_name}</strong>
          <span role="cell" data-label="Role / Relationship">{visitor.role_relationship || 'Not recorded'}</span>
          <span role="cell" data-label="Purpose of Visit">{visitor.purpose}</span>
          <span role="cell" className={styles.waitCell}><span className={styles.waitPill}><Clock3 aria-hidden="true" />{now === null ? 'Calculating…' : waitingTime(visitor.arrival_time, now)}</span></span>
          <span role="cell"><button className={styles.rowButton} aria-label={`View details for ${visitor.visitor_name}`} onClick={() => setSelected(visitor.id)}><ChevronRight aria-hidden="true" /></button></span>
        </div>)}
      </div>}
    <Modal open={all} onClose={() => setAll(false)} title="All waiting visitors">
      <p className="mb-3 text-sm text-muted">Checked in by the Secretary, in arrival order.</p>
      <div className={styles.visitorDirectory}>{visitors.map(visitor => <button key={visitor.id}
        aria-label={`View details for ${visitor.visitor_name}`} onClick={() => { setAll(false); setSelected(visitor.id); }}>
        <strong>{visitor.visitor_name}</strong><span>{visitor.role_relationship || 'Not recorded'}</span>
        <span>{visitor.purpose}</span><small>{now === null ? 'Calculating…' : waitingTime(visitor.arrival_time, now)}</small>
      </button>)}</div>
      {!visitors.length && <p role="status">No one is waiting to see you.</p>}
    </Modal>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title="Visitor details">
      {active ? <dl className={styles.detailList}><dt>Name</dt><dd>{active.visitor_name}</dd><dt>Role / Relationship</dt><dd>{active.role_relationship || 'Not recorded'}</dd><dt>Purpose of visit</dt><dd>{active.purpose}</dd><dt>Arrived</dt><dd>{new Date(active.arrival_time).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</dd><dt>Waiting</dt><dd>{now === null ? 'Calculating…' : waitingTime(active.arrival_time, now)}</dd></dl>
        : <p role="status">This visitor is no longer in your waiting queue.</p>}
    </Modal>
  </section>;
}
