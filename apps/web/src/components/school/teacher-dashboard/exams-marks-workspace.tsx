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
  fetchPendingMarksLive,
  fetchTeacherMarkSheetLive,
  saveExamMarksLive,
  type ExamScoreStatus,
  type PendingMarksWindow,
  type TeacherMarkSheetRow,
} from "@/lib/modules/teacher-live";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

type MarkDraft = {
  score: string;
  scoreStatus: ExamScoreStatus | "";
  remarks: string;
};

type DraftsByStudent = Record<string, MarkDraft>;
type DraftsByWindow = Record<string, DraftsByStudent>;

const SCORE_STATUS_OPTIONS: Array<{ value: ExamScoreStatus; label: string }> = [
  { value: "entered", label: "Score entered" },
  { value: "absent", label: "Absent" },
  { value: "exempt", label: "Exempt" },
  { value: "not_assessed", label: "Not assessed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "withheld", label: "Withheld" },
  { value: "medical_exception", label: "Medical exception" },
  { value: "transfer_student", label: "Transfer student" },
];

const SCORE_STATUS_LABELS = Object.fromEntries(
  SCORE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ExamScoreStatus, string>;

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getWindowCompletion(windowTask: PendingMarksWindow) {
  if (!windowTask.totalStudents) {
    return 0;
  }

  return Math.min(100, Math.round((windowTask.enteredCount / windowTask.totalStudents) * 100));
}

function getAverage(drafts: DraftsByStudent, outOf: number) {
  const values = Object.values(drafts)
    .filter((draft) => draft.scoreStatus === "entered")
    .map((draft) => toNumber(draft.score))
    .filter((score): score is number => score !== null && score >= 0 && score <= outOf);

  if (values.length === 0) {
    return "-";
  }

  return Math.round(values.reduce((total, score) => total + score, 0) / values.length).toString();
}

function draftFromRow(row: TeacherMarkSheetRow): MarkDraft {
  return {
    score: row.score === null ? "" : String(row.score),
    scoreStatus: row.id ? row.score_status : "",
    remarks: row.remarks ?? "",
  };
}

function getValidation(draft: MarkDraft, outOf: number) {
  if (!draft.scoreStatus) {
    return { label: "Missing evidence", tone: "warning" as const, resolved: false, submitReady: false };
  }

  if (draft.scoreStatus === "not_assessed" || draft.scoreStatus === "incomplete") {
    return { label: "Unresolved evidence", tone: "warning" as const, resolved: false, submitReady: false };
  }

  if (draft.scoreStatus !== "entered") {
    return { label: "Evidence ready", tone: "success" as const, resolved: true, submitReady: true };
  }

  const score = toNumber(draft.score);
  if (score === null) {
    return { label: "Score required", tone: "danger" as const, resolved: false, submitReady: false };
  }
  if (score < 0) {
    return { label: "Below 0", tone: "danger" as const, resolved: false, submitReady: false };
  }
  if (score > outOf) {
    return { label: `Above ${outOf}`, tone: "danger" as const, resolved: false, submitReady: false };
  }

  return { label: "Ready", tone: "success" as const, resolved: true, submitReady: true };
}

function buildTemplateRows(
  rows: TeacherMarkSheetRow[],
  drafts: DraftsByStudent,
  windowTask: PendingMarksWindow | null,
) {
  if (!windowTask) {
    return [["", "", "", "", "", "", "", "", "", ""]];
  }

  if (rows.length === 0) {
    return [[windowTask.examName, windowTask.className, windowTask.subjectName, windowTask.paperName, "", "", String(windowTask.outOf), "", "", ""]];
  }

  return rows.map((row) => {
    const draft = drafts[row.student_id] ?? draftFromRow(row);
    return [
    windowTask.examName,
    windowTask.className,
    windowTask.subjectName,
    windowTask.paperName,
    row.admission_number ?? "",
    row.student_name ?? "",
    String(windowTask.outOf),
      draft.scoreStatus === "entered" ? draft.score : "",
      draft.scoreStatus,
      draft.remarks,
    ];
  });
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
  const completion = getWindowCompletion(windowTask);
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
  const [draftMarks, setDraftMarks] = useState<DraftsByWindow>({});
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

  const markSheetQuery = useQuery({
    queryKey: [
      "teacher-mark-sheet",
      liveSession.session?.tenantId,
      liveSession.session?.user.user_id,
      activeWindow?.examSeriesId,
      activeWindow?.classSectionId,
      activeWindow?.subjectId,
      activeWindow?.assessmentId,
    ],
    queryFn: () => fetchTeacherMarkSheetLive(liveSession.session!, {
      examSeriesId: activeWindow!.examSeriesId,
      classSectionId: activeWindow!.classSectionId,
      subjectId: activeWindow!.subjectId,
      assessmentId: activeWindow!.assessmentId,
    }),
    enabled: Boolean(
      liveSession.session
      && activeWindow?.examSeriesId
      && activeWindow.classSectionId
      && activeWindow.subjectId
      && activeWindow.assessmentId,
    ),
  });

  const markRows = markSheetQuery.data ?? [];
  const activeDrafts = useMemo(() => {
    if (!activeWindow) return {};
    const localDrafts = draftMarks[activeWindow.id] ?? {};

    return Object.fromEntries(
      markRows.map((row) => [row.student_id, localDrafts[row.student_id] ?? draftFromRow(row)]),
    ) as DraftsByStudent;
  }, [activeWindow, draftMarks, markRows]);
  const totalWindows = pendingMarksQuery.data?.stats.totalWindows ?? 0;
  const nearingDeadline = pendingMarksQuery.data?.stats.nearingDeadline ?? 0;
  const validations = activeWindow
    ? markRows.map((row) => getValidation(activeDrafts[row.student_id] ?? draftFromRow(row), activeWindow.outOf))
    : [];
  const resolvedCount = validations.filter((validation) => validation.resolved).length;
  const missingCount = validations.filter((validation) => validation.label === "Missing evidence").length;
  const unresolvedCount = validations.filter((validation) => validation.label === "Unresolved evidence").length;
  const invalidCount = validations.filter((validation) => validation.tone === "danger").length;
  const activeCompletion = activeWindow && markRows.length > 0
    ? Math.round((resolvedCount / markRows.length) * 100)
    : activeWindow
      ? getWindowCompletion(activeWindow)
      : 0;
  const activeAverage = activeWindow ? getAverage(activeDrafts, activeWindow.outOf) : "-";
  const markSheetReadOnly = markRows.some((row) => Boolean(row.id) && row.status !== "draft");
  const canSubmit = Boolean(
    activeWindow
    && markRows.length > 0
    && !markSheetReadOnly
    && validations.every((validation) => validation.submitReady),
  );

  function openWindow(windowTask: PendingMarksWindow) {
    setActiveWindowId(windowTask.id);
    setActionError("");
  }

  function updateDraft(studentId: string, patch: Partial<MarkDraft>) {
    if (!activeWindow) return;
    setActionError("");
    setDraftMarks((current) => ({
      ...current,
      [activeWindow.id]: {
        ...(current[activeWindow.id] ?? {}),
        [studentId]: {
          ...(activeDrafts[studentId] ?? { score: "", scoreStatus: "", remarks: "" }),
          ...patch,
        },
      },
    }));
  }

  async function persistScores(action: "draft" | "submit") {
    if (!liveSession.session || !activeWindow) {
      setActionError("Live teacher session is required before marks can be saved.");
      return;
    }

    if (markSheetReadOnly) {
      setActionError("This mark sheet has already entered moderation and is read-only. Use the governed correction workflow for changes.");
      return;
    }

    if (invalidCount > 0) {
      setActionError("Fix invalid numeric scores before saving this mark sheet.");
      return;
    }

    const marks = Object.fromEntries(
      markRows
        .map((row) => [row.student_id, activeDrafts[row.student_id] ?? draftFromRow(row)] as const)
        .filter(([, draft]) => Boolean(draft.scoreStatus))
        .map(([studentId, draft]) => [
          studentId,
          {
            score: draft.scoreStatus === "entered" ? toNumber(draft.score) : null,
            score_status: draft.scoreStatus as ExamScoreStatus,
            ...(draft.remarks.trim() ? { remarks: draft.remarks.trim() } : {}),
          },
        ]),
    );

    if (Object.keys(marks).length === 0) {
      setActionError("Enter at least one learner score or select an explicit evidence status before saving marks.");
      return;
    }

    if (action === "submit" && !canSubmit) {
      setActionError("Resolve every missing, not-assessed, or incomplete learner row before submitting for moderation.");
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      await saveExamMarksLive(liveSession.session, {
        action,
        examId: activeWindow.id,
        classSectionId: activeWindow.classSectionId,
        marks,
      });
      setDraftMarks((current) => {
        const next = { ...current };
        delete next[activeWindow.id];
        return next;
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-marks"] }),
        queryClient.invalidateQueries({ queryKey: ["teacher-mark-sheet"] }),
      ]);
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
      headers: [
        "exam",
        "class",
        "subject",
        "paper",
        "admission_number",
        "student_name",
        "out_of",
        "score",
        "score_status",
        "remarks",
      ],
      rows: buildTemplateRows(markRows, activeDrafts, activeWindow),
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
      rows: markRows.map((row) => {
        const draft = activeDrafts[row.student_id] ?? draftFromRow(row);
        const validation = getValidation(draft, activeWindow.outOf);
        const evidence = draft.scoreStatus
          ? SCORE_STATUS_LABELS[draft.scoreStatus]
          : "No evidence";
        return {
          label: `${row.admission_number ?? "No admission number"} - ${row.student_name ?? "Unnamed learner"}`,
          value: draft.scoreStatus === "entered"
            ? `${draft.score || "-"}/${activeWindow.outOf} | ${validation.label}${draft.remarks ? ` | ${draft.remarks}` : ""}`
            : `${evidence} | ${validation.label}${draft.remarks ? ` | ${draft.remarks}` : ""}`,
          tone: validation.submitReady ? "default" : "danger",
        };
      }),
      footer: "This validation sheet uses the live, subject-enrolled school mark register. Final grades are calculated only from the configured grading policy during governed processing.",
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
                disabled={!activeWindow || markRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                Print sheet
              </button>
              <button
                type="button"
                onClick={() => persistScores("draft")}
                disabled={!activeWindow || markRows.length === 0 || markSheetReadOnly || isSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </button>
              <button
                type="button"
                onClick={() => persistScores("submit")}
                disabled={!activeWindow || markRows.length === 0 || markSheetReadOnly || isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123A7A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for moderation
              </button>
            </div>
          </div>

          {activeWindow ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Missing evidence</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{markSheetQuery.isLoading ? "..." : missingCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Unresolved evidence</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{markSheetQuery.isLoading ? "..." : unresolvedCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Validation errors</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{markSheetQuery.isLoading ? "..." : invalidCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Submit status</p>
                <p className="mt-1 text-sm font-black text-[#071D49]">
                  {markSheetReadOnly ? "In moderation" : canSubmit ? "Ready for HOD" : "Draft review"}
                </p>
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
                The teacher workspace loads the school-scoped subject register, preserves explicit evidence, enforces score ranges, and keeps drafts separate from moderated marks.
              </p>
            </div>
          ) : markSheetQuery.isLoading ? (
            <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
            </div>
          ) : markSheetQuery.isError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
              {markSheetQuery.error instanceof Error
                ? markSheetQuery.error.message
                : "Could not load this subject markbook. Confirm the exam window and your active teaching allocation."}
            </div>
          ) : markRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-5">
              <p className="font-black text-[#071D49]">No active subject-enrolled learners in this markbook.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Admissions must activate learners in {activeWindow.className}, then the Deputy Principal or HOD must enrol them in {activeWindow.subjectName}.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#D8E0EC]">
              <table className="min-w-[1120px] divide-y divide-[#E2E8F0] bg-white text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Admission</th>
                    <th className="px-4 py-3">Evidence</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Policy result</th>
                    <th className="px-4 py-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {markRows.map((row) => {
                    const draft = activeDrafts[row.student_id] ?? draftFromRow(row);
                    const validation = getValidation(draft, activeWindow.outOf);
                    const rowReadOnly = Boolean(row.id) && row.status !== "draft";

                    return (
                      <tr key={row.student_id} className="align-top">
                        <td className="px-4 py-3 font-black text-[#071D49]">{row.student_name ?? "Unnamed learner"}</td>
                        <td className="px-4 py-3 font-semibold text-[#64748B]">{row.admission_number ?? "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`${row.student_name ?? "Learner"} evidence status`}
                            value={draft.scoreStatus}
                            disabled={rowReadOnly}
                            onChange={(event) => {
                              const scoreStatus = event.target.value as ExamScoreStatus;
                              updateDraft(row.student_id, {
                                scoreStatus,
                                ...(scoreStatus === "entered" ? {} : { score: "" }),
                              });
                            }}
                            className="h-10 min-w-44 rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-bold text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]"
                          >
                            <option value="" disabled>Select evidence</option>
                            {SCORE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`${row.student_name ?? "Learner"} score`}
                            type="number"
                            min="0"
                            max={activeWindow.outOf}
                            step="0.01"
                            value={draft.score}
                            disabled={rowReadOnly || draft.scoreStatus !== "entered"}
                            onChange={(event) => updateDraft(row.student_id, {
                              score: event.target.value,
                              scoreStatus: "entered",
                            })}
                            className={cn(
                              "h-10 w-28 rounded-xl border px-3 text-center text-sm font-black text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]",
                              validation.tone !== "danger" ? "border-[#D8E0EC]" : "border-red-300 bg-red-50",
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`${row.student_name ?? "Learner"} mark remarks`}
                            value={draft.remarks}
                            disabled={rowReadOnly}
                            maxLength={500}
                            onChange={(event) => updateDraft(row.student_id, { remarks: event.target.value })}
                            placeholder="Optional evidence note"
                            className="h-10 min-w-52 rounded-xl border border-[#D8E0EC] px-3 text-sm font-semibold text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-[#475569]">
                          {rowReadOnly
                            ? row.status.replaceAll("_", " ")
                            : draft.scoreStatus === "entered"
                              ? "Calculated after grading policy"
                              : draft.scoreStatus
                                ? SCORE_STATUS_LABELS[draft.scoreStatus]
                                : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black",
                              validation.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                              validation.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
                              validation.tone === "danger" && "border-red-200 bg-red-50 text-red-700",
                            )}
                          >
                            {validation.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {validation.label}
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
