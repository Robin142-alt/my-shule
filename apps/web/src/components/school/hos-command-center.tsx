"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { hosWorkspaces, normalizeHosSection, type HosSection } from "@/lib/school/hos-workspaces";
import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "./integrated-school-command-header";
import { buildSchoolSectionHref } from "./school-pages";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SubjectAppointment = {
  id: string;
  subject_id: string;
  subject_name: string;
  appointment_type: string;
  status: string;
  academic_year_name: string | null;
  class_name: string | null;
  stream_name: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";

export function SubjectAppointmentsWorkspace({ onOpenSubject }: { onOpenSubject?: (subjectId: string) => void } = {}) {
  const { data, isLoading, isFetching, error, refetch } = useSchoolQuery<SubjectAppointment[]>("/academics/my-subject-appointments");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const appointments = (data ?? []).filter(item => (!status || item.status === status) && `${item.subject_name} ${item.class_name ?? ""} ${item.stream_name ?? ""} ${item.academic_year_name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="subject-appointments-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="subject-appointments-title" className="text-xl font-bold">My Subject Appointments</h2><p className="mt-2 text-sm text-slate-600">Your subject responsibilities, dates and appointment history. Only active appointments grant subject analytics access.</p></div>
      <button className={action} disabled={isFetching} onClick={() => void refetch()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh appointments</button>
    </div>
    {isLoading ? <p role="status">Loading your subject appointments…</p> : error ? <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger"><p>{error.message}</p><button className={`${action} mt-3`} onClick={() => void refetch()}>Retry appointments</button></div> : <>
      <div className="flex flex-wrap items-end gap-3"><label className="block min-w-0 flex-1 text-sm font-semibold">Find an appointment<input type="search" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={search} onChange={event => setSearch(event.target.value)} placeholder="Subject, class, stream or year" /></label>
        <label className="block text-sm font-semibold">Appointment status<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{[...new Set((data ?? []).map(item => item.status))].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      {Boolean(data?.length) && <p role="status" className="text-sm text-muted">{appointments.length} of {data!.length} appointments · {data!.filter(item => item.status === "active").length} active</p>}
      {!data?.length ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5"><h3 className="font-bold">No subject appointment yet</h3><p className="mt-2 text-sm">Ask the Principal to open Academic Foundation → Subjects &amp; Departments → Assign or change HOS and assign your active staff account to a subject. Your analytics will become available for published exams while your appointment is active.</p></div> : !appointments.length ? <div className="rounded-lg bg-slate-50 p-4"><p>No appointments match your search.</p><button className={`${action} mt-3`} onClick={() => { setSearch(""); setStatus(""); }}>Clear search</button></div> : <ul className="grid gap-3 md:grid-cols-2">{appointments.map(item => <li key={item.id} className="min-w-0 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-bold">{item.subject_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "active" ? "bg-success-soft text-success" : "bg-slate-100 text-slate-700"}`}>{item.status.replaceAll("_", " ")}</span></div>
        <p className="mt-2 text-sm text-slate-600">{[item.academic_year_name ?? "All academic years", item.class_name ?? "All classes", item.stream_name].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-sm">{item.effective_from ?? "No start date recorded"} to {item.effective_to ?? "no end date"}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.appointment_type} appointment</p>
        {item.status === "active" && item.subject_id && onOpenSubject && <button className={`${action} mt-4`} onClick={() => onOpenSubject(item.subject_id)}>View subject results</button>}
      </li>)}</ul>}
    </>}
  </section>;
}

