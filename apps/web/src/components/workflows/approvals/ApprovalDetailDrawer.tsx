'use client';

import { useState } from 'react';
import { ApprovalRequest, ApprovalsApi } from '@/lib/client/approvals-api';

interface ApprovalDetailDrawerProps {
  request: ApprovalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

export function ApprovalDetailDrawer({ request, isOpen, onClose, onProcessed }: ApprovalDetailDrawerProps) {
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !request) return null;

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'ESCALATE') => {
    try {
      setIsProcessing(true);
      await ApprovalsApi.processAction(request.id, action, comment);
      onProcessed();
      onClose();
    } catch (error) {
      console.error(error);
      alert(`Failed to ${action} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-[450px] h-full bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Approval Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times; Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Module</h3>
            <p className="mt-1 text-sm text-gray-900">{request.module}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Action</h3>
            <p className="mt-1 text-sm text-gray-900">{request.action}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Target</h3>
            <p className="mt-1 text-sm text-gray-900">{request.targetEntityType} #{request.targetEntityId}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {request.status}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Reason / Context</h3>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
              {request.reason || 'No specific reason provided.'}
            </div>
          </div>

          {request.newValue && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Proposed Changes</h3>
              <pre className="mt-1 p-3 bg-gray-100 rounded-md text-xs overflow-x-auto text-gray-800">
                {JSON.stringify(request.newValue, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Audit Trail</h3>
            <ul className="mt-2 space-y-2">
              {request.auditLogs?.map((log: any, idx: number) => (
                <li key={idx} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-3">
                  <span className="font-semibold">{log.action}</span> - {new Date(log.createdAt).toLocaleString()}
                  {log.comment && <div className="mt-1 text-gray-500 italic">"{log.comment}"</div>}
                </li>
              ))}
              {(!request.auditLogs || request.auditLogs.length === 0) && (
                <li className="text-xs text-gray-500">No logs available.</li>
              )}
            </ul>
          </div>
        </div>

        {request.status === 'PENDING_APPROVAL' && (
          <div className="p-4 border-t bg-gray-50 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver Comment (Optional)</label>
              <textarea
                rows={2}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave a comment..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isProcessing}
                onClick={() => handleAction('APPROVE')}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleAction('REJECT')}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleAction('REQUEST_CHANGES')}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 col-span-2"
              >
                Request Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
