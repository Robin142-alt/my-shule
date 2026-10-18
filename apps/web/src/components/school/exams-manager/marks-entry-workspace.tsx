"use client";

import { TeacherMarksProgress } from "./teacher-marks-progress";
import { useState } from "react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { ExamsMarksWorkspace } from "../teacher-dashboard/exams-marks-workspace";

type Assignment = {
  exam_id: string; exam_name: string; class_section_id: string; class_name: string;
  subject_id: string; subject_name: string; teacher_user_id: string; teacher_name: string;
};
const control = "min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 disabled:opacity-50";

function AssistedMarksEntry({ onOpenSetup, onOpen }: { onOpenSetup: () => void; onOpen: (assignment: Assignment) => void }) {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<{ assignments: Assignment[] }>("/exams/assisted-marks-entry/assignments");
  const [exam, setExam] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const assignments = data?.assignments ?? [];
  const classes = assignments.filter(row => row.exam_id === exam);
  const subjects = classes.filter(row => row.class_section_id === classId);
  const teachers = subjects.filter(row => row.subject_id === subject);
  const selected = teachers.find(row => row.teacher_user_id === teacher);
  const options = (rows: Assignment[], key: keyof Assignment, label: keyof Assignment) =>
    Array.from(new Map(rows.map(row => [row[key], row[label]]))).map(([id, name]) => <option key={id} value={id}>{name}</option>);

  return <section aria-label="Enter marks on behalf of a teacher" className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div><h2 className="text-lg font-semibold text-slate-900">Enter marks for a teacher</h2><p className="mt-1 text-sm text-slate-600">Select a markbook to enter or edit scores. Each change records you as the editor and keeps the assigned teacher linked.</p></div>
    {isLoading ? <p role="status">Loading school markbooks…</p> : error ? <div role="alert" className="space-y-2 text-sm text-danger"><p>Could not load teacher assignments. {error.message}</p><button className={control} disabled={isFetching} onClick={() => void refetch()}>Retry assignments</button></div>
      : !data ? <p role="status" className="text-sm text-slate-600">Waiting for your school session.</p>
      : !assignments.length ? <div className="space-y-3 text-sm text-slate-600"><p>No assigned exam markbooks yet. Configure the exam classes and subjects, and assign subject teachers in Academic Setup.</p><button className={control} onClick={onOpenSetup}>Open exam setup</button></div>
      : <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (selected) onOpen(selected); }}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Exam<select aria-label="Exam" required className={control} value={exam} onChange={event => { setExam(event.target.value); setClassId(""); setSubject(""); setTeacher(""); }}><option value="">Select exam</option>{options(assignments, "exam_id", "exam_name")}</select></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Class / grade<select aria-label="Class / grade" required className={control} value={classId} disabled={!exam} onChange={event => { setClassId(event.target.value); setSubject(""); setTeacher(""); }}><option value="">Select class / grade</option>{options(classes, "class_section_id", "class_name")}</select></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Subject<select aria-label="Subject" required className={control} value={subject} disabled={!classId} onChange={event => { setSubject(event.target.value); setTeacher(""); }}><option value="">Select subject</option>{options(subjects, "subject_id", "subject_name")}</select></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Assigned teacher<select aria-label="Assigned teacher" required className={control} value={teacher} disabled={!subject} onChange={event => setTeacher(event.target.value)}><option value="">Select teacher</option>{options(teachers, "teacher_user_id", "teacher_name")}</select></label>
        </div>
        <button type="submit" disabled={!selected || isFetching} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Open markbooks</button>
      </form>}
  </section>;
}

export function MarksEntryWorkspace({ onOpenSetup }: { onOpenSetup: () => void }) {
  const tenantId = useOptionalSchoolTenantId();
  return <SchoolMarksEntryWorkspace key={tenantId ?? "unverified-tenant"} onOpenSetup={onOpenSetup} />;
}

function SchoolMarksEntryWorkspace({ onOpenSetup }: { onOpenSetup: () => void }) {
  const [opened, setOpened] = useState<Assignment | null>(null);
  if (opened) return <ExamsMarksWorkspace assistance={{ teacherUserId: opened.teacher_user_id,
    teacherName: opened.teacher_name, examSeriesId: opened.exam_id, classSectionId: opened.class_section_id,
    subjectId: opened.subject_id, onClose: () => setOpened(null) }} />;
  return <div className="min-w-0 space-y-4"><AssistedMarksEntry onOpenSetup={onOpenSetup} onOpen={setOpened} /><TeacherMarksProgress showWindowControls onOpenSetup={onOpenSetup} /></div>;
}
