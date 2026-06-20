import React, { useState } from 'react';
import { CheckCircle, XCircle, Inbox } from 'lucide-react';
import { useApprovals } from '../../hooks/useApprovals';
 // Assuming context exposes userId

export const ApprovalInbox: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const { approvals, isLoading, approve, reject } = useApprovals();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return <div className="animate-pulse w-8 h-8 bg-slate-200 rounded-full" />;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 transition-all duration-200"
      >
        <Inbox size={24} />
        {approvals.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {approvals.length > 9 ? '9+' : approvals.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Pending Approvals</h3>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
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
                      onClick={() => reject(req.id, currentUserId, 'Rejected from inbox')}
                      className="flex items-center text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <XCircle size={14} className="mr-1" /> Reject
                    </button>
                    <button 
                      onClick={() => approve(req.id, currentUserId, 'Approved from inbox')}
                      className="flex items-center text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                    >
                      <CheckCircle size={14} className="mr-1" /> Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
