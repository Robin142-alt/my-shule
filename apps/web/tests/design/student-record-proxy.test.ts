/** @jest-environment node */
import { NextRequest } from 'next/server';
import * as route from '@/app/api/students/[...path]/route';

let mockSignedIn = true;
jest.mock('next/headers', () => ({ cookies: async () => ({}) }));
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  readExperienceSessionCookie: () => mockSignedIn ? { tenantSlug: 'school-a', role: 'admissions' } : null,
  readAccessCookie: () => mockSignedIn ? 'fixture-access-token' : null,
  readRefreshCookie: () => null,
  readTenantCookie: () => 'school-a',
}));
jest.mock('@/lib/dashboard/api-client', () => ({ getDashboardApiBaseUrl: () => 'https://api.example.invalid' }));
const originalFetch = global.fetch;
const body = { expected_updated_at: '2026-10-19 12:00:00+00', reason: 'Correct student name', first_name: 'Updated' };
const context = { params: Promise.resolve({ path: ['student-1', 'record'] }) };
const request = (csrf = true, query = '') => new NextRequest(`https://school.example.invalid/api/students/student-1/record${query}`, {
  method: 'PATCH', body: JSON.stringify(body), headers: {
    'content-type': 'application/json', origin: 'https://school.example.invalid',
    cookie: 'myshule.csrf=fixture-csrf; myshule_audience=school',
    ...(csrf ? { 'x-myshule-csrf': 'fixture-csrf' } : {}),
    authorization: 'Bearer browser-forged-token', 'x-tenant-id': 'school-b',
  },
});
const patch = () => {
  const handler = (route as typeof route & { PATCH?: typeof route.POST }).PATCH;
  if (!handler) throw new Error('Student browser route does not support PATCH saves');
  return handler;
};
beforeEach(() => { mockSignedIn = true; global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });

test('student saves reach the backend through the real browser route and authenticated school proxy', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({ data: { student: { id: 'student-1', first_name: 'Updated' } } }));
  const response = await patch()(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: { student: { id: 'student-1', first_name: 'Updated' } } });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = jest.mocked(fetch).mock.calls[0];
  expect(url).toBe('https://api.example.invalid/students/student-1/record');
  expect(init).toMatchObject({ method: 'PATCH', cache: 'no-store', headers: {
    Authorization: 'Bearer fixture-access-token', 'x-tenant-id': 'school-a', 'x-auth-audience': 'school',
  } });
  expect(JSON.parse(new TextDecoder().decode(init?.body as ArrayBuffer))).toEqual(body);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('student PATCH saves retain CSRF, signed-in session and school isolation checks', async () => {
  expect((await patch()(request(false), context)).status).toBe(403);
  expect((await patch()(request(true, '?tenantSlug=school-b'), context)).status).toBe(403);
  mockSignedIn = false;
  expect((await patch()(request(), context)).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});

test('validation and stale-edit responses reach the editor without a false success', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({ message: 'Reload the student before saving again.' }, { status: 409 }));
  const response = await patch()(request(), context);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ message: 'Reload the student before saving again.' });
});
