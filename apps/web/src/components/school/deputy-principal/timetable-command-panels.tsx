"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Copy, History, MapPin, RefreshCw, ShieldAlert, WandSparkles } from "lucide-react";

import {
  type ClassSection,
  type GenerationResponse,
  type ReadinessResponse,
  type Subject,
  type Teacher,
  type TimetableResource,
  type TimetableVersion,
  type UnscheduledLesson,
  teacherId,
  teacherLabel,
} from "./timetable-types";

export function TimetableReadinessPanel({
  readiness,
  loading,
  error,
  onRetry,
  academicSetupHref = "/school/deputy-principal/academics",
}: {
  readiness?: ReadinessResponse;
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  academicSetupHref?: string;
}) {
  if (loading) return <section className="rounded-xl border border-border bg-white p-5 text-sm font-bold text-muted">Checking real academic setup, allocations, periods, and requirements...</section>;
  if (error || !readiness) return (
    <section className="rounded-xl border border-danger-border bg-danger-soft p-5 text-rose-900">
      <p className="font-black">Generation readiness could not be checked</p>
      <p className="mt-1 text-sm">Automatic generation stays unavailable until the server can verify the timetable inputs.</p>
      <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-rose-300 bg-white px-4 text-sm font-black">Retry readiness check</button>
    </section>
  );

  const tone = readiness.status === "READY"
    ? "border-emerald-300 bg-success-soft text-emerald-950"
    : readiness.status === "WARNING"
      ? "border-amber-300 bg-warning-soft text-amber-950"
      : "border-rose-300 bg-danger-soft text-rose-950";
  const Icon = readiness.status === "READY" ? CheckCircle2 : readiness.status === "WARNING" ? AlertTriangle : ShieldAlert;
  const issues = [...readiness.blockers, ...readiness.warnings];

  return (
    <section className={`rounded-xl border p-5 ${tone}`} data-readiness-status={readiness.status}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-6 w-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs font-black uppercase tracking-[0.14em]">Generation readiness</p><h3 className="mt-1 text-lg font-black">{readiness.status === "READY" ? "Ready to generate" : readiness.status === "WARNING" ? "Ready with warnings" : "Setup blockers need attention"}</h3></div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black">{readiness.status}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Teaching days", readiness.metrics.teaching_days ?? 0],
              ["Periods", readiness.metrics.teaching_periods ?? 0],
              ["Classes", readiness.metrics.classes ?? 0],
              ["Teachers", readiness.metrics.active_teachers ?? 0],
              ["Requirements", readiness.metrics.requirements ?? 0],
              ["Lessons needed", readiness.metrics.required_lessons ?? 0],
            ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/70 p-2"><p className="text-[11px] font-bold opacity-70">{label}</p><p className="text-lg font-black">{value}</p></div>)}
          </div>
          {issues.length > 0 ? <div className="mt-4 space-y-2">{issues.map((issue) => (
            <div key={`${issue.code}-${issue.message}`} className="flex flex-col gap-2 rounded-lg bg-white/75 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div><span className="mr-2 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase">{issue.severity}</span><span className="font-bold">{issue.message}</span>
                {issue.details?.length ? <ul className="mt-2 space-y-1 text-xs">{issue.details.map((detail) => <li key={detail.requirement_id}>{[detail.class_name, detail.stream_name, detail.subject_name].filter(Boolean).join(" / ")}: {detail.reason}</li>)}</ul> : null}
              </div>
              {issue.action_url ? <Link href={issue.action_url === "/school/deputy-principal/academics" ? academicSetupHref : issue.action_url} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-current px-3 text-xs font-black">Fix in MyShule</Link> : null}
            </div>
          ))}</div> : <p className="mt-4 text-sm font-bold">All required inputs passed the server readiness check.</p>}
        </div>
      </div>
    </section>
  );
}

export function GenerationSummaryPanel({ result, onClose }: { result: GenerationResponse; onClose: () => void }) {
  return (
    <section className="rounded-xl border border-info-border bg-info-soft p-5 text-blue-950" aria-label="Generation summary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]"><WandSparkles className="h-4 w-4" /> Generation complete</p><h3 className="mt-1 text-lg font-black">{result.run.unscheduled_lessons ? "Review the remaining lessons" : "Your timetable is ready to review"}</h3><p className="mt-1 text-sm">Review your saved lessons and check conflicts before publishing.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black">Dismiss</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted">Required</p><p className="text-2xl font-black">{result.run.required_lessons}</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted">Scheduled</p><p className="text-2xl font-black text-success">{result.run.scheduled_lessons}</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted">Unscheduled</p><p className="text-2xl font-black text-warning">{result.run.unscheduled_lessons}</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted">Warnings</p><p className="text-2xl font-black">{Array.isArray(result.run.warnings) ? result.run.warnings.length : result.run.warnings}</p></div>
      </div>
    </section>
  );
}

export function UnscheduledLessonsPanel({
  items,
  classes,
  subjects,
  teachers,
  resources,
  loading,
  error,
  onRetry,
  onPlace,
}: {
  items: UnscheduledLesson[];
  classes: ClassSection[];
  subjects: Subject[];
  teachers: Teacher[];
  resources: TimetableResource[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onPlace: (item: UnscheduledLesson) => void;
}) {
  const label = <T extends { id: string; name: string }>(rows: T[], id?: string | null) => rows.find((row) => row.id === id)?.name ?? "Not configured";
  const teacherName = (id?: string | null) => teachers.find((teacher) => teacherId(teacher) === id) ? teacherLabel(teachers.find((teacher) => teacherId(teacher) === id)!) : "Use academic allocation";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-5" aria-label="Unscheduled lessons">
      <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-black text-foreground"><Clock3 className="h-5 w-5" /> Unscheduled lessons</h3><p className="mt-1 text-sm text-muted">Requirements the scheduler could not place remain visible for review and valid-slot placement.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{items.length} unresolved</span></div>
      {loading ? <p className="rounded-xl bg-surface-muted p-6 text-center text-sm font-bold text-muted">Loading unresolved requirements...</p> : error ? <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger"><p>Unscheduled requirements could not be loaded.</p><button type="button" onClick={onRetry} className="mt-2 min-h-10 rounded-lg border border-rose-300 bg-white px-3"><RefreshCw className="mr-2 inline h-4 w-4" />Retry</button></div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-6 text-center text-sm font-bold text-muted">No unscheduled lessons have been reported. Generate a timetable or validate the draft to check that all required periods are covered.</div> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => (
          <article key={item.id} className="rounded-xl border border-warning-border bg-warning-soft p-4 text-amber-950">
            <div className="flex items-start justify-between gap-2"><div><p className="font-black">{label(subjects, item.subject_id)}</p><p className="mt-1 text-sm font-bold">{label(classes, item.class_section_id)}</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-black">{item.remaining_periods} remaining</span></div>
            <dl className="mt-3 space-y-1 text-xs"><div><dt className="inline font-black">Teacher: </dt><dd className="inline">{teacherName(item.teacher_id)}</dd></div><div><dt className="inline font-black">Duration: </dt><dd className="inline">{item.duration_periods} period{item.duration_periods === 1 ? "" : "s"}</dd></div>{item.resource_id ? <div><dt className="inline font-black">Resource: </dt><dd className="inline">{label(resources, item.resource_id)}</dd></div> : null}</dl>
            <p className="mt-3 rounded-lg bg-white/80 p-2 text-xs"><strong>{item.reason_code}:</strong> {item.reason_message}</p>
            <button type="button" onClick={() => onPlace(item)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 text-sm font-black text-white"><MapPin className="h-4 w-4" /> Find a valid period</button>
          </article>
        ))}</div>
      )}
    </section>
  );
}

