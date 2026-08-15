import React from 'react';
import { CheckCircle, XCircle, Inbox } from 'lucide-react';
import { useApprovals } from '../../hooks/useApprovals';
import { HeaderPopover } from './header-popover';

export const ApprovalInbox: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const { approvals, isLoading, approve, reject } = useApprovals();

  if (isLoading) return <div className="animate-pulse w-8 h-8 bg-slate-200 rounded-full" />;

  return (
    <HeaderPopover
      label="Approvals"
      triggerLabel={approvals.length > 0 ? `${approvals.length} pending approvals` : "No pending approvals"}
      title="Pending Approvals"
      icon={<Inbox size={24} aria-hidden="true" />}
      desktopWidth="sm:w-96"
      badge={approvals.length > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {approvals.length > 9 ? '9+' : approvals.length}
          </span>
        ) : undefined}
    >
          <div className="p-2">
            {approvals.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              approvals.map((req) => (
                <div key={req.id} className="p-3 mb-2 rounded-lg border border-slate-100 bg-white hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-semibold text-slate-800">{req.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.reason}</p>
                  <div className="flex justify-end gap-2 mt-3">
                    <button 
                      type="button"
                      onClick={() => reject(req.id, currentUserId, 'Rejected from inbox')}
                      className="flex min-h-11 items-center rounded-md bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      <XCircle size={14} className="mr-1" /> Reject
                    </button>
                    <button 
                      type="button"
                      onClick={() => approve(req.id, currentUserId, 'Approved from inbox')}
                      className="flex min-h-11 items-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                    >
                      <CheckCircle size={14} className="mr-1" /> Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
    </HeaderPopover>
  );
};
