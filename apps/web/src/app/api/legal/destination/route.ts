import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/auth/server-auth-client';
import { readAudienceCookie } from '@/lib/auth/server-session';
import { isExperienceAudience } from '@/lib/auth/experience-audience';
export async function GET(request: Request) {
  const jar = await cookies(); const audience = readAudienceCookie(jar);
  if (!isExperienceAudience(audience)) return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 });
  try { const session = await createServerAuthClient(request).me(audience, jar); return NextResponse.json({ path: session.homePath }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ message: 'Unable to resolve your dashboard.' }, { status: 401 }); }
}