export function TimetableHistoryPanel({
  items,
  activePublishedId,
  draftId,
  loading,
  error,
  onRetry,
  onCopy,
  onRevise,
}: {
  items: TimetableVersion[];
  activePublishedId?: string | null;
  draftId?: string | null;
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onCopy: (version: TimetableVersion) => void;
  onRevise: (version: TimetableVersion) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-5" aria-label="Timetable version history">
      <div><h3 className="flex items-center gap-2 text-lg font-black text-foreground"><History className="h-5 w-5" /> Version history</h3><p className="mt-1 text-sm text-muted">Published versions remain immutable. Revisions create a new draft; copying never changes the source timetable.</p></div>
      {loading ? <p className="rounded-xl bg-surface-muted p-6 text-center text-sm font-bold text-muted">Loading version history...</p> : error ? <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger"><p>Version history could not be loaded.</p><button type="button" onClick={onRetry} className="mt-2 min-h-10 rounded-lg border border-rose-300 bg-white px-3">Retry</button></div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-6 text-center text-sm font-bold text-muted">No draft or published timetable version exists for this term yet.</div> : (
        <div className="space-y-3">{items.map((version) => (
          <article key={version.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><p className="font-black text-foreground">Revision {version.revision_number ?? "-"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${version.status === "published" ? "bg-emerald-100 text-success" : "bg-blue-100 text-info"}`}>{version.status}</span>{version.id === activePublishedId ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black uppercase text-white">Active published</span> : null}{version.id === draftId ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-900">Current draft</span> : null}</div><p className="mt-1 text-xs text-muted">Created {version.created_at ? new Date(version.created_at).toLocaleString() : "date unavailable"}{version.published_at ? ` - Published ${new Date(version.published_at).toLocaleString()}` : ""}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onCopy(version)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong bg-white px-3 text-xs font-black"><Copy className="h-4 w-4" /> Copy to draft</button>{version.status === "published" && version.id === activePublishedId ? <button type="button" onClick={() => onRevise(version)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-info px-3 text-xs font-black text-white">Create revision</button> : null}</div>
          </article>
        ))}</div>
      )}
    </section>
  );
}
