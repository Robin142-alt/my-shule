import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LegalGate } from '@/components/legal/legal-gate';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';

let mockPathname = '/school/teacher';
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: () => mockPathname,
}));
jest.mock('@/lib/legal/client', () => ({ legalRequest: jest.fn() }));
jest.mock('@/components/legal/legal-acceptance', () => ({
  LegalAcceptance: ({ status }: { status: LegalStatus }) => <h1>Agreements for {status.display_name}</h1>,
}));
const request = jest.mocked(legalRequest);
const pending = { ready: false, user_id: 'test', school_id: 'school', display_name: 'Amina' } as LegalStatus;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { request.mockReset(); mockPathname = '/school/teacher'; });

test('shows the branded loader immediately and keeps protected content closed until verified', async () => {
  const check = deferred<{ ready: boolean }>();
  request.mockReturnValueOnce(check.promise);
  render(<LegalGate><p>Private dashboard</p></LegalGate>);
  expect(screen.getByRole('status', { name: 'Loading MyShule' })).toBeVisible();
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  await act(async () => check.resolve({ ready: true }));
  expect(await screen.findByText('Private dashboard')).toBeVisible();
  expect(request.mock.calls.map(([path]) => path)).toEqual(['access']);
});

test('Strict Mode, focus and visibility overlap share one in-flight check without cached approval', async () => {
  const check = deferred<{ ready: boolean }>();
  request.mockReturnValue(check.promise);
  render(<StrictMode><LegalGate><p>Private dashboard</p></LegalGate></StrictMode>);
  fireEvent.focus(window);
  fireEvent(document, new Event('visibilitychange'));
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => check.resolve({ ready: true }));
  await screen.findByText('Private dashboard');
  request.mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(pending);
  fireEvent.focus(window);
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  expect(await screen.findByText('Agreements for Amina')).toBeVisible();
  expect(request.mock.calls.map(([path]) => path)).toEqual(['access', 'access', 'status']);
});

test('review goes directly to detailed status and failure remains recoverable', async () => {
  mockPathname = '/legal/accept';
  request.mockRejectedValueOnce(new Error('Connection unavailable')).mockResolvedValueOnce(pending);
  render(<LegalGate review />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Agreements for Amina')).toBeVisible();
  expect(request.mock.calls.map(([path]) => path)).toEqual(['status', 'status']);
});

test('a new route cannot use a delayed positive response from the previous route', async () => {
  const previous = deferred<{ ready: boolean }>();
  request.mockReturnValueOnce(previous.promise).mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(pending);
  const view = render(<LegalGate><p>Private dashboard</p></LegalGate>);
  mockPathname = '/school/principal';
  view.rerender(<LegalGate><p>Private dashboard</p></LegalGate>);
  await screen.findByText('Agreements for Amina');
  await act(async () => previous.resolve({ ready: true }));
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
});

test('a legal-required event supersedes an older in-flight approval', async () => {
  const old = deferred<{ ready: boolean }>();
  request.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(pending);
  render(<LegalGate><p>Private dashboard</p></LegalGate>);
  fireEvent(window, new Event('myshule-legal-required'));
  await screen.findByText('Agreements for Amina');
  await act(async () => old.resolve({ ready: true }));
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
});

test('leaving for a public page and returning never revives old state or an in-flight check', async () => {
  const old = deferred<{ ready: boolean }>();
  request.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(pending);
  const view = render(<LegalGate><p>Private dashboard</p></LegalGate>);
  mockPathname = '/school/login';
  view.rerender(<LegalGate><p>Sign-in page</p></LegalGate>);
  mockPathname = '/school/teacher';
  view.rerender(<LegalGate><p>Private dashboard</p></LegalGate>);
  expect(screen.getByRole('status', { name: 'Loading MyShule' })).toBeVisible();
  await screen.findByText('Agreements for Amina');
  await act(async () => old.resolve({ ready: true }));
  expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  expect(request.mock.calls.map(([path]) => path)).toEqual(['access', 'access', 'status']);
});

test('a completed approval cannot flash protected children when returning from a public page', async () => {
  let renders = 0;
  function Dashboard() { renders++; return <p>Private dashboard</p>; }
  request.mockResolvedValueOnce({ ready: true });
  const view = render(<LegalGate><Dashboard /></LegalGate>);
  await screen.findByText('Private dashboard');
  const verifiedRenders = renders;
  mockPathname = '/school/login';
  view.rerender(<LegalGate><p>Sign-in page</p></LegalGate>);
  const fresh = deferred<{ ready: boolean }>();
  request.mockReturnValueOnce(fresh.promise).mockResolvedValueOnce(pending);
  mockPathname = '/school/teacher';
  view.rerender(<LegalGate><Dashboard /></LegalGate>);
  expect(renders).toBe(verifiedRenders);
  expect(screen.getByRole('status', { name: 'Loading MyShule' })).toBeVisible();
  await act(async () => fresh.resolve({ ready: false }));
  await screen.findByText('Agreements for Amina');
  expect(renders).toBe(verifiedRenders);
});
