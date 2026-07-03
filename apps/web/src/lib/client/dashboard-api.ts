const API_BASE_URL = '/api'; // Adjust if needed

async function fetchWithTenant(url: string, options: RequestInit = {}) {
  // In a real app, this tenantId would be retrieved from auth state/context
  const tenantId = localStorage.getItem('tenantId') || '';
  const token = localStorage.getItem('token') || '';
  const method = (options.method ?? 'GET').toUpperCase();

  if (!tenantId && !token && method === 'GET' && isPassiveDashboardRead(url)) {
    return [];
  }

  const headers = new Headers(options.headers || {});
  if (tenantId) headers.set('x-tenant-id', tenantId);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response || typeof response.ok !== 'boolean') {
    throw new Error('Dashboard API did not return a valid response.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'API Request Failed');
  }

  return response.json();
}

function isPassiveDashboardRead(url: string) {
  return url === '/tasks'
    || url === '/approvals'
    || url === '/notifications'
    || url.startsWith('/dashboard/feed')
    || url.startsWith('/dashboard/summary');
}

export const DashboardApi = {
  // Feed
  getFeed: (role: string, limit = 20, offset = 0) => 
    fetchWithTenant(`/dashboard/feed?role=${role}&limit=${limit}&offset=${offset}`),
  
  getSummary: (role: string) => 
    fetchWithTenant(`/dashboard/summary?role=${role}`),

  // Notifications
  getNotifications: () => fetchWithTenant('/notifications'),
  markNotificationRead: (id: string) => fetchWithTenant(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Tasks
  getTasks: () => fetchWithTenant('/tasks'),
  createTask: (data: any) => fetchWithTenant('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  completeTask: (id: string) => fetchWithTenant(`/tasks/${id}/complete`, { method: 'PATCH' }),
  assignTask: (id: string, userId: string) => fetchWithTenant(`/tasks/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ userId }) }),

  // Approvals
  getApprovals: () => fetchWithTenant('/approvals'),
  createApproval: (data: any) => fetchWithTenant('/approvals', { method: 'POST', body: JSON.stringify(data) }),
  approveRequest: (id: string, userId: string, comment?: string) => 
    fetchWithTenant(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ userId, comment }) }),
  rejectRequest: (id: string, userId: string, reason?: string) => 
    fetchWithTenant(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ userId, reason }) }),

  // Workflow Events
  createEvent: (data: any) => fetchWithTenant('/workflow/events', { method: 'POST', body: JSON.stringify(data) }),
};
