import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE, AUDIENCE_COOKIE, REFRESH_COOKIE, TENANT_COOKIE } from '@/lib/auth/session-cookies';
import { getDashboardApiBaseUrl } from '@/lib/dashboard/api-client';
import { isLegalProtectedPath } from './routing';

export async function requiresLegalReview(request: NextRequest, rewrittenPath?: string) {
  if (!isLegalProtectedPath(rewrittenPath ?? request.nextUrl.pathname)) return false;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access && !request.cookies.get(REFRESH_COOKIE)?.value) return false; // Existing authentication owns signed-out routing.
  const tenant = request.cookies.get(TENANT_COOKIE)?.value;
  const audience = request.cookies.get(AUDIENCE_COOKIE)?.value;
  const base = getDashboardApiBaseUrl(tenant);
  if (!base || !access || !['school','portal','superadmin'].includes(audience ?? '')) return true;
  try {
    const response = await fetch(`${base}/legal/access`, {
      headers: { Authorization: `Bearer ${access}`, 'x-auth-audience': audience!, ...(tenant ? { 'x-tenant-id': tenant } : {}) },
      cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return true;
    const payload = await response.json();
    return (payload?.data ?? payload)?.ready !== true;
  } catch { return true; }
}
