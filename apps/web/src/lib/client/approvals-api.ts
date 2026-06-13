export interface ApprovalRequest {
  id: string;
  module: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  requestedByUserId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'ESCALATED';
  reason?: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
  updatedAt: string;
  auditLogs?: any[];
}

export const ApprovalsApi = {
  async getPendingRequests(): Promise<ApprovalRequest[]> {
    const res = await fetch('/api/approvals/pending');
    if (!res.ok) throw new Error('Failed to fetch pending approvals');
    const data = await res.json();
    return data.data;
  },

  async getMyRequests(): Promise<ApprovalRequest[]> {
    const res = await fetch('/api/approvals/my-requests');
    if (!res.ok) throw new Error('Failed to fetch my requests');
    const data = await res.json();
    return data.data;
  },

  async processAction(id: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'ESCALATE', comment?: string): Promise<ApprovalRequest> {
    const res = await fetch(`/api/approvals/${id}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment })
    });
    if (!res.ok) throw new Error(`Failed to process action ${action}`);
    const data = await res.json();
    return data.data;
  }
};
