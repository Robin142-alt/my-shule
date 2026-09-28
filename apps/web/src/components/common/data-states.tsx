"use client";

import { AlertCircle, Loader2, RefreshCcw, ShieldAlert, FolderOpen } from "lucide-react";

export function DataLoadingState({ message = "Loading data..." }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-border bg-surface-muted p-8 text-center shadow-sm">
      <Loader2 className="h-8 w-8 animate-spin text-info" />
      <p className="mt-4 text-sm font-semibold text-muted">{message}</p>
    </div>
  );
}

export function DataErrorState({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry?: () => void;
}) {
  const isPermissionError = error?.name === "PermissionDeniedError";

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-danger-border bg-danger-soft p-8 text-center shadow-sm">
      {isPermissionError ? (
        <ShieldAlert className="h-10 w-10 text-red-600" />
      ) : (
        <AlertCircle className="h-10 w-10 text-red-600" />
      )}
      <h3 className="mt-4 text-lg font-black text-red-900">
        {isPermissionError ? "Access Denied" : "Data could not be loaded"}
      </h3>
      <p className="mt-2 text-sm text-danger">
        {error?.message || "An unexpected error occurred while fetching real data."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-sm font-black text-danger transition hover:bg-red-200"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

export function DataEmptyState({
  title = "No records found",
  message = "There is no data to display here yet.",
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-background text-muted">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-black text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
