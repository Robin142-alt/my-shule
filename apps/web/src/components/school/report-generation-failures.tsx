"use client";

type Failure = { student_id: string; student_name?: string; code?: string; message: string };

export function ReportGenerationFailures({ count, failures, onRetry, busy }: {
  count: number; failures: Failure[]; onRetry?: () => void; busy: boolean;
}) {
  const shared = failures.every(failure => failure.code === failures[0]?.code && failure.message === failures[0]?.message);
  return <div className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger">
    <p className="font-semibold">{count} report {count === 1 ? "card" : "cards"} could not be generated.</p>
    {shared ? <p className="mt-1">{failures[0]?.message}</p> : <p className="mt-1">Review the individual issues below. Current completed cards will be reused.</p>}
    {onRetry ? <button type="button" disabled={busy} onClick={onRetry} className="mt-3 min-h-10 rounded-lg border border-danger-border bg-white px-3 font-semibold disabled:opacity-50">{busy ? "Retrying…" : "Retry Failed"}</button> : null}
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold">Individual failure details ({failures.length})</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">{failures.map(failure => <li key={`${failure.student_id}:${failure.code}`}>
        <span className="font-semibold">{failure.student_name || "Learner"}:</span> {failure.message}
      </li>)}</ul>
    </details>
  </div>;
}
