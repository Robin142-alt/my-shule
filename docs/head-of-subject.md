# Head of Subject

The school account role is `head_of_subject`; its dashboard is `/school/hos`.

## School workflow

1. In **Staff & Roles**, invite the staff member as **Head of Subject**. For an existing member, change their account role using the same staff management controls.
2. Once the invitation is accepted, open **Manage subject appointments**. Select the active staff member, subject, appointment type and effective dates. Save the appointment through the existing academic role workflow.
3. The member signs in to **Subject Analytics**. **My Subject Appointments** shows their active, scheduled, expired and ended responsibilities. Results require an active subject appointment and school membership.
4. Use the dashboard switcher for teaching duties. Teacher permissions and assigned classes/subjects continue to govern marks, attendance and other teaching actions.

Subject analysis supports filters, learner support interventions, report preview, PDF download and printing. Changing or ending an appointment changes subject access through the existing appointment resolver. A new staff role alone does not expose subject results.

## Authorization and persistence

- Invitation creation, acceptance, staff projection and account role management reuse the school invitation and authorization services.
- `exams:subject-analytics` grants the dedicated subject analytics and report endpoints. Both force subject scope on the server, even if a request asks for school scope.
- General exam reads, school broadsheets, marks entry and report publishing are not granted to the Head of Subject role.
- Subject interventions validate the learner and subject against the current appointment before persistence, audit and event/notification handling.
- Appointment reads bind the authenticated user and tenant, use tenant-scoped joins and require active membership.
- Existing academic appointment changes retain their validation, audit and event behavior. Existing schema bootstrap provisions the role and permission catalog; no separate data migration or school seed is required.

## Verification

Unit tests cover invitation catalogs, guard authorization, forced report scope, authenticated appointment lookup and subject intervention events. Disposable PostgreSQL tests cover invitation acceptance, staff activation, login, dashboard switching, tenant mismatch, token reuse, RLS and appointment dates. Frontend tests cover invitations, routes, subject filters, appointments and printing.

After a web build, run `node apps/web/tests/design/head-of-subject-browser.mjs` for phone and desktop browser checks. It uses isolated fixtures and writes screenshots and sample PDFs under `output/head-of-subject-browser`; it makes no production requests.
