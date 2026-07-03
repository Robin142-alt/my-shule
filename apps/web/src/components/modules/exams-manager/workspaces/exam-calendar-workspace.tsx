"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Download, Printer, RefreshCw, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

interface ExamSeriesRow {
  id?: string;
  name?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: string | null;
  academic_term_id?: string | null;
}

export function ExamCalendarWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"Month" | "Week" | "Class" | "Teacher">("Month");
  const [focusedMonth, setFocusedMonth] = useState(new Date(2026, 5, 1));
  const { data: series, isLoading, error, refetch } = useSchoolQuery<ExamSeriesRow[]>("/exams/series");
  const visibleSeries = Array.isArray(series) ? series : [];
  const currentMonthLabel = focusedMonth.toLocaleString("en-KE", { month: "long", year: "numeric" });

  function exportCalendar() {
    downloadCsvFile({
      filename: `exam-calendar-${focusedMonth.toISOString().slice(0, 7)}.csv`,
      headers: ["Exam series", "Start", "End", "Status"],
      rows: visibleSeries.length
        ? visibleSeries.map((row) => [
            row.name ?? row.id ?? "Untitled series",
            row.starts_on ? new Date(row.starts_on).toLocaleDateString() : "",
            row.ends_on ? new Date(row.ends_on).toLocaleDateString() : "",
            row.status ?? "draft",
          ])
        : [["No exam events", "", "", "empty"]],
    });
    setNotice("Exam calendar CSV exported from loaded tenant-scoped exam series.");
  }

  function printCalendar() {
    openPrintDocument({
      eyebrow: "Exam calendar",
      title: currentMonthLabel,
      subtitle: `${visibleSeries.length} exam event${visibleSeries.length === 1 ? "" : "s"} loaded`,
      rows: visibleSeries.slice(0, 12).map((row) => ({
        label: row.name ?? row.id ?? "Untitled series",
        value: `${row.starts_on ? new Date(row.starts_on).toLocaleDateString() : "No start"} - ${row.ends_on ? new Date(row.ends_on).toLocaleDateString() : "No end"} (${row.status ?? "draft"})`,
      })),
      footer: "Calendar generated from the current school's exam series.",
    });
    setNotice("Exam calendar print preview ready.");
  }

  function moveMonth(delta: number) {
    setFocusedMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function syncAcademicCalendar() {
    setSavingAction("calendar-sync");
    try {
      await refetch();
      setNotice(`Academic calendar synced from ${visibleSeries.length} tenant-scoped exam event${visibleSeries.length === 1 ? "" : "s"}.`);
    } finally {
      setSavingAction(null);
    }
  }

  async function addCalendarEvent() {
    const start = new Date(focusedMonth.getFullYear(), focusedMonth.getMonth(), 15).toISOString().slice(0, 10);
    const end = new Date(focusedMonth.getFullYear(), focusedMonth.getMonth(), 16).toISOString().slice(0, 10);
    const academicTermId = visibleSeries.find((row) => row.academic_term_id)?.academic_term_id;
    if (!academicTermId) {
      setNotice("Create or load an academic term before adding an exam calendar event.");
      return;
    }
    setSavingAction("calendar-add-event");
    try {
      await requestDashboardApi("/api/exams/draft", {
        method: "POST",
        body: {
          name: `Draft exam calendar event - ${currentMonthLabel}`,
          academic_term_id: academicTermId,
          starts_on: start,
          ends_on: end,
        },
      });
      await refetch();
      setNotice("Draft exam calendar event saved. Open Exam Setup to rename it and attach assessments before publishing.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the calendar event.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Setup"
          title="Exam Calendar"
          description="Manage institutional exam dates, entry deadlines, and result publishing timelines."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void syncAcademicCalendar()}>
            {savingAction === "calendar-sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Academic Calendar
          </Button>
          <Button variant="outline" onClick={printCalendar}><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button variant="outline" onClick={exportCalendar}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button disabled={!!savingAction} onClick={() => void addCalendarEvent()}>
            {savingAction === "calendar-add-event" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Event
          </Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-4 border-b flex flex-col gap-3 bg-muted/20 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["Month", "Week", "Class", "Teacher"] as const).map((mode) => (
              <Button key={mode} variant={viewMode === mode ? "secondary" : "ghost"} size="sm" onClick={() => { setViewMode(mode); setNotice(`${mode} calendar view selected.`); }}>{mode}</Button>
            ))}
          </div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> {currentMonthLabel}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFocusedMonth(new Date())}>Today</Button>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => moveMonth(-1)}>&lt;</Button>
              <Button variant="outline" size="sm" onClick={() => moveMonth(1)}>&gt;</Button>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-5 border-b border-l relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p>Loading calendar...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-10 text-destructive">
              <p>Error loading calendar: {error.message}</p>
            </div>
          )}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="border-r border-b p-2 text-center text-sm font-medium text-muted-foreground bg-muted/10">
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 1;
            const isCurrentMonth = day > 0 && day <= 30;
            const dayEvents = visibleSeries.filter((event) => {
              const startDay = event.starts_on ? new Date(event.starts_on).getDate() : -1;
              const endDay = event.ends_on ? new Date(event.ends_on).getDate() : -1;
              return isCurrentMonth && (day === startDay || day === endDay);
            });

            return (
              <div key={i} className={`border-r border-b p-2 min-h-[100px] ${!isCurrentMonth ? "bg-muted/5" : ""}`}>
                <span className={`text-sm ${day === new Date().getDate() && focusedMonth.getMonth() === new Date().getMonth() ? "bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center" : "text-muted-foreground"}`}>
                  {isCurrentMonth ? day : ""}
                </span>

                {dayEvents.map((evt) => {
                  const isStart = evt.starts_on ? new Date(evt.starts_on).getDate() === day : false;
                  return (
                    <div key={`${evt.id ?? evt.name}-${day}`} className={`mt-1 p-1 text-xs rounded truncate border ${isStart ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                      {evt.name} {isStart ? "(Start)" : "(End)"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
