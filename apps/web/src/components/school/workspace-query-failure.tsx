"use client";

type WorkspaceQueryFailureProps = {
  title: string;
  error: Error;
  onRetry: () => void;
};

export function WorkspaceQueryFailure({ title, error, onRetry }: WorkspaceQueryFailureProps) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p className="font-black">{title}</p>
      <p className="mt-1 break-words">{error.message}</p>
      <button type="button" onClick={onRetry} className="mt-3 font-black underline underline-offset-2">
        Retry
      </button>
    </div>
  );
}
