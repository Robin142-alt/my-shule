"use client";
import { useEffect, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, CalendarCheck2, CalendarDays, Check, ChevronRight, ClipboardCheck,
  Coins, Cross, GraduationCap, Layers, Send, Target, UsersRound, WalletCards, Zap, type LucideIcon } from 'lucide-react';
import { usePermissions } from '@/components/providers/permission-context';
import { isSchoolQueryForPath, useSchoolQuery } from '@/lib/data/school-hooks';
import { useOptionalSchoolTenantId } from '@/lib/data/school-tenant-scope';
import { useDashboardEventBus } from '@/lib/dashboard-communication/dashboard-communication-provider';
import { buildTimeAwareGreeting } from '@/lib/greetings/time-aware-greeting';
import { Modal } from '@/components/ui/modal';
import { OverviewAcademics } from './overview-academics';
import { OverviewVisitors } from './overview-visitors';
import { OverviewHeading, OverviewState } from './overview-section';
import type { OverviewDetails, OverviewNavigate, OverviewSection } from './overview-types';
import styles from './overview.module.css';

type PrincipalOverviewData = { totalStudents: number; totalStaff: number; activeIssues: number; pendingApprovals: number };
export type PrincipalDashboardAlert = { id: string; module_code: string; title: string; message: string;
  severity: 'warning' | 'critical'; action_hint?: string };
export type PrincipalExecutiveDashboardSummary = { tenant_id: string; generated_at: string; enabled_modules: string[];
  alerts: PrincipalDashboardAlert[]; notifications: PrincipalDashboardAlert[]; realtime_channels: string[] };
const alertRoutes: Record<string, OverviewSection> = { finance: 'fees', academics: 'syllabus-coverage',
  attendance: 'attendance', teacher_biometric_attendance: 'attendance', exams: 'exams-reports',
  clinic_health: 'sick-bay', discipline: 'discipline', students: 'students', library: 'library',
  boarding: 'boarding', transport: 'transport', hr: 'staff' };

