# Academic leadership appointments

Academic Foundation assigns additional duties to active staff in the current school. It preserves their primary membership and Teacher access. Supported appointments are Class Teacher, Assistant Class Teacher, Grade Master, Form Master, Head of Department, Head of Subject, Dean of Academics, Exams Manager, and Timetable Coordinator.

Class Teacher and HOD appointments use their existing canonical records, including their class or department scope. Assistant Class Teachers use the existing Class Teacher dashboard and class-scoped workflows. Grade/Form appointments use the existing Grade Master dashboard. Subject Coordinator, Curriculum Coordinator, and Academic Year Coordinator cannot be newly appointed here; historical records remain intact.

Timetable Coordinator grants timetable management capabilities and access through the existing Teacher dashboard's Timetable & Relief workspace. Personal teaching timetables remain available in that workspace. There is no coordinator dashboard.

Dashboard authorization derives from current, effective appointments and active school membership. API authentication recalculates appointment capabilities so an older session cannot retain revoked timetable access. The existing switcher refreshes after an appointment save, on academic realtime events, and periodically while a school session is open. Removed active roles recover through the existing session refresh to an authorized dashboard.

Appointment mutations save their audit records, outbox events, and assignee notifications transactionally. Exact assignees on other dashboards receive a refresh signal without academic record details. Replacement and ending preserve history and revoke only appointment-derived access; independently granted roles remain valid.

## Release and rollback

Deploy the API on Railway and the web application on Cloudflare through the existing main-branch pipeline. No destructive migration or staff data rewrite is required. Verify API health, the Cloudflare origin smoke checks, and appointment/switcher regression tests. If a regression requires rollback, revert the release commit and redeploy both services; appointment records and history remain durable.

The disposable PostgreSQL appointment suite covers tenant isolation, multiple roles, effective dates, replacement/removal, canonical class/HOD duties, assistant class scopes, timetable capabilities, and rollback when governance fails. Browser tests use controlled gateway responses, so they do not modify a real school's staff.
