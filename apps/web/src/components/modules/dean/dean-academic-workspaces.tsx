"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, GraduationCap, Clock } from "lucide-react";
import type { DeanDataset } from "@/lib/modules/dean-data";

export function AcademicCalendarWorkspace({ dataset }: { dataset: DeanDataset }) {
  const calendarRows = dataset.activities;

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
        <Button variant="primary">Add Academic Activity</Button>
        <Button variant="secondary">Import Term Plan</Button>
      </div>

      <DataTable 
        title="Term Academic Plan" 
        subtitle="Weekly academic focus and syllabus targets." 
        columns={columns} 
        rows={calendarRows} 
        getRowKey={(row) => row.id} 
      />
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
  const coverageRows = dataset.syllabusCoverage;
  const classesBehind = coverageRows.filter(c => c.riskLevel !== "on-track").length;
  const criticalGaps = coverageRows.filter(c => c.riskLevel === "critical").length;

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
        <Button variant="primary">Request Teacher Update</Button>
        <Button variant="secondary">Create Remedial Plan</Button>
      </div>

      <DataTable 
        title="Detailed Coverage Status" 
        subtitle="Tracking topic progression against expected timeline." 
        columns={columns} 
        rows={coverageRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function TimetableOversightWorkspace({ dataset }: { dataset: DeanDataset }) {
  const timetableRows = dataset.timetableHealth;
  const teacherConflicts = timetableRows.filter(t => t.conflicts > 0).length;
  const missedLessons = timetableRows.reduce((acc, val) => acc + val.missingLessons, 0);

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
        <Button variant="primary">Request Timetable Change</Button>
        <Button variant="secondary">Export Timetable Health</Button>
      </div>

      <DataTable 
        title="Timetable Issues" 
        subtitle="Classes with missing lessons or teacher conflicts." 
        columns={columns} 
        rows={timetableRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
