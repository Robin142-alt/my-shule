"use client";

import { TeacherMarksProgress, type TeacherMarkSheet } from "./teacher-marks-progress";
import { useState } from "react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { ExamsMarksWorkspace } from "../teacher-dashboard/exams-marks-workspace";
import { markbookPaperLabel } from "@/lib/modules/markbook-labels";

type Assignment = {
  exam_id: string; exam_name: string; class_section_id: string; class_name: string;
  subject_id: string; subject_name: string; teacher_user_id: string | null; teacher_name: string;
  assessment_id: string; paper_name: string; window_id: string;
  stream_id?: string | null; stream_name?: string | null; streamIds?: Array<string | null>;
};
const control = "min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 disabled:opacity-50";

function AssistedMarksEntry({ onOpenSetup, onOpen }: { onOpenSetup: () => void; onOpen: (assignment: Assignment) => void }) {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<{ assignments: Assignment[] }>("/exams/assisted-marks-entry/assignments");
  const [exam, setExam] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [paper, setPaper] = useState("");
  const assignments = data?.assignments ?? [];
  const classes = assignments.filter(row => row.exam_id === exam);
  const subjects = classes.filter(row => row.class_section_id === classId);
  const papers = subjects.filter(row => row.subject_id === subject);
  const paperChoices = [...new Map(papers.map(row => [row.assessment_id,row])).values()];
  const selectedPaper = paper || (paperChoices.length === 1 ? paperChoices[0].assessment_id : "");
  const teachers = papers.filter(row => row.assessment_id === selectedPaper);
  const matching = teachers.filter(row => !teacher || (teacher === "unassigned" ? !row.teacher_user_id : row.teacher_user_id === teacher));
  const selected = matching[0];
  const options = (rows: Assignment[], key: "exam_id" | "class_section_id" | "subject_id" | "teacher_user_id",
    label: "exam_name" | "class_name" | "subject_name" | "teacher_name") =>
    Array.from(new Map(rows.map(row => [row[key] ?? "", row[label] ?? ""]))).map(([id, name]) => <option key={id} value={id}>{name}</option>);

  return <section aria-label="Enter Marks" className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div><h2 className="text-lg font-semibold text-slate-900">Enter Marks</h2><p className="mt-1 text-sm text-slate-600">Select a markbook to enter or edit scores. Each change records you as the editor and keeps the assigned teacher linked.</p></div>
    {isLoading ? <p role="status">Loading school markbooks…</p> : error ? <div role="alert" className="space-y-2 text-sm text-danger"><p>Could not load markbooks. {error.message}</p><button className={control} disabled={isFetching} onClick={() => void refetch()}>Retry markbooks</button></div>
      : !data ? <p role="status" className="text-sm text-slate-600">Waiting for your school session.</p>
      : !assignments.length ? <div className="space-y-3 text-sm text-slate-600"><p>No exam markbooks yet. Configure the exam classes, subjects and papers in Exam Setup.</p><button className={control} onClick={onOpenSetup}>Open exam setup</button></div>
      : <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (selected) onOpen({ ...selected,
        teacher_user_id: teacher && teacher !== "unassigned" ? teacher : null,
        teacher_name: teacher && teacher !== "unassigned" ? selected.teacher_name : "",
        ...(teacher === "unassigned" ? {streamIds: [...new Set(matching.map(row => row.stream_id ?? null))]} : {}),
      }); }}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Exam<select aria-label="Exam" required className={control} value={exam} onChange={event => { setExam(event.target.value); setClassId(""); setSubject(""); setTeacher(""); setPaper(""); }}><option value="">Select exam</option>{options(assignments, "exam_id", "exam_name")}</select></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Class / grade<select aria-label="Class / grade" required className={control} value={classId} disabled={!exam} onChange={event => { setClassId(event.target.value); setSubject(""); setTeacher(""); setPaper(""); }}><option value="">Select class / grade</option>{options(classes, "class_section_id", "class_name")}</select></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Subject<select aria-label="Subject" required className={control} value={subject} disabled={!classId} onChange={event => { setSubject(event.target.value); setTeacher(""); setPaper(""); }}><option value="">Select subject</option>{options(subjects, "subject_id", "subject_name")}</select></label>
          {paperChoices.length > 1 && <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Paper<select aria-label="Paper" required className={control} value={paper} onChange={event => { setPaper(event.target.value); setTeacher(""); }}><option value="">Select paper</option>{paperChoices.map(row => <option key={row.assessment_id} value={row.assessment_id}>{markbookPaperLabel(row.subject_name,row.paper_name,paperChoices.length) || row.subject_name}</option>)}</select></label>}
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Assigned teacher (optional)<select aria-label="Assigned teacher" className={control} value={teacher} disabled={!selectedPaper} onChange={event => setTeacher(event.target.value)}><option value="">All eligible students</option>{teachers.some(row => !row.teacher_user_id) && <option value="unassigned">Unassigned</option>}{options(teachers.filter(row => row.teacher_user_id), "teacher_user_id", "teacher_name")}</select></label>
        </div>
        <button type="submit" disabled={!selected || isFetching} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Open markbook</button>
      </form>}
  </section>;
}

export function MarksEntryWorkspace({ onOpenSetup }: { onOpenSetup: () => void }) {
  const tenantId = useOptionalSchoolTenantId();
  return <SchoolMarksEntryWorkspace key={tenantId ?? "unverified-tenant"} onOpenSetup={onOpenSetup} />;
}

function SchoolMarksEntryWorkspace({ onOpenSetup }: { onOpenSetup: () => void }) {
  const [opened, setOpened] = useState<Assignment | null>(null);
  function openSheet(sheet: TeacherMarkSheet) {
    if (!sheet.class_section_id || !sheet.subject_id || !sheet.assessment_id) return;
    setOpened({exam_id:sheet.exam_id,exam_name:sheet.exam_name,class_section_id:sheet.class_section_id,
      class_name:sheet.class_name,subject_id:sheet.subject_id,subject_name:sheet.subject,
      assessment_id:sheet.assessment_id,paper_name:sheet.paper,window_id:sheet.window_id,
      teacher_user_id:sheet.teacher_id,teacher_name:sheet.teacher_id ? sheet.teacher : "",
      streamIds:[sheet.stream_id ?? null]});
  }
  if (opened) return <ExamsMarksWorkspace assistance={{ teacherUserId: opened.teacher_user_id,
    teacherName: opened.teacher_name, examSeriesId: opened.exam_id, classSectionId: opened.class_section_id,
    subjectId: opened.subject_id, assessmentId: opened.assessment_id, windowId: opened.window_id,
    streamIds:opened.streamIds, onClose: () => setOpened(null) }} />;
  return <div className="min-w-0 space-y-4"><AssistedMarksEntry onOpenSetup={onOpenSetup} onOpen={setOpened} /><TeacherMarksProgress showWindowControls onOpenSetup={onOpenSetup} onOpenMarkbook={openSheet} /></div>;
}
