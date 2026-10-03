# School staff appointments

Academic Foundation assigns additional duties to active staff in the current school. It preserves their primary membership and Teacher access. The selector is sourced from the backend's school staff role catalogue: Principal, Deputy Principal, Secretary, Bursar, Accountant, Teacher, Class Teacher, Grade Master, HOD, HOS, Dean of Academics, Exams Manager, Nurse, Clinic Staff, School Counsellor, Discipline Master, Librarian, Storekeeper, Boarding Master, Security Officer, Transport Manager, Laboratory Technician, Admissions Officer, ICT Manager, Owner, Administrator and Staff. Assistant Class Teacher, Form Master and Timetable Coordinator remain additional appointment types. Platform roles, Parent and Student are excluded.

Non-academic staff responsibilities permit multiple holders; assigning another nurse or teacher does not revoke existing holders. Ending an appointment only removes that holder's derived entitlement. The current academic posts retain their one-holder-per-scope replacement behavior.

General staff appointments require school staff-management authority. Deputy Principals cannot grant or remove Principal, Deputy Principal, Owner or Administrator appointments. Owner/Administrator appointments additionally require role-administration capability. All options remain visible with an explicit restriction when the current actor cannot manage them; the backend enforces the same policy on creation and removal. Existing primary membership, onboarding, MFA, module restrictions and dashboard permissions continue to apply.

Class Teacher and HOD appointments use their existing canonical records, including their class or department scope. Assistant Class Teachers use the existing Class Teacher dashboard and class-scoped workflows. Grade/Form appointments use the existing Grade Master dashboard. Subject Coordinator, Curriculum Coordinator, and Academic Year Coordinator cannot be newly appointed here; historical records remain intact.

Timetable Coordinator grants timetable management capabilities and access through the existing Teacher dashboard's Timetable & Relief workspace. Personal teaching timetables remain available in that workspace. There is no coordinator dashboard.

Dashboard authorization derives from current, effective appointments and active school membership. API authentication recalculates appointment capabilities so an older session cannot retain revoked timetable access. The existing switcher refreshes after an appointment save, on academic realtime events, and periodically while a school session is open. Removed active roles recover through the existing session refresh to an authorized dashboard.

Appointment mutations save their audit records, outbox events, and assignee notifications transactionally. Exact assignees on other dashboards receive a refresh signal without academic record details. Replacement and ending preserve history and revoke only appointment-derived access; independently granted roles remain valid.

## Release and rollback

Deploy the API on Railway and the web application on Cloudflare through the existing main-branch pipeline. Schema bootstrap replaces the appointment uniqueness index with one that includes the holder for general staff roles. It preserves existing appointment rows and scoped academic uniqueness. Verify API health, the Cloudflare origin smoke checks, and appointment/switcher regression tests. If a regression requires rollback, roll back the frontend first; before rolling back the API uniqueness change, reconcile any staff roles with multiple holders, since the earlier index permits only one. Keep the API version serving the expanded catalogue until this is resolved; appointment records and history remain durable.

The disposable PostgreSQL appointment suite covers tenant isolation, multiple roles, effective dates, replacement/removal, canonical class/HOD duties, assistant class scopes, timetable capabilities, and rollback when governance fails. Browser tests use controlled gateway responses, so they do not modify a real school's staff.
