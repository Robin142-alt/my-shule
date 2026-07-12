import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Panel, StatusPill, cn } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  fetchClassRegisterLive,
  fetchPendingMarksLive,
  saveExamMarksLive,
  type ClassRegisterStudent,
  type PendingMarksWindow,
} from "@/lib/modules/teacher-live";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

type ScoresByStudent = Record<string, string>;

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getCompletion(windowTask: PendingMarksWindow, scores: ScoresByStudent) {
  const localEntered = Object.values(scores).filter((score) => score.trim() !== "").length;
  const entered = Math.max(windowTask.enteredCount, localEntered);

  if (!windowTask.totalStudents) {
    return 0;
  }

  return Math.min(100, Math.round((entered / windowTask.totalStudents) * 100));
}

function getAverage(scores: ScoresByStudent, outOf: number) {
  const values = Object.values(scores)
    .map(toNumber)
    .filter((score): score is number => score !== null && score >= 0 && score <= outOf);

  if (values.length === 0) {
    return "-";
  }

  return Math.round(values.reduce((total, score) => total + score, 0) / values.length).toString();
}

function getGrade(scoreValue: string, outOf: number) {
  const score = toNumber(scoreValue);

  if (score === null || outOf <= 0) {
    return "-";
  }

  const percent = (score / outOf) * 100;

  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  return "E";
}

function getValidationMessage(scoreValue: string, outOf: number) {
  if (scoreValue.trim() === "") return "Missing";
  const score = toNumber(scoreValue);
  if (score === null) return "Invalid";
  if (score < 0) return "Below 0";
  if (score > outOf) return `Above ${outOf}`;
  return "Ready";
}

function serializeScores(scores: ScoresByStudent) {
  return Object.fromEntries(
    Object.entries(scores).filter(([, value]) => value.trim() !== ""),
  );
}

function buildTemplateRows(students: ClassRegisterStudent[], scores: ScoresByStudent, windowTask: PendingMarksWindow | null) {
  if (!windowTask) {
    return [["", "", "", "", "", "", "", ""]];
  }

  if (students.length === 0) {
    return [[windowTask.examName, windowTask.className, windowTask.subjectName, windowTask.paperName, "", "", String(windowTask.outOf), ""]];
  }

  return students.map((student) => [
    windowTask.examName,
    windowTask.className,
    windowTask.subjectName,
    windowTask.paperName,
    student.admissionNo,
    student.name,
    String(windowTask.outOf),
    scores[student.id] ?? "",
  ]);
}

