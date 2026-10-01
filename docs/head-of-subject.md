# Head of Subject

The school account role is `head_of_subject`; its dashboard is `/school/hos`.

The [editable desktop and mobile Figma design](https://www.figma.com/design/ZnkIyHmocVZ5My9IVhHDiT?node-id=5-143) uses illustrative sample data. The application reads the authorized school records described below.

## School workflow

1. In **Academic Foundation → Subjects & Departments → Assign or change HOS**, select **Subject** and **Head of Subject**, then save. Any active school staff member can hold this responsibility, including staff whose primary role is not a teaching role.
2. This creates a school-wide subject appointment effective immediately. The member automatically gains the HOS dashboard and its permissions alongside their existing role. Their primary membership and any explicitly assigned roles remain unchanged. **Roles & Curriculum** retains the existing advanced appointment workflow for dates, appointment types and narrower scopes.
3. The member opens **Subject Analytics** from the dashboard switcher. **My Subject Appointments** shows their active, scheduled, expired and ended responsibilities. Results require an active subject appointment and school membership.
4. Use the dashboard switcher for teaching duties. Teacher permissions and assigned classes/subjects continue to govern marks, attendance and other teaching actions.

Subject analysis supports filters, learner support interventions, report preview, PDF download and printing. Changing or ending an appointment changes subject access through the existing appointment resolver. A new staff role alone does not expose subject results.

The HOS dashboard uses the shared school header, notification bell, navy sidebar and mobile workspace drawer. Its grouped menu opens twelve distinct views: overview, appointments, performance, comparisons, trends, learners, learners at risk, interventions, exam analysis, results readiness, result insights and reports. Menu entries, role navigation and route handling share `hos-workspaces.ts`. Direct links and browser Back select the matching workspace; analytics selections persist between analytics views and learner pagination resets when changing views.

Subject selection is available beside the year, term and exam filters. The at-risk workspace sends its default risk filter to the backend. Active appointments can open analytics for their subject; appointment search includes class, stream and year, with a separate status filter. Subject Reports provides five preview choices using the existing restricted report endpoint. Readiness and analysis are read-only; publishing and marks entry remain governed by teaching and exam roles.

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

Run `node apps/web/tests/design/head-of-subject-browser.mjs` for checks at 320, 390, 768, 1024 and 1440 pixels. It compiles the current application CSS and exercises all menu views, the mobile drawer, browser Back, subject selection, empty/error/loading states, preview, PDF download and printing. It uses isolated fixtures and writes screenshots and sample PDFs under `output/head-of-subject-browser`; it makes no production requests. Set `HOS_QA_SERVE=1` to leave the fixture preview running on port 4318 after verification.
