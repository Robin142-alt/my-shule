"use client";

import React from "react";
import { AlertCircle, CheckCircle, Inbox, Loader2, RefreshCw, XCircle } from "lucide-react";

import { useApprovals } from "@/hooks/useApprovals";
import { HeaderPopover } from "./header-popover";

export const ApprovalInbox: React.FC = () => {
  const { approvals, isLoading, error, mutationError, pendingIds, approve, reject, refetch } = useApprovals();
  const visibleError = mutationError ?? error;

  return (
    <HeaderPopover
      label="Approvals"
      triggerLabel={visibleError
        ? "Approvals unavailable"
        : isLoading
          ? "Loading approvals"
          : approvals.length > 0
            ? `${approvals.length} pending approvals`
            : "No pending approvals"}
      title="Pending Approvals"
      icon={<Inbox size={24} aria-hidden="true" />}
      desktopWidth="sm:w-96"
      badge={!visibleError && approvals.length > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          {approvals.length > 9 ? "9+" : approvals.length}
        </span>
      ) : undefined}
    >
      <div className="p-2">
        {visibleError ? (
          <div role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Approvals could not be refreshed.</p>
            <p className="mt-1 text-xs">{visibleError.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : null}
        {isLoading && approvals.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading approvals...</div>
        ) : !visibleError && approvals.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm">You&apos;re all caught up!</p>
          </div>
        ) : approvals.map((request) => (
          <div key={request.id} className="mb-2 rounded-lg border border-slate-100 bg-white p-3 transition-shadow hover:shadow-md">
            <h4 className="text-sm font-semibold text-slate-800">{request.title}</h4>
            {request.reason ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{request.reason}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                disabled={pendingIds.has(request.id)}
                onClick={() => void reject(request.id, "Rejected from inbox").catch(() => undefined)}
                className="flex min-h-11 items-center rounded-md bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
              >
                <XCircle size={14} className="mr-1" /> Reject
              </button>
              <button
                type="button"
                disabled={pendingIds.has(request.id)}
                onClick={() => void approve(request.id, "Approved from inbox").catch(() => undefined)}
                className="flex min-h-11 items-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                <CheckCircle size={14} className="mr-1" /> Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </HeaderPopover>
  );
};
