"use client";

import { useState } from "react";

/** Re-run this workspace's query; the query owns its error and recovered data. */
export function WorkspaceRetry({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <button
      type="button"
      disabled={retrying}
      className="mt-3 rounded-lg border border-current px-4 py-2 text-sm font-semibold disabled:opacity-50"
      onClick={async () => {
        setRetrying(true);
        try { await onRetry(); } catch { /* The query retains its error state. */ }
        finally { setRetrying(false); }
      }}
    >
      {retrying ? "Retrying…" : "Retry loading"}
    </button>
  );
}