export function HosCommandCenter({ activeSection, routeMode = "hosted" }: { activeSection?: string; routeMode?: "hosted" | "public" }) {
  const [section, setSection] = useState(() => normalizeHosSection(activeSection));
  const [previousRoute, setPreviousRoute] = useState(activeSection);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<string>();
  if (previousRoute !== activeSection) {
    setPreviousRoute(activeSection);
    setSection(normalizeHosSection(activeSection));
  }
  useEffect(() => {
    const restore = () => setSection(normalizeHosSection(window.location.pathname.split("/").filter(Boolean).at(-1)));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const current = hosWorkspaces.find(item => item.id === section)!;
  const visibleItems = hosWorkspaces.filter(item => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(search.trim().toLowerCase()));
  function openSection(next: HosSection) {
    setSection(next);
    setSearch("");
    const href = buildSchoolSectionHref("hos", next, routeMode);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
  }
  return <div className="authenticated-app min-h-dvh bg-background text-foreground lg:h-dvh lg:overflow-hidden" data-testid="hos-command-center" data-role-dashboard="hos" data-active-view={section}>
    <div className="flex min-h-dvh lg:h-full">
      <aside className="hidden h-full w-[292px] shrink-0 overflow-y-auto bg-primary p-4 text-white lg:block">
        <SchoolCommandSidebarIdentity eyebrow="Subject command" title="Head of Subject" subtitle="Published results and learner support" />
        <label className="mb-3 flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 focus-within:ring-2 focus-within:ring-inverse-accent">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="sr-only">Search HOS workspaces</span>
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a workspace" className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-sidebar-muted" />
        </label>
        <nav aria-label="Head of Subject workspaces" className="space-y-1">
          {visibleItems.map((item, index) => <div key={item.id}>
            {item.group !== visibleItems[index - 1]?.group && <p className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">{item.group}</p>}
            <Link href={buildSchoolSectionHref("hos", item.id, routeMode)} aria-current={section === item.id ? "page" : undefined}
              onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); openSection(item.id); } }}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-inverse-accent ${section === item.id ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-sidebar-muted hover:bg-white/10 hover:text-white"}`}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}
            </Link>
          </div>)}
          {!visibleItems.length && <div className="px-3 py-4 text-sm"><p>No matching workspace.</p><button className="mt-2 min-h-11 font-semibold underline" onClick={() => setSearch("")}>Clear workspace search</button></div>}
        </nav>
        <p className="mt-6 border-t border-white/15 pt-4 text-xs leading-5 text-sidebar-muted">Also teaching? Use the dashboard switcher for your assigned classes, marks and attendance.</p>
      </aside>
      <main id="hos-main" className="app-command-main min-w-0 flex-1 lg:flex lg:h-full lg:flex-col">
        <header className="app-command-topbar sticky top-0 z-20 border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1 lg:hidden"><MobileWorkspaceNavigation label="Head of Subject workspace" items={hosWorkspaces} value={section} onValueChange={value => openSection(normalizeHosSection(value))} testId="hos-mobile-workspace-nav" /></div>
            <p className="hidden text-sm font-semibold text-muted lg:block">Head of Subject <span className="mx-2 text-border-strong">/</span><span className="text-foreground">{current.label}</span></p>
            <NotificationBell />
          </div>
        </header>
        <div className="app-content space-y-5 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-6">
          <IntegratedSchoolCommandHeader roleTitle="Head of Subject" fallbackUserLabel="Head of Subject" contextLabel="Subject oversight" />
          {section === "subjects" ? <SubjectAppointmentsWorkspace onOpenSubject={id => { setSubjectId(id); openSection("academic-intelligence"); }} /> : <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><p>Published results for your appointed subjects.</p><Link href={buildSchoolSectionHref("hos", "subjects", routeMode)} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openSection("subjects"); } }} className="inline-flex min-h-11 items-center font-semibold text-info underline">Check your subject appointments</Link></div>
            <AcademicIntelligenceWorkspace audience="hos" initialSubjectId={subjectId} activeView={current.view ?? "Overview"} onViewChange={view => openSection(hosWorkspaces.find(item => item.view === view)?.id ?? "academic-intelligence")} hideNavigation />
          </>}
        </div>
      </main>
    </div>
  </div>;
}
