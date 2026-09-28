"use client";

type WorkspaceQueryFailureProps = {
  title: string;
  error: Error;
  onRetry: () => void;
};

export function WorkspaceQueryFailure({ title, error, onRetry }: WorkspaceQueryFailureProps) {
  return (
    <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger">
      <p className="font-black">{title}</p>
      <p className="mt-1 break-words">{error.message}</p>
      <button type="button" onClick={onRetry} className="mt-3 font-black underline underline-offset-2">
        Retry
      </button>
    </div>
  );
}