function WindowCard({
  windowTask,
  isActive,
  onOpen,
}: {
  windowTask: PendingMarksWindow;
  isActive: boolean;
  onOpen: () => void;
}) {
  const completion = getCompletion(windowTask, {});
  const statusType = windowTask.status === "Completed" ? "success" : completion > 0 ? "warning" : "info";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition",
        isActive ? "border-[#1D4ED8] ring-2 ring-blue-100" : "border-[#D8E0EC]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">{windowTask.className}</p>
          <h3 className="mt-1 text-base font-black text-[#071D49]">{windowTask.examName}</h3>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">{windowTask.subjectName} | {windowTask.paperName}</p>
        </div>
        <StatusPill status={windowTask.status} type={statusType} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#F8FAFC] p-2">
          <p className="text-lg font-black text-[#071D49]">{completion}%</p>
          <p className="text-[11px] font-bold text-[#64748B]">entered</p>
        </div>
        <div className="rounded-xl bg-[#F8FAFC] p-2">
          <p className="text-lg font-black text-[#071D49]">{windowTask.outOf}</p>
          <p className="text-[11px] font-bold text-[#64748B]">out of</p>
        </div>
        <div className="rounded-xl bg-[#F8FAFC] p-2">
          <p className="text-lg font-black text-[#071D49]">{windowTask.totalStudents}</p>
          <p className="text-[11px] font-bold text-[#64748B]">learners</p>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Open markbook for ${windowTask.examName}`}
        onClick={onOpen}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123A7A]"
      >
        <BookOpenCheck className="h-4 w-4" />
        Open markbook
      </button>
    </article>
  );
}

export function ExamsMarksWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, ScoresByStudent>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const pendingMarksQuery = useQuery({
    queryKey: ["pending-marks", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchPendingMarksLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const windows = pendingMarksQuery.data?.windows ?? [];
  const activeWindow = useMemo(() => {
    if (!activeWindowId) return windows[0] ?? null;
    return windows.find((windowTask) => windowTask.id === activeWindowId) ?? null;
  }, [activeWindowId, windows]);
  const activeScores = activeWindow ? draftScores[activeWindow.id] ?? {} : {};

  const classRegisterQuery = useQuery({
    queryKey: [
      "class-register",
      liveSession.session?.tenantId,
      activeWindow?.classSectionId,
      activeWindow?.id,
    ],
    queryFn: () => fetchClassRegisterLive(liveSession.session!, activeWindow!.classSectionId),
    enabled: !!liveSession.session && !!activeWindow,
  });

  const students = classRegisterQuery.data ?? [];
  const totalWindows = pendingMarksQuery.data?.stats.totalWindows ?? 0;
  const nearingDeadline = pendingMarksQuery.data?.stats.nearingDeadline ?? 0;
  const activeCompletion = activeWindow ? getCompletion(activeWindow, activeScores) : 0;
  const activeAverage = activeWindow ? getAverage(activeScores, activeWindow.outOf) : "-";
  const missingCount = activeWindow
    ? Math.max(0, students.filter((student) => !activeScores[student.id]?.trim()).length)
    : 0;
  const invalidCount = activeWindow
    ? students.filter((student) => {
        const message = getValidationMessage(activeScores[student.id] ?? "", activeWindow.outOf);
        return message !== "Ready" && message !== "Missing";
      }).length
    : 0;
  const canSubmit = Boolean(activeWindow && students.length > 0 && missingCount === 0 && invalidCount === 0);

  function openWindow(windowTask: PendingMarksWindow) {
    setActiveWindowId(windowTask.id);
    setActionError("");
  }

  function updateScore(studentId: string, value: string) {
    if (!activeWindow) return;
    setActionError("");
    setDraftScores((current) => ({
      ...current,
      [activeWindow.id]: {
        ...(current[activeWindow.id] ?? {}),
        [studentId]: value,
      },
    }));
  }

  async function persistScores(action: "draft" | "submit") {
    if (!liveSession.session || !activeWindow) {
      setActionError("Live teacher session is required before marks can be saved.");
      return;
    }

    const scores = serializeScores(activeScores);

    if (Object.keys(scores).length === 0) {
      setActionError("Enter at least one learner score before saving marks.");
      return;
    }

    if (action === "submit" && !canSubmit) {
      setActionError("Complete every learner score and fix validation errors before submitting for moderation.");
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      await saveExamMarksLive(liveSession.session, {
        action,
        examId: activeWindow.id,
        classSectionId: activeWindow.classSectionId,
        scores,
      });
      await queryClient.invalidateQueries({ queryKey: ["pending-marks"] });
      toast.success(action === "submit" ? "Marks submitted for moderation." : "Marks draft saved.");
      onStartAction(
        "marks",
        "exams-marks",
        action === "submit"
          ? "Marks submitted to moderation with learner-level validation."
          : "Marks draft saved and remains editable.",
      );
    } catch (error: any) {
      const message = error?.message || "Could not save marks. Please retry.";
      setActionError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function downloadTemplate() {
    downloadCsvFile({
      filename: `teacher-markbook-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["exam", "class", "subject", "paper", "admission_number", "student_name", "out_of", "score"],
      rows: buildTemplateRows(students, activeScores, activeWindow),
    });
    toast.success("Teacher markbook CSV downloaded.");
  }

  function printValidationSheet() {
    if (!activeWindow) {
      setActionError("Open a markbook before printing a validation sheet.");
      return;
    }

    openPrintDocument({
      eyebrow: "Teacher markbook",
      title: `${activeWindow.examName} validation sheet`,
      subtitle: `${activeWindow.className} | ${activeWindow.subjectName} | ${activeWindow.paperName}`,
      rows: students.map((student) => {
        const score = activeScores[student.id] ?? "";
        const validation = getValidationMessage(score, activeWindow.outOf);
        return {
          label: `${student.admissionNo} - ${student.name}`,
          value: score ? `${score}/${activeWindow.outOf} | ${validation}` : validation,
          tone: validation === "Ready" ? "default" : "danger",
        };
      }),
      footer: "This teacher validation sheet is generated from the live school mark-entry register before HOD moderation.",
    });
  }

  return (
    <Panel
      title="Exams & Marks"
      description="Teacher markbook for formal exams, score validation, CSV export, and HOD moderation submission."
      icon={BookOpenCheck}
      headerEnd={
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC]"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">Open markbooks</p>
          <p className="mt-2 text-3xl font-black text-[#071D49]">{pendingMarksQuery.isLoading ? "..." : totalWindows}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Deadline risk</p>
          <p className="mt-2 text-3xl font-black text-amber-800">{pendingMarksQuery.isLoading ? "..." : nearingDeadline}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Moderation readiness</p>
          <p className="mt-2 text-3xl font-black text-blue-900">
            {activeWindow ? `${activeCompletion}% complete` : "Open a class"}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Draft average</p>
          <p className="mt-2 text-3xl font-black text-emerald-800">
            {activeAverage}{activeWindow && activeAverage !== "-" ? `/${activeWindow.outOf}` : ""}
          </p>
        </article>
      </div>

      {pendingMarksQuery.isError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          Failed to load teacher mark-entry windows. Please retry after confirming the exams module is enabled for this school.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#1D4ED8]" />
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#071D49]">Assigned exam windows</h3>
          </div>
          {pendingMarksQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
            </div>
          ) : windows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-5">
              <p className="font-black text-[#071D49]">No open exam markbooks yet.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Ask the Exams Manager or Deputy Principal to open a mark-entry window for your assigned class and subject.
              </p>
            </div>
          ) : (
            windows.map((windowTask) => (
              <WindowCard
                key={windowTask.id}
                windowTask={windowTask}
                isActive={activeWindow?.id === windowTask.id}
                onOpen={() => openWindow(windowTask)}
              />
            ))
          )}
        </section>

        <section className="rounded-2xl border border-[#D8E0EC] bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">Teacher markbook</p>
              <h3 className="mt-1 text-2xl font-black text-[#071D49]">
                {activeWindow ? `${activeWindow.examName} | ${activeWindow.className}` : "Open an exam window"}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">
                {activeWindow
                  ? `${activeWindow.subjectName} ${activeWindow.paperName} scored out of ${activeWindow.outOf}.`
                  : "Select a markbook to enter learner scores, validate missing marks, and submit to moderation."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printValidationSheet}
                disabled={!activeWindow}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                Print sheet
              </button>
              <button
                type="button"
                onClick={() => persistScores("draft")}
                disabled={!activeWindow || isSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </button>
              <button
                type="button"
                onClick={() => persistScores("submit")}
                disabled={!activeWindow || isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123A7A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for moderation
              </button>
            </div>
          </div>

          {activeWindow ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Missing scores</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{classRegisterQuery.isLoading ? "..." : missingCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Validation errors</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{classRegisterQuery.isLoading ? "..." : invalidCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Submit status</p>
                <p className="mt-1 text-sm font-black text-[#071D49]">{canSubmit ? "Ready for HOD" : "Draft review"}</p>
              </div>
            </div>
          ) : null}

          {actionError ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {actionError}
            </div>
          ) : null}

          {!activeWindow ? (
            <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-8 text-center">
              <BookOpenCheck className="h-10 w-10 text-[#1D4ED8]" />
              <p className="mt-3 text-lg font-black text-[#071D49]">Open a markbook to start entering scores.</p>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">
                The teacher workspace will load the school-scoped class register, enforce score range checks, and keep draft marks separate from submitted marks.
              </p>
            </div>
          ) : classRegisterQuery.isLoading ? (
            <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
            </div>
          ) : classRegisterQuery.isError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
              Could not load the class register for this markbook. Confirm the class still belongs to your teaching allocation.
            </div>
          ) : students.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-5">
              <p className="font-black text-[#071D49]">No active learners in this class register.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Admissions or Deputy Principal must assign students to {activeWindow.className} before marks can be entered.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#D8E0EC]">
              <table className="min-w-full divide-y divide-[#E2E8F0] bg-white text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Admission</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {students.map((student) => {
                    const score = activeScores[student.id] ?? "";
                    const validation = getValidationMessage(score, activeWindow.outOf);
                    const valid = validation === "Ready";
                    const missing = validation === "Missing";

                    return (
                      <tr key={student.id} className="align-top">
                        <td className="px-4 py-3 font-black text-[#071D49]">{student.name}</td>
                        <td className="px-4 py-3 font-semibold text-[#64748B]">{student.admissionNo}</td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`${student.name} score`}
                            type="number"
                            min="0"
                            max={activeWindow.outOf}
                            value={score}
                            onChange={(event) => updateScore(student.id, event.target.value)}
                            className={cn(
                              "h-10 w-28 rounded-xl border px-3 text-center text-sm font-black text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100",
                              valid || missing ? "border-[#D8E0EC]" : "border-red-300 bg-red-50",
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 font-black text-[#071D49]">{getGrade(score, activeWindow.outOf)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black",
                              valid && "border-emerald-200 bg-emerald-50 text-emerald-700",
                              missing && "border-amber-200 bg-amber-50 text-amber-700",
                              !valid && !missing && "border-red-200 bg-red-50 text-red-700",
                            )}
                          >
                            {valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {validation}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Panel>
  );
}
