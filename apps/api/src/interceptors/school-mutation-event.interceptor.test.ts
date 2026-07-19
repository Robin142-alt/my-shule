import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastValueFrom, of, throwError } from 'rxjs';

import { SchoolMutationEventInterceptor } from './school-mutation-event.interceptor';

const TENANT_ID = '00000000-0000-4000-8000-000000000101';
const USER_ID = '00000000-0000-4000-8000-000000000202';

function createContext(method: string, path: string, body: unknown = undefined) {
  const request = {
    method,
    path,
    url: path,
    originalUrl: path,
    body,
  };

  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

function createRequestContext(overrides: Record<string, unknown> = {}) {
  return {
    getStore: () => ({
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      role: 'teacher',
      is_authenticated: true,
      ...overrides,
    }),
  } as never;
}

test('successful school mutations publish a tenant-bound refresh event without request data', async () => {
  const published: Record<string, any>[] = [];
  const interceptor = new SchoolMutationEventInterceptor(
    createRequestContext(),
    {
      publish: async (input: Record<string, any>) => {
        published.push(input);
        return input;
      },
    } as never,
  );

  const response = await lastValueFrom(interceptor.intercept(
    createContext('POST', '/api/students', { medical_notes: 'must-not-leak' }),
    { handle: () => of({ id: 'student-1' }) } as never,
  ));

  assert.deepEqual(response, { id: 'student-1' });
  assert.equal(published.length, 1);
  assert.equal(published[0]?.event_name, 'school.operation.recorded');
  assert.equal(published[0]?.payload.tenant_id, TENANT_ID);
  assert.equal(published[0]?.payload.school_id, TENANT_ID);
  assert.equal(published[0]?.payload.operation_type, 'POST /students');
  assert.deepEqual(published[0]?.payload.payload, {
    method: 'POST',
    path: '/students',
    system_refresh_only: true,
  });
  assert.equal(JSON.stringify(published[0]).includes('must-not-leak'), false);
});

test('read requests, event routes, and unauthenticated requests do not publish refresh events', async () => {
  let publishCount = 0;
  const publisher = {
    publish: async () => {
      publishCount += 1;
    },
  } as never;

  const authenticated = new SchoolMutationEventInterceptor(createRequestContext(), publisher);
  const unauthenticated = new SchoolMutationEventInterceptor(
    createRequestContext({ is_authenticated: false }),
    publisher,
  );

  await lastValueFrom(authenticated.intercept(
    createContext('GET', '/api/students'),
    { handle: () => of([]) } as never,
  ));
  await lastValueFrom(authenticated.intercept(
    createContext('POST', '/api/events/dispatch'),
    { handle: () => of({ ok: true }) } as never,
  ));
  await lastValueFrom(unauthenticated.intercept(
    createContext('POST', '/api/students'),
    { handle: () => of({ ok: true }) } as never,
  ));

  assert.equal(publishCount, 0);
});

test('a failed event write cannot turn a completed school mutation into a false 500', async () => {
  const interceptor = new SchoolMutationEventInterceptor(
    createRequestContext(),
    { publish: async () => Promise.reject(new Error('outbox unavailable')) } as never,
  );
  (interceptor as any).logger = { error: () => undefined };

  const response = await lastValueFrom(interceptor.intercept(
    createContext('PATCH', '/api/classes/class-1'),
    { handle: () => of({ updated: true }) } as never,
  ));
  assert.deepEqual(response, { updated: true });

  await assert.rejects(
    () => lastValueFrom(interceptor.intercept(
      createContext('PATCH', '/api/classes/class-1'),
      { handle: () => throwError(() => new Error('mutation failed')) } as never,
    )),
    /mutation failed/,
  );
});
