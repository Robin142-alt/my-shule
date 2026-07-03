"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Calendar, BookOpen, Clock } from "lucide-react";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import type { AcademicActivity, DeanDataset, SyllabusCoverage, TimetableHealth } from "@/lib/modules/dean-data";

async function recordDeanWorkflow(action: string, payload: Record<string, unknown>) {
  return requestDashboardApi("/api/admin-command/dean-academics/action", {
    method: "POST",
    body: { action, ...payload },
  });
}

export function AcademicCalendarWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [calendarRows, setCalendarRows] = useState(dataset.activities);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activityForm, setActivityForm] = useState({
    week: "",
    dateRange: "",
    focus: "",
    syllabusPercent: "",
    keyActivities: "",
    assessmentActivity: "",
    responsibleOffice: "",
  });
  const [importText, setImportText] = useState("");

  async function addActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activity: AcademicActivity = {
      id: `ACT-${Date.now()}`,
      ...activityForm,
      status: "pending",
    };
    setIsSaving(true);
    try {
      await recordDeanWorkflow("academic_activity_added", {
        title: "Academic activity added",
        message: `${activity.week}: ${activity.focus}`,
        activity,
      });
      setCalendarRows((current) => [activity, ...current]);
      setNotice(`Academic activity recorded for ${activity.week}.`);
      setActivityForm({
        week: "",
        dateRange: "",
        focus: "",
        syllabusPercent: "",
        keyActivities: "",
        assessmentActivity: "",
        responsibleOffice: "",
      });
      setIsActivityOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the academic activity.");
    } finally {
      setIsSaving(false);
    }
  }

  async function importTermPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const imported = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index): AcademicActivity => {
        const [week, dateRange, focus, syllabusPercent, keyActivities, assessmentActivity, responsibleOffice] = line.split(",").map((part) => part?.trim() ?? "");
        return {
          id: `IMP-${Date.now()}-${index}`,
          week: week || `Imported Week ${index + 1}`,
          dateRange: dateRange || "Dates pending",
          focus: focus || "Imported academic focus",
          syllabusPercent: syllabusPercent || "0%",
          keyActivities: keyActivities || "Imported activity",
          assessmentActivity: assessmentActivity || "Assessment pending",
          responsibleOffice: responsibleOffice || "Dean of Academics",
          status: "pending",
        };
      });

    if (imported.length === 0) {
      setNotice("Paste at least one CSV line before importing the term plan.");
      return;
    }

    setIsSaving(true);
    try {
      await recordDeanWorkflow("term_plan_imported", {
        title: "Term plan imported",
        message: `${imported.length} academic plan rows imported by the dean.`,
        rows: imported,
      });
      setCalendarRows((current) => [...imported, ...current]);
      setNotice(`Imported and recorded ${imported.length} academic plan row${imported.length === 1 ? "" : "s"}.`);
      setImportText("");
      setIsImportOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import the term plan.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof calendarRows[0]>[] = [
    { id: "week", header: "Week", render: (row) => row.week },
    { id: "dates", header: "Date Range", render: (row) => row.dateRange },
    { id: "focus", header: "Academic Focus", render: (row) => row.focus },
    { id: "syllabus", header: "Expected Syllabus %", render: (row) => <span className="font-semibold">{row.syllabusPercent}</span> },
    { id: "activities", header: "Key Activities", render: (row) => row.keyActivities },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "completed" ? "ok" : row.status === "in-progress" ? "warning" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Academic Calendar" 
        title="Term Execution Plan" 
        description="Track the academic rhythm of the term and manage key events." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Current Week</p>
            <p className="mt-1 font-semibold">Week 3</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Remaining Weeks</p>
            <p className="mt-1 font-semibold">10 Weeks</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Assessment Windows</p>
            <p className="mt-1 font-semibold">2 Upcoming</p>
          </div>
        </Card>
      </section>
      
      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setIsActivityOpen(true)}>Add Academic Activity</Button>
        <Button variant="secondary" onClick={() => setIsImportOpen(true)}>Import Term Plan</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Term Academic Plan" 
        subtitle="Weekly academic focus and syllabus targets." 
        columns={columns} 
        rows={calendarRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isActivityOpen} title="Add Academic Activity" onClose={() => setIsActivityOpen(false)}>
        <form className="space-y-4" onSubmit={addActivity}>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="input-base" required placeholder="Week, e.g. Week 7" value={activityForm.week} onChange={(event) => setActivityForm({ ...activityForm, week: event.target.value })} />
            <input className="input-base" required placeholder="Date range" value={activityForm.dateRange} onChange={(event) => setActivityForm({ ...activityForm, dateRange: event.target.value })} />
            <input className="input-base" required placeholder="Academic focus" value={activityForm.focus} onChange={(event) => setActivityForm({ ...activityForm, focus: event.target.value })} />
            <input className="input-base" required placeholder="Expected syllabus %" value={activityForm.syllabusPercent} onChange={(event) => setActivityForm({ ...activityForm, syllabusPercent: event.target.value })} />
            <input className="input-base" required placeholder="Key activities" value={activityForm.keyActivities} onChange={(event) => setActivityForm({ ...activityForm, keyActivities: event.target.value })} />
            <input className="input-base" required placeholder="Assessment activity" value={activityForm.assessmentActivity} onChange={(event) => setActivityForm({ ...activityForm, assessmentActivity: event.target.value })} />
          </div>
          <input className="input-base w-full" required placeholder="Responsible office" value={activityForm.responsibleOffice} onChange={(event) => setActivityForm({ ...activityForm, responsibleOffice: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsActivityOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Activity"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isImportOpen} title="Import Term Plan" onClose={() => setIsImportOpen(false)}>
        <form className="space-y-4" onSubmit={importTermPlan}>
          <p className="text-sm text-muted-foreground">Paste one CSV row per activity: week, date range, focus, syllabus %, key activities, assessment, responsible office.</p>
          <textarea className="input-base min-h-32 w-full" required value={importText} onChange={(event) => setImportText(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsImportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Importing..." : "Import Rows"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function SubjectsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const subjectRows = dataset.subjects;
  const missingSchemesCount = subjectRows.filter(s => s.status === "needs-teacher").length;

  const columns: DataTableColumn<typeof subjectRows[0]>[] = [
    { id: "subject", header: "Subject", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "curriculum", header: "Type", render: (row) => <StatusPill label={row.curriculumType} tone={row.curriculumType === "CBC" ? "warning" : "ok"} /> },
    { id: "department", header: "Department", render: (row) => row.department },
    { id: "assigned", header: "Teachers", render: (row) => row.assignedTeachers },
    { id: "hod", header: "HOD", render: (row) => row.hod },
    { id: "coverage", header: "Coverage", render: (row) => row.coverage },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "active" ? "ok" : "critical"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Subjects & Curriculum" 
        title="Curriculum Management" 
        description="Monitor subjects, curriculum modes (CBC/8-4-4), and departmental assignments." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="eyebrow">Active Subjects</p>
          <p className="mt-2 text-2xl font-semibold">{subjectRows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">CBC Learning Areas</p>
          <p className="mt-2 text-2xl font-semibold">{subjectRows.filter(s => s.curriculumType === 'CBC').length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Missing Schemes</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{missingSchemesCount}</p>
        </Card>
      </section>

      <DataTable 
        title="Subject Control List" 
        subtitle="All subjects currently offered and their academic health." 
        columns={columns} 
        rows={subjectRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function SyllabusCoverageWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [coverageRows] = useState(dataset.syllabusCoverage);
  const [selectedCoverage, setSelectedCoverage] = useState<SyllabusCoverage | null>(null);
  const [isRemedialOpen, setIsRemedialOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const classesBehind = coverageRows.filter(c => c.riskLevel !== "on-track").length;
  const criticalGaps = coverageRows.filter(c => c.riskLevel === "critical").length;
  const highestRisk = coverageRows.find((row) => row.riskLevel !== "on-track") ?? coverageRows[0] ?? null;

  const columns: DataTableColumn<typeof coverageRows[0]>[] = [
    { id: "class", header: "Class", render: (row) => <span className="font-semibold">{row.className}</span> },
    { id: "subject", header: "Subject", render: (row) => row.subject },
    { id: "teacher", header: "Teacher", render: (row) => row.teacher },
    { id: "expected", header: "Expected", render: (row) => row.expectedCoverage },
    { id: "actual", header: "Actual", render: (row) => <span className={row.gap.includes("+") || row.riskLevel === "on-track" ? "text-success" : "text-danger"}>{row.actualCoverage}</span> },
    { id: "gap", header: "Gap", render: (row) => row.gap },
    { id: "status", header: "Risk Level", render: (row) => <StatusPill label={row.riskLevel} tone={row.riskLevel === "critical" ? "critical" : row.riskLevel === "slightly-behind" ? "warning" : "ok"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Syllabus Coverage" 
        title="Coverage Tracker" 
        description="Identify which classes and subjects are behind the term schedule." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="eyebrow">Average Coverage</p>
          <p className="mt-2 text-2xl font-semibold">{coverageRows.length > 0 ? "41%" : "N/A"}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Classes Behind</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{classesBehind}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Critical Gaps (&gt;15%)</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{criticalGaps}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setSelectedCoverage(highestRisk)}>Request Teacher Update</Button>
        <Button variant="secondary" onClick={() => setIsRemedialOpen(true)}>Create Remedial Plan</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Detailed Coverage Status" 
        subtitle="Tracking topic progression against expected timeline." 
        columns={columns} 
        rows={coverageRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={!!selectedCoverage} title="Request Teacher Coverage Update" onClose={() => setSelectedCoverage(null)}>
        {selectedCoverage ? (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setIsSaving(true);
            try {
              await recordDeanWorkflow("coverage_update_requested", {
                title: "Coverage update requested",
                message: String(form.get("message") ?? ""),
                coverageId: selectedCoverage.id,
                teacher: selectedCoverage.teacher,
                className: selectedCoverage.className,
                subject: selectedCoverage.subject,
                gap: selectedCoverage.gap,
              });
              setNotice(`Coverage update request recorded for ${selectedCoverage.teacher} in ${selectedCoverage.className} ${selectedCoverage.subject}.`);
              setSelectedCoverage(null);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Could not request the coverage update.");
            } finally {
              setIsSaving(false);
            }
          }}>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{selectedCoverage.className} - {selectedCoverage.subject}</div>
              <div className="mt-1 text-muted-foreground">Current gap: {selectedCoverage.gap}. Last topic: {selectedCoverage.lastTopic}</div>
            </div>
            <textarea name="message" className="input-base min-h-24 w-full" required defaultValue={`Please update syllabus coverage and catch-up notes for ${selectedCoverage.className} ${selectedCoverage.subject}.`} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedCoverage(null)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Request"}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
      <Modal open={isRemedialOpen} title="Create Remedial Plan" onClose={() => setIsRemedialOpen(false)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setIsSaving(true);
          try {
            await recordDeanWorkflow("remedial_plan_created", {
              title: String(form.get("title") ?? "Remedial plan"),
              message: String(form.get("details") ?? ""),
              targetCoverageId: highestRisk?.id ?? null,
            });
            setNotice("Remedial plan recorded for classes behind syllabus coverage.");
            setIsRemedialOpen(false);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not save the remedial plan.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <input name="title" className="input-base w-full" required defaultValue={highestRisk ? `${highestRisk.className} ${highestRisk.subject} catch-up` : "Remedial plan"} />
          <textarea name="details" className="input-base min-h-24 w-full" required defaultValue={highestRisk ? `Target ${highestRisk.gap} coverage gap with extra lessons and HOD review.` : "Document target classes, teachers, dates, and review evidence."} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsRemedialOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Plan"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function TimetableOversightWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [timetableRows] = useState(dataset.timetableHealth);
  const [selectedIssue, setSelectedIssue] = useState<TimetableHealth | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const teacherConflicts = timetableRows.filter(t => t.conflicts > 0).length;
  const missedLessons = timetableRows.reduce((acc, val) => acc + val.missingLessons, 0);

  function exportTimetableHealth() {
    downloadCsvFile({
      filename: `dean-timetable-health-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Class", "Subject", "Teacher", "Required lessons", "Scheduled lessons", "Missing lessons", "Conflicts", "Status"],
      rows: timetableRows.map((row) => [
        row.className,
        row.subject,
        row.teacher,
        String(row.requiredLessons),
        String(row.scheduledLessons),
        String(row.missingLessons),
        String(row.conflicts),
        row.status,
      ]),
    });
    setNotice(`Exported ${timetableRows.length} timetable health row${timetableRows.length === 1 ? "" : "s"}.`);
  }

  const columns: DataTableColumn<typeof timetableRows[0]>[] = [
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "subject", header: "Subject", render: (row) => row.subject },
    { id: "teacher", header: "Teacher", render: (row) => row.teacher },
    { id: "scheduled", header: "Lessons (Sched / Req)", render: (row) => <span className={row.missingLessons > 0 ? "text-danger font-semibold" : ""}>{row.scheduledLessons} / {row.requiredLessons}</span> },
    { id: "conflicts", header: "Conflicts", render: (row) => row.conflicts > 0 ? `${row.conflicts} Conflict(s)` : "None" },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "healthy" ? "ok" : "critical"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Timetable Oversight" 
        title="Timetable Health" 
        description="Monitor missed lessons, teacher conflicts, and scheduling imbalances." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="eyebrow">Timetable Coverage</p>
          <p className="mt-2 text-2xl font-semibold">96%</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Teacher Conflicts</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{teacherConflicts}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Missed Lessons (Week)</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{missedLessons}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setSelectedIssue(timetableRows.find((row) => row.conflicts > 0 || row.missingLessons > 0) ?? timetableRows[0] ?? null)}>Request Timetable Change</Button>
        <Button variant="secondary" onClick={exportTimetableHealth}>Export Timetable Health</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Timetable Issues" 
        subtitle="Classes with missing lessons or teacher conflicts." 
        columns={columns} 
        rows={timetableRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={!!selectedIssue} title="Request Timetable Change" onClose={() => setSelectedIssue(null)}>
        {selectedIssue ? (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setIsSaving(true);
            try {
              await recordDeanWorkflow("timetable_change_requested", {
                title: "Timetable change requested",
                message: String(form.get("message") ?? ""),
                issueId: selectedIssue.id,
                className: selectedIssue.className,
                subject: selectedIssue.subject,
                teacher: selectedIssue.teacher,
                missingLessons: selectedIssue.missingLessons,
                conflicts: selectedIssue.conflicts,
              });
              setNotice(`Timetable change request recorded for ${selectedIssue.className} ${selectedIssue.subject}.`);
              setSelectedIssue(null);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Could not submit the timetable change request.");
            } finally {
              setIsSaving(false);
            }
          }}>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{selectedIssue.className} - {selectedIssue.subject}</div>
              <div className="mt-1 text-muted-foreground">{selectedIssue.teacher}; missing lessons: {selectedIssue.missingLessons}; conflicts: {selectedIssue.conflicts}</div>
            </div>
            <textarea name="message" className="input-base min-h-24 w-full" required defaultValue={`Please review timetable allocation for ${selectedIssue.className} ${selectedIssue.subject}.`} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedIssue(null)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Submitting..." : "Submit Request"}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
