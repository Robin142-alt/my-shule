// Local routing and API fixtures shared by compiled-dashboard browser audits.
export const roleKeys = 'principal,deputy-principal,teacher,accountant,bursar,dean-academics,exams-manager,hod,hos,class-teacher,grade-master,admissions,secretary,librarian,storekeeper,nurse,guidance-counselling,discipline-master,laboratory-technician,ict-manager,security-officer,transport-manager,boarding-master,procurement-officer,admin,student,portal-parent,portal-student,superadmin,system-monitor'.split(',');
const modules = ['principal_dashboard','students','admissions','academics','exams','attendance','finance','reports','library','health','clinic','discipline','counselling','transport','boarding','inventory','laboratory','security','communication','parent_portal','student_portal','staff','timetable','documents','notifications','analytics','offline_sync','system_monitoring'];
function roleContext(role) {
  return { primaryRole: role, activeRole: role, primaryAuthorizationRoleCode: role, activeAuthorizationRoleCode: role, assignedRoles: [role], assignedAuthorizationRoleCodes: [role], availableRoles: [{ roleCode: role, authorizationRoleCode: role, roleName: role, isPrimary: true, isTeacherMode: false, sources: ['primary_membership'] }], teacherDashboardEligible: false };
}
export async function fixture(context, key, base) {
  const portal = key.startsWith('portal-'); const role = portal ? key.slice(7) : key;
  const audience = portal ? 'portal' : ['superadmin','system-monitor'].includes(role) ? 'superadmin' : 'school';
  const home = portal ? `/portal/${role}` : audience === 'superadmin' ? `/${role}` : `/school/${role}`;
  const user = { user_id: 'navigation-test', tenant_id: 'navigation-school', role, display_name: 'Navigation Test', email: 'test@example.test', session_id: 'test-session', permissions: ['*:*'] };
  const session = { audience, tenantSlug: user.tenant_id, userLabel: user.display_name, user, role, viewer: role, roleContext: roleContext(role), homePath: home, redirectTo: home };
  // Routing-only cookies select the server route. Client authentication is
  // independently verified by the mocked gateway, with no real credentials.
  await context.addCookies([{ name: `myshule.${audience}.session`, value: encodeURIComponent(JSON.stringify({ experience: audience, role, viewer: role, tenantSlug: user.tenant_id, userLabel: user.display_name, homePath: home })), url: base }]);
  const calls = { auth: 0, legal: 0, data: 0 };
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if ((path === '/api/legal/access' || path === '/api/legal/status')) { calls.legal++; await new Promise(r => setTimeout(r,250)); return route.fulfill({ json: { ready: true, user_id: user.user_id, school_id: user.tenant_id } }); }
    if (path === '/api/auth/me') { calls.auth++; return route.fulfill({ json: { session, user } }); }
    if (path === '/api/permissions/me') return route.fulfill({ json: { data: ['*:*'] } });
    if (path === '/api/school/modules/me') return route.fulfill({ json: modules });
    calls.data++;
    await new Promise(r => setTimeout(r, Number(process.env.NAVIGATION_DATA_DELAY_MS || 350)));
    return route.fulfill({ status: 503, json: { message: 'Controlled test: data service unavailable' } });
  });
  return { home, calls };
}
