"use client";
import { useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import { localReportDate } from "@/lib/report-cards/local-date";
import {
  downloadSavedReport,
  printSavedReport,
} from "@/lib/report-cards/saved-report-file";
import { SavedReportPreview } from "@/components/report-cards/saved-report-preview";
import {
  ReportWorkProgress,
  type ReportTask,
} from "@/components/report-cards/report-work-progress";
import { Modal } from "@/components/ui/modal";

type Report = {
  id: string;
  title: string;
  generated_at: string;
  type: string;
  status: string;
};
type ReportsData = {
  metrics: { reports_generated: number };
  reportsList: Report[];
  jobs?: Array<ReportTask & { job_id: string; error_code?: string }>;
};

export function ReportsWorkspace() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, refetch } = useSchoolQuery<ReportsData>(
    `/admin-command/exams-manager/reports?page=${page}`,
    {
      refetchInterval: (query) =>
        query.state.data?.jobs?.some(
          (job) => job.state === "queued" || job.state === "running",
        )
          ? 3000
          : false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState<ReportTask | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const active = useRef(false);
  const requestId = useRef<string | null>(null);
  const [failure, setFailure] = useState("");
  const pending = data?.jobs?.some(
    (job) => job.state === "queued" || job.state === "running",
  );
  const control =
    "min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-40";
  async function generate(retryId?: string) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setFailure("");
    setTask({ state: "submitting" });
    requestId.current ??= crypto.randomUUID();
    try {
      await requestSchoolApiProxy(
        retryId
          ? `/exams/report-cards/jobs/${retryId}/retry`
          : "/admin-command/exams-manager/reports/generate",
        {
          method: "POST",
          ...(!retryId
            ? {
                body: {
                  title: "Exams operations report",
                  format: "pdf",
                  request_id: requestId.current,
                },
              }
            : {}),
          onProgress: (value) =>
            setTask({
              job_id: String(value.job_id),
              state: String(value.state),
              progress: value,
            }),
        },
      );
      setTask((current) => ({ ...current, state: "completed" }));
      requestId.current = null;
      toast.success("Exams operations report is ready.");
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : "Report generation failed. Retry safely.",
      );
    } finally {
      await refetch();
      active.current = false;
      setBusy(false);
    }
  }
  async function fileAction(report: Report, print: boolean) {
    if (fileBusy) return;
    setFileBusy(true);
    setFailure("");
    try {
      await (print
        ? printSavedReport(report.id)
        : downloadSavedReport(report.id));
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : "The saved report could not be opened. Retry.",
      );
    } finally {
      setFileBusy(false);
    }
  }
  return (
    <Panel
      title="Exam Reports"
      description="Generate, preview, download and print saved exam administration reports."
      icon={FileText}
      actions={
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Compiling…" : "Generate report"}
        </button>
      }
    >
      {error || (failure && !selected) ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {failure || error?.message}{" "}
          <button className={control} onClick={() => void refetch()}>
            Refresh status
          </button>
        </div>
      ) : null}
      {task && !data?.jobs?.some((job) => job.job_id === task.job_id) ? (
        <div className="mb-4">
          <ReportWorkProgress task={task} title="Exams operations report" />
        </div>
      ) : null}
      {data?.jobs?.map((job) => (
        <div key={job.job_id} className="mb-4">
          <ReportWorkProgress task={job} title="Exams operations report" />
          {job.state === "failed" ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span>
                {job.progress?.error_message || 'The report could not finish. Retry safely.'} Reference:{" "}
                {job.job_id}
                {job.error_code ? ` · ${job.error_code}` : ""}
              </span>
              <button
                className={control}
                disabled={busy}
                onClick={() => void generate(job.job_id)}
              >
                Retry report
              </button>
            </div>
          ) : null}
        </div>
      ))}
      <div className="mb-6 rounded-xl border border-border bg-surface-muted p-4">
        <div className="text-sm font-semibold text-muted">
          Recent saved reports
        </div>
        <div className="mt-1 text-lg font-black">
          {isLoading ? "…" : (data?.metrics.reports_generated ?? 0)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted">
            <tr>
              {["Title", "Generated at", "Type", "Status", "Actions"].map(
                (label) => (
                  <th key={label} className="px-4 py-3 font-bold">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  Loading reports…
                </td>
              </tr>
            ) : !data?.reportsList.length ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">
                  No reports saved yet. Generate a report from the current exam
                  records.
                </td>
              </tr>
            ) : (
              data.reportsList.map((report) => (
                <tr key={report.id} className="border-t border-border">
                  <td className="min-w-40 px-4 py-3">
                    <button
                      className="min-h-11 text-left font-semibold text-primary underline underline-offset-4"
                      onClick={() => setSelected(report)}
                    >
                      {report.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {localReportDate(report.generated_at)}
                  </td>
                  <td className="px-4 py-3 uppercase">{report.type}</td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={report.status}
                      tone={report.status === "Ready" ? "success" : "danger"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={control}
                        onClick={() => setSelected(report)}
                      >
                        View
                      </button>
                      <button
                        className={control}
                        disabled={fileBusy}
                        onClick={() => void fileAction(report, false)}
                      >
                        Download
                      </button>
                      <button
                        className={control}
                        disabled={fileBusy}
                        onClick={() => void fileAction(report, true)}
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          className={control}
          disabled={page * 50 >= (data?.metrics.reports_generated ?? 0)}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
      <Modal
        open={Boolean(selected)}
        title={selected?.title ?? "Report preview"}
        onClose={() => setSelected(null)}
        size="xl"
        mobileFullScreen
        footer={
          selected ? (
            <>
              <button
                className={control}
                disabled={fileBusy}
                onClick={() => void fileAction(selected, false)}
              >
                Download
              </button>
              <button
                className={control}
                disabled={fileBusy}
                onClick={() => void fileAction(selected, true)}
              >
                Print
              </button>
              <button className={control} onClick={() => setSelected(null)}>
                Close
              </button>
            </>
          ) : undefined
        }
      >
        {selected && failure ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{failure} Retry using the actions below.</p> : null}
        {selected ? (
          <SavedReportPreview
            key={selected.id}
            id={selected.id}
            title={selected.title}
          />
        ) : null}
      </Modal>
    </Panel>
  );
}
