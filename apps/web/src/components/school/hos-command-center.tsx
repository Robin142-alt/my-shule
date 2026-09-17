"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, BookOpen, RefreshCw } from "lucide-react";
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

export function SubjectAppointmentsWorkspace() {
  const { data, isLoading, isFetching, error, refetch } = useSchoolQuery<SubjectAppointment[]>("/academics/my-subject-appointments");
  const [search, setSearch] = useState("");
  const appointments = (data ?? []).filter(item => `${item.subject_name} ${item.class_name ?? ""} ${item.academic_year_name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="subject-appointments-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="subject-appointments-title" className="text-xl font-bold">My Subject Appointments</h2><p className="mt-2 text-sm text-slate-600">Your subject responsibilities, dates and appointment history. Only active appointments grant subject analytics access.</p></div>
      <button className={action} disabled={isFetching} onClick={() => void refetch()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh appointments</button>
    </div>
    {isLoading ? <p role="status">Loading your subject appointments…</p> : error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800"><p>{error.message}</p><button className={`${action} mt-3`} onClick={() => void refetch()}>Retry appointments</button></div> : <>
      <label className="block text-sm font-semibold">Find an appointment<input type="search" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={search} onChange={event => setSearch(event.target.value)} placeholder="Subject, class or academic year" /></label>
      {!data?.length ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5"><h3 className="font-bold">No subject appointment yet</h3><p className="mt-2 text-sm">Ask the Principal to open Staff &amp; Roles → Manage subject appointments, select your active staff account and assign a subject. Your analytics will become available for published exams while your appointment is active.</p></div> : !appointments.length ? <div className="rounded-lg bg-slate-50 p-4"><p>No appointments match your search.</p><button className={`${action} mt-3`} onClick={() => setSearch("")}>Clear search</button></div> : <ul className="grid gap-3 md:grid-cols-2">{appointments.map(item => <li key={item.id} className="min-w-0 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-bold">{item.subject_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{item.status.replaceAll("_", " ")}</span></div>
        <p className="mt-2 text-sm text-slate-600">{[item.academic_year_name ?? "All academic years", item.class_name ?? "All classes", item.stream_name].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-sm">{item.effective_from ?? "No start date recorded"} to {item.effective_to ?? "no end date"}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.appointment_type} appointment</p>
      </li>)}</ul>}
    </>}
  </section>;
}

export function HosCommandCenter({ activeSection, routeMode = "hosted" }: { activeSection?: string; routeMode?: "hosted" | "public" }) {
  const appointmentsView = activeSection === "subjects";
  const navigation = [
    { id: "academic-intelligence", label: "Subject Analytics", icon: BarChart3, active: !appointmentsView },
    { id: "subjects", label: "My Subject Appointments", icon: BookOpen, active: appointmentsView },
  ];
  return <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" data-testid="hos-command-center">
    <aside className="border-b border-slate-200 bg-white p-4 lg:border-r lg:border-b-0">
      <SchoolCommandSidebarIdentity eyebrow="Head of Subject" subtitle="Subject oversight and learner support" tone="light" />
      <nav aria-label="Head of Subject workspaces" className="flex flex-wrap gap-2 lg:flex-col">{navigation.map(item => <Link key={item.id} href={buildSchoolSectionHref("hos", item.id, routeMode)} aria-current={item.active ? "page" : undefined} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold ${item.active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}</Link>)}</nav>
      <p className="mt-4 text-sm text-slate-600">Use the dashboard switcher to open your teaching duties. Marks entry and attendance follow your teaching assignments.</p>
    </aside>
    <main className="min-w-0 space-y-5 p-4 sm:p-6">
      <IntegratedSchoolCommandHeader roleTitle="Head of Subject" contextLabel="Subject oversight" />
      {appointmentsView ? <SubjectAppointmentsWorkspace /> : <>
        <p className="text-sm text-slate-600">Review published subject results, find learners who need support, and prepare reports. Missing access? <Link href={buildSchoolSectionHref("hos", "subjects", routeMode)} className="font-semibold text-blue-700 underline">Check your subject appointments</Link>.</p>
        <AcademicIntelligenceWorkspace audience="hos" />
      </>}
    </main>
  </div>;
}
