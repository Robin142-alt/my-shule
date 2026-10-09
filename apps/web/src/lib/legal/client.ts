import { authFetch } from '@/lib/auth/auth-fetch';
import { getCsrfToken } from '@/lib/auth/csrf-client';
export async function legalRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await authFetch(`/api/legal/${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'x-myshule-csrf': await getCsrfToken() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to review your agreements.' : json?.message || 'Your agreements could not be saved. Please retry.');
  return json?.data ?? json;
}
