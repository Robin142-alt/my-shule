/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/legal/[...path]/route';

let mockSignedIn = true;
jest.mock('next/headers', () => ({ cookies: async () => ({}) }));
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  readAudienceCookie: () => 'school',
  readExperienceSessionCookie: () => mockSignedIn ? { tenantSlug: 'school-a', role: 'teacher' } : null,
  readAccessCookie: () => mockSignedIn ? 'fixture-access-token' : null,
  readRefreshCookie: () => null,
  readTenantCookie: () => 'school-a',
}));
jest.mock('@/lib/dashboard/api-client', () => ({ getDashboardApiBaseUrl: () => 'https://api.example.invalid' }));
const originalFetch = global.fetch;
beforeEach(() => { mockSignedIn = true; global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });
const request = (query = '') => new NextRequest(`https://school.example.invalid/api/legal/access${query}`, {
  headers: { Authorization: 'Bearer browser-forged-token', 'x-tenant-id': 'school-b' },
});
const context = { params: Promise.resolve({ path: ['access'] }) };

test('the compact access check uses the same authenticated, tenant-scoped no-store proxy', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({ data: { ready: true } }));
  const response = await GET(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: { ready: true } });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('https://api.example.invalid/legal/access', expect.objectContaining({
    cache: 'no-store', headers: expect.objectContaining({ Authorization: 'Bearer fixture-access-token', 'x-tenant-id': 'school-a', 'x-auth-audience': 'school' }),
  }));
});
test('signed-out and mismatched-school requests never reach the backend', async () => {
  expect((await GET(request('?tenantSlug=school-b'), context)).status).toBe(403);
  mockSignedIn = false;
  expect((await GET(request(), context)).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
test('backend permission denial is preserved', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({ message: 'Membership inactive' }, { status: 403 }));
  const response = await GET(request(), context);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ message: 'Membership inactive' });
});
