import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MPesaReconciliationWorkspace } from '@/components/school/accountant/m-pesa-reconciliation-workspace';

jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
jest.mock('@/lib/auth/csrf-client', () => ({ getCsrfToken: async () => 'test-csrf' }));
jest.mock('@/components/school/school-pages', () => ({ mpesaC2bStatusTone: { verified_unmatched: 'warning' } }));
jest.mock('@/components/common/learner-picker', () => ({ LearnerPicker: ({ onChange }: { onChange: (learner: unknown) => void }) => <button onClick={() => onChange({ id: 'learner-1', name: 'Test Learner' })}>Choose learner</button> }));

it('offers only verified unmatched deposits and posts the selected learner with CSRF and school scope', async () => {
  const originalFetch = global.fetch;
  let matched = false;
  const payment = { id: 'deposit-1', trans_id: 'VERIFIED-1', amount_minor: '12500', status: 'verified_unmatched', received_at: '2026-10-01T10:00:00Z' };
  const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      expect(String(url)).toContain('/deposit-1/reconcile?tenant_slug=school-a');
      expect(init.headers).toMatchObject({ 'x-myshule-csrf': 'test-csrf' });
      expect(JSON.parse(String(init.body))).toEqual({ student_id: 'learner-1' });
      matched = true;
      return { ok: true, json: async () => ({ data: { ...payment, status: 'matched' } }) } as Response;
    }
    return { ok: true, json: async () => ({ data: matched ? [] : [payment] }) } as Response;
  });
  global.fetch = fetchMock;
  try {
    render(<MPesaReconciliationWorkspace role="accountant" tenantSlug="school-a" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=verified_unmatched&limit=50&offset=0&tenant_slug=school-a'), expect.anything()));
    expect(screen.getByRole('button', { name: 'Reconcile' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose learner' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reconcile' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    await screen.findByText('VERIFIED-1 reconciled and posted to the fee ledger.');
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  } finally { global.fetch = originalFetch; }
});
