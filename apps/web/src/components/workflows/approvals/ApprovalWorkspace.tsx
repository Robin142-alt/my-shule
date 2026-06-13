'use client';

import { useState, useEffect } from 'react';
import { ApprovalRequest, ApprovalsApi } from '@/lib/client/approvals-api';
import { ApprovalDetailDrawer } from './ApprovalDetailDrawer';

export function ApprovalWorkspace() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'MY_REQUESTS'>('PENDING');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'PENDING') {
        const data = await ApprovalsApi.getPendingRequests();
        setRequests(data);
      } else {
        const data = await ApprovalsApi.getMyRequests();
        setRequests(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Approvals Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and review pending system actions governed by AGP.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 px-4">
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'PENDING'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('PENDING')}
        >
          Pending Review
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'MY_REQUESTS'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('MY_REQUESTS')}
        >
          My Requests
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div 
                key={req.id} 
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center"
                onClick={() => setSelectedRequest(req)}
              >
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                      {req.module}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-600 font-medium">
                      {req.action}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500 line-clamp-1">
                    {req.reason || 'No reason provided'}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    req.status === 'CHANGES_REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'PENDING_APPROVAL' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {req.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ApprovalDetailDrawer 
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onProcessed={fetchRequests}
      />
    </div>
  );
}
