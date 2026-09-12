import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
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

type MissingMarkEvidenceStatus = Exclude<ExamScoreStatus, "entered">;

type DraftsByStudent = Record<string, MarkDraft>;
type DraftsByWindow = Record<string, DraftsByStudent>;

const MISSING_MARK_EVIDENCE_OPTIONS: Array<{ value: MissingMarkEvidenceStatus; label: string }> = [
  { value: "absent", label: "Absent" },
  { value: "exempt", label: "Exempt" },
  { value: "not_assessed", label: "Not assessed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "withheld", label: "Withheld" },
  { value: "medical_exception", label: "Medical exception" },
  { value: "transfer_student", label: "Transfer student" },
];

const SCORE_STATUS_LABELS: Record<ExamScoreStatus, string> = {
  entered: "Score entered",
  ...Object.fromEntries(
    MISSING_MARK_EVIDENCE_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<MissingMarkEvidenceStatus, string>,
};

const EMPTY_MARK_WINDOWS: PendingMarksWindow[] = [];
const EMPTY_MARK_ROWS: TeacherMarkSheetRow[] = [];

function entryUnavailableReason(windowTask: PendingMarksWindow) {
  switch (windowTask.entryState) {
    case "Draft": return "This exam is still a draft. The Exams Manager must select Open for marks in Exam Setup before you can enter scores.";
    case "Scheduled": return `Marks entry starts ${windowTask.opensAt ? new Date(windowTask.opensAt).toLocaleString() : "on the scheduled date"}. The Exams Manager can open it earlier from Exam Setup.`;
    case "Deadline passed": return "The marks-entry deadline has passed. Ask the Exams Manager to extend the end date and open entry again.";
    case "Locked": return "This exam is locked or has been published. Ask the Exams Manager to use the governed correction workflow for changes.";
    default: return "Marks entry is closed. Ask the Exams Manager to open this exam for marks.";
  }
}

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function effectiveScoreStatus(draft: MarkDraft): ExamScoreStatus | "" {
  if (draft.scoreStatus && draft.scoreStatus !== "entered") {
    return draft.scoreStatus;
  }

  return draft.score.trim() ? "entered" : "";
}

function getWindowCompletion(windowTask: PendingMarksWindow) {
  if (!windowTask.totalStudents) {
    return 0;
  }

  return Math.min(100, Math.round((windowTask.enteredCount / windowTask.totalStudents) * 100));
}

function getAverage(drafts: DraftsByStudent, outOf: number) {
  const values = Object.values(drafts)
    .filter((draft) => effectiveScoreStatus(draft) === "entered")
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
  const scoreStatus = effectiveScoreStatus(draft);

  if (!scoreStatus) {
    return { label: "Missing evidence", tone: "warning" as const, resolved: false, submitReady: false };
  }

  if (scoreStatus !== "entered") {
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
    const scoreStatus = effectiveScoreStatus(draft);
    return [
    windowTask.examName,
    windowTask.className,
    windowTask.subjectName,
    windowTask.paperName,
    row.admission_number ?? "",
    row.student_name ?? "",
    String(windowTask.outOf),
      scoreStatus === "entered" ? draft.score : "",
      scoreStatus,
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
        {windowTask.canEnter === false ? "View entry status" : "Open markbook"}
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
    queryKey: ["pending-marks", liveSession.session?.tenantId, liveSession.session?.user.user_id, "all"],
    queryFn: () => fetchPendingMarksLive(liveSession.session!, true),
    enabled: !!liveSession.session,
    retry: false,
    refetchInterval: 30_000,
  });

  const windows = pendingMarksQuery.data?.windows ?? EMPTY_MARK_WINDOWS;
  const activeWindow = useMemo(() => {
    if (!activeWindowId) return windows.find((windowTask) => windowTask.canEnter !== false) ?? windows[0] ?? null;
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
      && activeWindow.assessmentId
      && activeWindow.canEnter !== false,
    ),
    retry: false,
  });

  const markRows = activeWindow?.canEnter === false ? EMPTY_MARK_ROWS : markSheetQuery.data ?? EMPTY_MARK_ROWS;
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
  const evidenceSuppliedCount = activeWindow
    ? markRows.filter((row) => {
        const draft = activeDrafts[row.student_id] ?? draftFromRow(row);
        const scoreStatus = effectiveScoreStatus(draft);
        return Boolean(scoreStatus && scoreStatus !== "entered");
      }).length
    : 0;
  const invalidCount = validations.filter((validation) => validation.tone === "danger").length;
  const activeCompletion = activeWindow && markRows.length > 0
    ? Math.round((resolvedCount / markRows.length) * 100)
    : activeWindow
      ? getWindowCompletion(activeWindow)
      : 0;
  const activeAverage = activeWindow ? getAverage(activeDrafts, activeWindow.outOf) : "-";
  const markSheetReadOnly = activeWindow?.canEnter === false || markRows.some((row) => Boolean(row.id) && row.status !== "draft");
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
      setActionError(activeWindow.canEnter === false
        ? entryUnavailableReason(activeWindow)
        : "This mark sheet has already entered moderation and is read-only. Use the governed correction workflow for changes.");
      return;
    }

    if (invalidCount > 0) {
      setActionError("Fix invalid numeric scores before saving this mark sheet.");
      return;
    }

    const marks = Object.fromEntries(
      markRows.flatMap((row) => {
        const draft = activeDrafts[row.student_id] ?? draftFromRow(row);
        const scoreStatus = effectiveScoreStatus(draft);

        if (!scoreStatus) {
          return [];
        }

        return [[
          row.student_id,
          {
            score: scoreStatus === "entered" ? toNumber(draft.score) : null,
            score_status: scoreStatus,
            ...(draft.remarks.trim() ? { remarks: draft.remarks.trim() } : {}),
          },
        ] as const];
      }),
    );

    if (Object.keys(marks).length === 0) {
      setActionError("Enter at least one learner score or select missing-mark evidence before saving marks.");
      return;
    }

    if (action === "submit" && !canSubmit) {
      setActionError("Enter a valid score or select missing-mark evidence for every learner before submitting for moderation.");
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save marks. Please retry.";
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
        const scoreStatus = effectiveScoreStatus(draft);
        const evidence = scoreStatus && scoreStatus !== "entered"
          ? SCORE_STATUS_LABELS[scoreStatus]
          : "No missing-mark evidence needed";
        return {
          label: `${row.admission_number ?? "No admission number"} - ${row.student_name ?? "Unnamed learner"}`,
          value: scoreStatus === "entered"
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
      headerEnd={<div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void pendingMarksQuery.refetch()}
          disabled={pendingMarksQuery.isFetching}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" /> Refresh exams
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={
            !activeWindow
            || activeWindow.canEnter === false
            || pendingMarksQuery.isError
            || pendingMarksQuery.isLoading
            || markSheetQuery.isError
            || markSheetQuery.isLoading
          }
          title={activeWindow ? "Download the active markbook as CSV" : "Load or open a markbook before downloading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>}
    >
      {pendingMarksQuery.isSuccess ? (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">Assigned markbooks</p>
          <p className="mt-2 text-2xl font-black text-[#071D49] sm:text-3xl">{totalWindows}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Deadline risk</p>
          <p className="mt-2 text-2xl font-black text-amber-800 sm:text-3xl">{nearingDeadline}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Moderation readiness</p>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">
            {activeWindow ? `${activeCompletion}% complete` : "Open a class"}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Draft average</p>
          <p className="mt-2 text-2xl font-black text-emerald-800 sm:text-3xl">
            {activeAverage}{activeWindow && activeAverage !== "-" ? `/${activeWindow.outOf}` : ""}
          </p>
        </article>
      </div>
      ) : null}

      {pendingMarksQuery.isLoading ? (
        <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#1D4ED8]" />
          <p className="mt-3 font-black text-[#071D49]">Loading your assigned markbooks...</p>
        </div>
      ) : pendingMarksQuery.isError ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-red-900">We couldn&apos;t load your assigned markbooks</h3>
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-red-800">
                {pendingMarksQuery.error instanceof Error
                  ? pendingMarksQuery.error.message
                  : "The markbook service did not respond. Your saved exam setup is safe."}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Retry loading markbooks"
            onClick={() => void pendingMarksQuery.refetch()}
            disabled={pendingMarksQuery.isFetching}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-800 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {pendingMarksQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Retry
          </button>
        </div>
      ) : windows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#B8C6DA] bg-[#F8FAFC] p-6 text-center">
          <BookOpenCheck className="mx-auto h-9 w-9 text-[#1D4ED8]" />
          <h3 className="mt-3 text-lg font-black text-[#071D49]">No markbooks assigned yet</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#64748B]">
            No exam matches your active class and subject allocation. Ask the Exams Manager to include your class and subject in Exam Setup, and the Deputy Principal to confirm your teaching assignment.
          </p>
          <button
            type="button"
            onClick={() => void pendingMarksQuery.refetch()}
            disabled={pendingMarksQuery.isFetching}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#B8C6DA] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {pendingMarksQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh markbooks
          </button>
        </div>
      ) : (
      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#1D4ED8]" />
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#071D49]">Assigned exam windows</h3>
          </div>
          {windows.map((windowTask) => (
              <WindowCard
                key={windowTask.id}
                windowTask={windowTask}
                isActive={activeWindow?.id === windowTask.id}
                onOpen={() => openWindow(windowTask)}
              />
          ))}
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
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={printValidationSheet}
                disabled={!activeWindow || markRows.length === 0}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                Print sheet
              </button>
              <button
                type="button"
                onClick={() => persistScores("draft")}
                disabled={!activeWindow || markRows.length === 0 || markSheetReadOnly || isSaving}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </button>
              <button
                type="button"
                onClick={() => persistScores("submit")}
                disabled={!activeWindow || markRows.length === 0 || markSheetReadOnly || isSaving}
                className="col-span-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123A7A] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 sm:w-auto"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for moderation
              </button>
            </div>
          </div>

          {activeWindow && activeWindow.canEnter !== false && markSheetQuery.isSuccess ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Missing score evidence</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{markSheetQuery.isLoading ? "..." : missingCount}</p>
              </div>
              <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="text-xs font-black uppercase text-[#64748B]">Evidence supplied</p>
                <p className="mt-1 text-2xl font-black text-[#071D49]">{markSheetQuery.isLoading ? "..." : evidenceSuppliedCount}</p>
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
          ) : activeWindow.canEnter === false ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
              <p className="font-black text-[#071D49]">{activeWindow.entryState || "Entry unavailable"}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{entryUnavailableReason(activeWindow)}</p>
            </div>
          ) : markSheetQuery.isLoading ? (
            <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
            </div>
          ) : markSheetQuery.isError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
              <p className="text-sm font-bold leading-6 text-red-800">
                {markSheetQuery.error instanceof Error
                  ? markSheetQuery.error.message
                  : "Could not load this subject markbook. Confirm the exam window and your active teaching allocation."}
              </p>
              <button
                type="button"
                onClick={() => void markSheetQuery.refetch()}
                disabled={markSheetQuery.isFetching}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-800 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {markSheetQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Retry markbook
              </button>
            </div>
          ) : markRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-5">
              <p className="font-black text-[#071D49]">No active subject-enrolled learners in this markbook.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Admissions must activate learners in {activeWindow.className}, then the Deputy Principal or HOD must enrol them in {activeWindow.subjectName}.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 lg:hidden">
                {markRows.map((row) => {
                  const draft = activeDrafts[row.student_id] ?? draftFromRow(row);
                  const validation = getValidation(draft, activeWindow.outOf);
                  const rowReadOnly = Boolean(row.id) && row.status !== "draft";

                  return (
                    <article key={row.student_id} className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-black text-[#071D49]">{row.student_name ?? "Unnamed learner"}</h3>
                          <p className="mt-0.5 text-sm font-semibold text-[#64748B]">
                            Admission {row.admission_number ?? "not recorded"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-black",
                            validation.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            validation.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
                            validation.tone === "danger" && "border-red-200 bg-red-50 text-red-700",
                          )}
                        >
                          {validation.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          {validation.label}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">
                          Evidence if score is blank
                          <select
                            aria-label={`${row.student_name ?? "Learner"} evidence status`}
                            value={draft.scoreStatus === "entered" ? "" : draft.scoreStatus}
                            disabled={rowReadOnly}
                            onChange={(event) => {
                              const scoreStatus = event.target.value as MissingMarkEvidenceStatus | "";
                              updateDraft(row.student_id, {
                                scoreStatus,
                                ...(scoreStatus ? { score: "" } : {}),
                              });
                            }}
                            className="min-h-11 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-base font-bold normal-case tracking-normal text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]"
                          >
                            <option value="">Not needed when scored</option>
                            {MISSING_MARK_EVIDENCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
                          <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">
                            Score / {activeWindow.outOf}
                            <input
                              aria-label={`${row.student_name ?? "Learner"} score`}
                              type="number"
                              min="0"
                              max={activeWindow.outOf}
                              step="0.01"
                              value={draft.score}
                              disabled={rowReadOnly || Boolean(draft.scoreStatus && draft.scoreStatus !== "entered")}
                              onChange={(event) => {
                                const score = event.target.value;
                                updateDraft(row.student_id, {
                                  score,
                                  scoreStatus: score.trim() ? "entered" : "",
                                });
                              }}
                              className={cn(
                                "min-h-11 min-w-0 w-full rounded-xl border px-3 text-center text-base font-black normal-case tracking-normal text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]",
                                validation.tone !== "danger" ? "border-[#D8E0EC]" : "border-red-300 bg-red-50",
                              )}
                            />
                          </label>
                          <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">
                            Remarks
                            <input
                              aria-label={`${row.student_name ?? "Learner"} mark remarks`}
                              value={draft.remarks}
                              disabled={rowReadOnly}
                              maxLength={500}
                              onChange={(event) => updateDraft(row.student_id, { remarks: event.target.value })}
                              placeholder="Optional note"
                              className="min-h-11 min-w-0 w-full rounded-xl border border-[#D8E0EC] px-3 text-base font-semibold normal-case tracking-normal text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]"
                            />
                          </label>
                        </div>
                      </div>

                      <p className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#475569]">
                        Policy result: {rowReadOnly
                          ? row.status.replaceAll("_", " ")
                          : effectiveScoreStatus(draft) === "entered"
                            ? "Calculated after grading policy"
                            : draft.scoreStatus
                              ? SCORE_STATUS_LABELS[draft.scoreStatus]
                              : "Pending evidence"}
                      </p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-[#D8E0EC] lg:block">
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
                    const scoreStatus = effectiveScoreStatus(draft);
                    const rowReadOnly = Boolean(row.id) && row.status !== "draft";

                    return (
                      <tr key={row.student_id} className="align-top">
                        <td className="px-4 py-3 font-black text-[#071D49]">{row.student_name ?? "Unnamed learner"}</td>
                        <td className="px-4 py-3 font-semibold text-[#64748B]">{row.admission_number ?? "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`${row.student_name ?? "Learner"} evidence status`}
                            value={draft.scoreStatus === "entered" ? "" : draft.scoreStatus}
                            disabled={rowReadOnly}
                            onChange={(event) => {
                              const scoreStatus = event.target.value as MissingMarkEvidenceStatus | "";
                              updateDraft(row.student_id, {
                                scoreStatus,
                                ...(scoreStatus ? { score: "" } : {}),
                              });
                            }}
                            className="h-10 min-w-44 rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-bold text-[#071D49] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100 disabled:bg-[#F1F5F9]"
                          >
                            <option value="">Not needed when scored</option>
                            {MISSING_MARK_EVIDENCE_OPTIONS.map((option) => (
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
                            disabled={rowReadOnly || Boolean(draft.scoreStatus && draft.scoreStatus !== "entered")}
                            onChange={(event) => {
                              const score = event.target.value;
                              updateDraft(row.student_id, {
                                score,
                                scoreStatus: score.trim() ? "entered" : "",
                              });
                            }}
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
            </>
          )}
        </section>
      </div>
      )}
    </Panel>
  );
}
