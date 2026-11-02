"use client";

import { CheckCircle2, Clock3, Loader2, AlertCircle } from "lucide-react";

export type ReportTask = {
  job_id?: string;
  state?: string;
  progress?: Record<string, number | string>;
};
const stages: Record<string, string> = {
  validating: "Validating saved inputs",
  collecting: "Reading school records",
  rendering: "Rendering the PDF",
  generating: "Grading, rendering and saving cards",
  saving: "Saving the report",
  saved: "Finalizing saved files",
};

export function ReportWorkProgress({
  task,
  title = "Report generation",
}: {
  task: ReportTask;
  title?: string;
}) {
  const progress = task.progress ?? {};
  const total = Number(progress.total_students ?? progress.total ?? 0);
  const ready = Number(progress.completed_students ?? progress.rendered ?? 0);
  const failed = Number(progress.failed_students ?? 0);
  const processed = ready + failed;
  const known =
    Number.isFinite(total) && total > 0 && Number.isFinite(processed);
  const percent = known
    ? Math.min(100, Math.max(0, Math.floor((processed / total) * 100)))
    : undefined;
  const state = task.state ?? "queued";
  const running = state === "running";
  const Icon =
    state === "completed"
      ? CheckCircle2
      : state === "failed"
        ? AlertCircle
        : running
          ? Loader2
          : Clock3;
  const label =
    state === "completed"
      ? "Ready"
      : state === "failed"
        ? "Needs attention"
        : state === "submitting"
          ? "Sending request"
          : running
            ? "Processing"
            : "Queued";
  return (
    <section
      aria-label={title}
      className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
          <Icon
            className={`h-6 w-6 ${running ? "motion-safe:animate-spin" : ""}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p role="status" className="text-sm text-muted">
            {label}
            {running && progress.stage
              ? ` · ${stages[String(progress.stage)] ?? "Processing saved inputs"}`
              : ""}
          </p>
        </div>
        {percent !== undefined ? (
          <span className="text-xl font-bold tabular-nums text-primary">
            {percent}%
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={
          known
            ? `${processed} of ${total} processed; ${ready} ready; ${failed} failed`
            : label
        }
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
      >
        {known ? (
          <div
            className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${failed ? "bg-amber-500" : "bg-gradient-to-r from-blue-600 to-indigo-500"}`}
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div
            className={`h-full w-full rounded-full ${state === "completed" ? "bg-emerald-500" : "bg-blue-200 motion-safe:animate-pulse"}`}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {known
          ? `${ready} ready · ${failed} failed · ${Math.max(0, total - processed)} remaining`
          : state === "submitting"
            ? "Waiting for the server to accept the request."
            : state === "queued"
              ? "Your request is saved and waiting to start."
              : running
                ? "Your report is being prepared."
                : state === "failed"
                  ? "Review the error and retry safely."
                  : "The saved report is available below."}
      </p>
    </section>
  );
}
