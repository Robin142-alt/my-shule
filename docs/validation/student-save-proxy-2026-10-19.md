# Student save proxy and admissions profile shell

The production browser route returned HTTP 405 for `PATCH /api/students/:id/record`: its Next route exported GET and POST only. The backend PATCH contract already existed. Student profiles also bypassed the role command center and fell back to the older generic ERP shell.

The browser route now forwards PATCH through the existing authenticated, tenant-scoped, CSRF-protected proxy. Admissions student profiles render inside the current admissions command center, keep Admission Records selected, and use the current public/hosted links for records and guardians. Other roles retain their existing routing.

Verification:

- 21 focused tests pass across the real student proxy, actual SchoolPages routing, and student editor. Proxy coverage includes the forwarded body/method, server-owned session and tenant headers, CSRF/session/tenant rejection, and a truthful stale-edit response.
- The routing regression renders SchoolPages with a student ID, verifies the current admissions header and selected navigation, rejects old shell placeholders, and saves using the real browser data hooks.
- The compiled Cloudflare smoke suite now sends an unsigned PATCH to a synthetic student ID. It must return CSRF rejection (403), proving method registration without changing any production student. The same smoke runs against the preview Worker and deployed production URLs.
- Before this fix, that safe request to the production domain returned 405.

These focused regressions do not claim an authenticated production student was edited. Existing PostgreSQL workflow tests cover durable updates, tenant isolation, events/audit, parent contact and academic placement propagation; this repair restores the missing browser transport and current admissions shell.
