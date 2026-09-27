# Head of Subject

The school account role is `head_of_subject`; its dashboard is `/school/hos`.

## School workflow

1. In **Academic Foundation → Subjects & Departments → Assign or change HOS**, select **Subject** and **Head of Subject**, then save. Any active school staff member can hold this responsibility, including staff whose primary role is not a teaching role.
2. This creates a school-wide subject appointment effective immediately. The member automatically gains the HOS dashboard and its permissions alongside their existing role. Their primary membership and any explicitly assigned roles remain unchanged. **Roles & Curriculum** retains the existing advanced appointment workflow for dates, appointment types and narrower scopes.
3. The member opens **Subject Analytics** from the dashboard switcher. **My Subject Appointments** shows their active, scheduled, expired and ended responsibilities. Results require an active subject appointment and school membership.
4. Use the dashboard switcher for teaching duties. Teacher permissions and assigned classes/subjects continue to govern marks, attendance and other teaching actions.

Subject analysis supports filters, learner support interventions, report preview, PDF download and printing. Changing or ending an appointment changes subject access through the existing appointment resolver. A new staff role alone does not expose subject results.

## Authorization and persistence

- Invitation creation, acceptance, staff projection and account role management reuse the school invitation and authorization services.
- `exams:subject-analytics` grants the dedicated subject analytics and report endpoints. Both force subject scope on the server, even if a request asks for school scope.
- General exam reads, school broadsheets, marks entry and report publishing are not granted to the Head of Subject role.
- Subject interventions validate the learner and subject against the current appointment before persistence, audit and event/notification handling.
- Appointment reads bind the authenticated user and tenant, use tenant-scoped joins and require active membership.
- `POST /academics/subject-heads` requires `academics:assign-teachers` and accepts only `subject_id` and `teacher_user_id`. Subject and staff validation remains school-scoped. Appointment replacement, audit, event and in-app notifications commit together; a scope-specific transaction lock serializes concurrent replacements.
- Dashboard access is derived from live subject appointments rather than changing the member's primary role. Ending or replacing their last active subject appointment removes this derived access; explicit role assignments remain intact. The analytics resolver continues to enforce subject and any advanced appointment scopes.
- Existing academic appointment changes retain their validation, audit and event behavior. Existing schema bootstrap provisions the role and permission catalog; no separate data migration or school seed is required.

## Verification

Unit tests cover invitation catalogs, guard authorization, forced report scope, authenticated appointment lookup and subject intervention events. Disposable PostgreSQL tests cover invitation acceptance, staff activation, login, dashboard switching, tenant mismatch, token reuse, RLS and appointment dates. Frontend tests cover invitations, routes, subject filters, appointments and printing.

After a web build, run `node apps/web/tests/design/head-of-subject-browser.mjs` for phone and desktop browser checks. It uses isolated fixtures and writes screenshots and sample PDFs under `output/head-of-subject-browser`; it makes no production requests.
