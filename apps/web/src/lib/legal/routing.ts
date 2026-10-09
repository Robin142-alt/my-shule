import { getSchoolRoleAlias, isSchoolExperienceRole } from '@/lib/auth/school-role-normalization';
const publicPaths = new Set(['/', '/app', '/school-portal', '/support/status', '/login', '/forgot-password', '/reset-password', '/new-password', '/magic-link', '/mfa', '/otp', '/verify-code', '/verify-email', '/device-verification', '/tenant-selection', '/session-expired', '/account-locked', '/access-denied', '/unauthorized', '/forbidden', '/maintenance', '/offline']);
export function isLegalProtectedPath(path: string): boolean {
  if (path === '/parent-portal') return false;
  if (publicPaths.has(path) || path.startsWith('/api/') || path === '/legal' || path.startsWith('/legal/') || path.startsWith('/legal-assets/') || path === '/privacy' || path === '/terms' || path.startsWith('/invite/') || path.startsWith('/_next/')) return false;
  if (/\/(login|forgot-password|reset-password|new-password|invite|accept-invite)(\/|$)/.test(path)) return false;
  const schoolSlug = path.match(/^\/school\/([^/]+)$/)?.[1];
  if (schoolSlug && !isSchoolExperienceRole(schoolSlug) && !getSchoolRoleAlias(schoolSlug)) return false;
  return true;
}
