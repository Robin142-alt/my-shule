import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { readAudienceCookie } from '@/lib/auth/server-session';
import { isExperienceAudience } from '@/lib/auth/experience-audience';
import { proxySchoolApiRequest } from '@/lib/dashboard/server-api-proxy';

type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: NextRequest, context: Context) {
  const audience = readAudienceCookie(await cookies());
  if (!isExperienceAudience(audience)) return NextResponse.json({ message: 'Sign in to review your agreements.' }, { status: 401 });
  const path = (await context.params).path.join('/');
  const allowed = request.method === 'GET' ? ['status','verification/candidates'].includes(path) : ['accept','guardian/authorise','guardian/withdraw','verification'].includes(path) || /^verification\/[0-9a-f-]{36}\/revoke$/i.test(path);
  if (!allowed) return NextResponse.json({ message: 'Legal endpoint not found.' }, { status: 404 });
  const response = await proxySchoolApiRequest(request, context, '/legal', { audience });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const GET = proxy;
export const POST = proxy;