export function PrincipalOverviewWorkspace({ executiveDashboard, executiveDashboardLoading = false,
  executiveDashboardStreamDegraded = false, onNavigate,
}: { executiveDashboard?: PrincipalExecutiveDashboardSummary | null; executiveDashboardLoading?: boolean;
  executiveDashboardStreamDegraded?: boolean; riskCenterLabel?: string; onNavigate?: OverviewNavigate }) {
  const base = useSchoolQuery<PrincipalOverviewData>('/admin-command/principal/overview', { refetchInterval: 30_000,
    select: value => {
      if (!value || !['totalStudents', 'totalStaff', 'activeIssues', 'pendingApprovals'].every(key =>
        typeof value[key as keyof PrincipalOverviewData] === 'number' && Number.isFinite(value[key as keyof PrincipalOverviewData]))) {
        throw new Error('The school overview returned invalid totals');
      }
      return value;
    },
  });
  const details = useSchoolQuery<OverviewDetails>('/admin-command/principal/overview-details', { refetchInterval: 15_000 });
  const profile = useSchoolQuery<{ schoolName: string; logoUrl?: string }>('/admin-command/principal/school-profile');
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const eventBus = useDashboardEventBus();
  const tenantId = useOptionalSchoolTenantId();
  const [now, setNow] = useState<Date | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  useEffect(() => { const tick = () => setNow(new Date()); tick(); const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer); }, []);
  useEffect(() => eventBus.subscribe('STUDENT_ADMITTED', () => {
    // Refetch authoritative counts; duplicate events must never inflate enrolment.
    void queryClient.invalidateQueries({ predicate: query => isSchoolQueryForPath(query.queryKey, tenantId, '/admin-command/principal/overview') });
  }), [eventBus, queryClient, tenantId]);

  const data = base.data;
  const info = details.data;
  const term = info?.calendar?.state === 'ready' ? info.calendar.data : null;
  const finance = info?.finance?.state === 'ready' ? info.finance.data : null;
  const retryDetails = () => { void details.refetch(); };
  const count = (value?: number) => value == null || base.isError ? '—' : value.toLocaleString();
  const money = (value: string) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: finance?.currency ?? 'KES', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) / 100);
  const navigate = (section: OverviewSection) => onNavigate?.(section);
  const metrics: Array<{ label: string; value: string; icon: LucideIcon; tone: string; route: OverviewSection; detail?: string }> = [
    { label: 'Students', value: count(data?.totalStudents), icon: GraduationCap, tone: 'blue', route: 'students' },
    { label: 'Staff', value: count(data?.totalStaff), icon: UsersRound, tone: 'purple', route: 'staff' },
    ...(info?.finance && info.finance.state !== 'hidden' ? [
      { label: 'Fee Collection Today', value: finance ? money(finance.collectedTodayMinor) : '—', icon: Coins, tone: 'green', route: 'fees' as const },
      { label: 'Total Arrears', value: finance ? money(finance.arrearsMinor) : '—', icon: WalletCards, tone: 'pink', route: 'fees' as const },
    ] : []),
    { label: 'Pending Approvals', value: count(data?.pendingApprovals), icon: ClipboardCheck, tone: 'pink', route: 'approvals' },
    { label: 'Open Issues', value: count(data?.activeIssues), icon: AlertTriangle, tone: 'purple', route: 'discipline',
      detail: !base.isError && data?.activeIssues === 0 ? 'All clear' : undefined },
  ];
  const alerts = executiveDashboard?.alerts ?? [];
  const actions: Array<{ label: string; icon: LucideIcon; route: OverviewSection; tone: string; permission: string }> = [
    { label: 'Send Message', icon: Send, route: 'communication', tone: 'blue', permission: 'school_sms:read' },
    { label: 'Review Approvals', icon: ClipboardCheck, route: 'approvals', tone: 'purple', permission: 'principal:read' },
    { label: 'Publish Results', icon: BookOpen, route: 'exams-reports', tone: 'green', permission: 'exams:read' },
    { label: 'Student Progression', icon: UsersRound, route: 'student-progression', tone: 'blue', permission: 'students:read' },
  ];
  return <div className={styles.overview} data-testid="principal-overview">
    <section className={styles.greeting} aria-label="School greeting">
      <div><h2>{buildTimeAwareGreeting('Principal', now)} <span aria-hidden="true">👋</span></h2>
        <p>{profile.data?.schoolName || 'Your school'}{term && <><span className={styles.termDot} aria-hidden="true" />{term.name}, {term.year}</>}</p>
      </div>
      {/* School branding remains the verified shared logo used throughout MyShule. */}
      {profile.data?.logoUrl && <img className={styles.schoolLogo} src={profile.data.logoUrl} alt={`${profile.data.schoolName} logo`} />}
    </section>
    {base.isError && <OverviewState onRetry={() => void base.refetch()}><strong>Failed to load Principal Overview</strong><br />School totals could not be loaded.</OverviewState>}
    <div className={styles.metrics} aria-label="School key figures" aria-busy={base.isLoading}>
      {metrics.map(({ label, value, icon: Icon, tone, route, detail }) => <button key={label} type="button"
        className={styles.metric} data-tone={tone} data-money={route === 'fees' || undefined} onClick={() => navigate(route)} disabled={!onNavigate}
        style={{ '--value-length': value.length } as CSSProperties}
        aria-label={route === 'students' ? 'View students' : `View ${label.toLowerCase()}`}>
        <div className={styles.metricTitle}><Icon aria-hidden="true" /><span>{label}</span></div>
        <strong>{base.isLoading ? '…' : value}</strong>{detail && <span className={styles.metricDetail}><Check aria-hidden="true" />{detail}</span>}
      </button>)}
    </div>
    {info?.finance?.state === 'error' && <OverviewState onRetry={retryDetails}>Financial totals could not be loaded.</OverviewState>}
    {details.isError && <OverviewState onRetry={retryDetails}>Some school information is unavailable. Retry to refresh the Overview.</OverviewState>}
    <OverviewAcademics key={`academics-${tenantId}`} onNavigate={onNavigate} />
    <OverviewVisitors key={`visitors-${tenantId}`} section={info?.visitors} loading={details.isLoading} onRetry={retryDetails} />
    <div className={styles.operationsGrid}>
      <section className={styles.panel} aria-label="Today's school operations">
        <OverviewHeading icon={Layers}>Today&apos;s School Operations</OverviewHeading>
        <div className={styles.smallCards}>
          <div className={styles.smallCard} data-tone="green"><CalendarCheck2 aria-hidden="true" />
            {info?.lessons?.state === 'ready' ? <><strong>{info.lessons.data.taught}<small> / {info.lessons.data.recorded}</small></strong><span>Lessons Taught</span><small>of lessons recorded today</small></>
              : <OverviewState loading={details.isLoading} locked={info?.lessons?.state === 'locked'} onRetry={info?.lessons?.state !== 'locked' ? retryDetails : undefined}>Lesson records unavailable.</OverviewState>}
          </div>
          <div className={styles.smallCard} data-tone="pink"><Cross aria-hidden="true" />
            {info?.health?.state === 'ready' ? <button className={styles.plainButton} onClick={() => navigate('sick-bay')} disabled={!onNavigate}><strong>{info.health.data.cases}</strong><span>Sick Bay Cases</span></button>
              : <OverviewState loading={details.isLoading} locked={info?.health?.state === 'locked'} onRetry={info?.health?.state !== 'locked' ? retryDetails : undefined}>Sick bay totals unavailable.</OverviewState>}
          </div>
        </div>
      </section>
      <section className={styles.panel} aria-label="This week">
        <OverviewHeading icon={CalendarDays}>This Week</OverviewHeading>
        {details.isLoading ? <OverviewState loading /> : info?.calendar?.state !== 'ready' ? <OverviewState onRetry={retryDetails}>The academic calendar could not be loaded.</OverviewState>
          : !term ? <OverviewState>No current academic term is configured.<button className={styles.textButton} disabled={!onNavigate} onClick={() => navigate('academic-setup')}>Open Academic Calendar</button></OverviewState>
          : <div className={styles.smallCards}>
            <button className={styles.smallCard} data-tone="blue" disabled={!onNavigate} onClick={() => navigate('academic-setup')}><CalendarDays aria-hidden="true" /><strong className={styles.weekNumber}>Week {term.week} of {term.weeks}</strong><span>{term.name}</span></button>
            <button className={styles.smallCard} data-tone="purple" disabled={!onNavigate} onClick={() => navigate('academic-setup')}><CalendarDays aria-hidden="true" /><strong>{term.days_left}</strong><span>Days Left</span></button>
          </div>}
      </section>
    </div>
    <section className={`${styles.panel} ${styles.attentionPanel}`} aria-label="Requires your attention">
      <OverviewHeading icon={Target} action={alerts.length > 1 ? <button className={styles.outlineButton} onClick={() => setShowAlerts(true)}>View All</button> : undefined}>Requires Your Attention {alerts.length > 0 && <span className={styles.badge}>{alerts.length}</span>}</OverviewHeading>
      {executiveDashboardStreamDegraded && <p role="status" className={styles.statusNote}>Live updates reconnecting</p>}
      {executiveDashboardLoading && !executiveDashboard ? <OverviewState loading /> : <div className={styles.attentionList}>
        {alerts.slice(0, 2).map((alert, index) => <button key={alert.id} className={styles.attentionRow} data-tone={index % 2 ? 'blue' : 'gold'}
          disabled={!onNavigate} onClick={() => navigate(alert.id === 'academics.unassigned_students' ? 'students' : alertRoutes[alert.module_code] ?? 'reports')}>
          <span className={styles.attentionIcon}>{alert.module_code === 'academics' ? <BookOpen aria-hidden="true" /> : <CalendarCheck2 aria-hidden="true" />}</span>
          <span><strong>{alert.title}</strong><small>{alert.message}</small></span><ChevronRight aria-hidden="true" />
        </button>)}
        {!base.isError && data && data.activeIssues > 0 && !alerts.some(alert => alert.module_code === 'discipline') && <button className={styles.attentionRow} data-tone="gold" onClick={() => navigate('discipline')} disabled={!onNavigate}><AlertTriangle aria-hidden="true" /><span><strong>{data.activeIssues} open school issue{data.activeIssues === 1 ? '' : 's'}</strong><small>Review reported and escalated incidents</small></span><ChevronRight aria-hidden="true" /></button>}
        {!alerts.length && !data?.activeIssues && <OverviewState>{executiveDashboard ? 'No current warning or critical school alerts.' : 'Live school alerts are temporarily unavailable.'}</OverviewState>}
      </div>}
    </section>
    <Modal open={showAlerts} onClose={() => setShowAlerts(false)} title="Requires Your Attention">
      <div className={styles.visitorDirectory}>{alerts.map(alert => <button key={alert.id} disabled={!onNavigate}
        onClick={() => { setShowAlerts(false); navigate(alert.id === 'academics.unassigned_students' ? 'students' : alertRoutes[alert.module_code] ?? 'reports'); }}>
        <strong>{alert.title}</strong><span>{alert.message}</span>
      </button>)}</div>
    </Modal>
    <section className={`${styles.panel} ${styles.quickActions}`} aria-label="Quick actions">
      <OverviewHeading icon={Zap} detail="Common tasks for your role.">Quick actions</OverviewHeading>
      <div className={styles.actionGrid}>{actions.map(({ label, icon: Icon, route, tone, permission }) => <button key={route} type="button" className={styles.actionCard} data-tone={tone}
        disabled={!onNavigate || !hasPermission(permission)} title={!hasPermission(permission) ? 'Permission required' : undefined}
        onClick={() => navigate(route)}>
        <Icon aria-hidden="true" /><strong>{label}</strong>
        {route === 'approvals' && !base.isError && Boolean(data?.pendingApprovals) && <span className={styles.actionBadge} aria-label={`${data!.pendingApprovals} pending`}>{data!.pendingApprovals}</span>}
      </button>)}</div>
    </section>
  </div>;
}
