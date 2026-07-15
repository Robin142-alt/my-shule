# Manual Gmail Verification Scripts

Generated: 2026-07-15T14:15:35.951Z

Status: NOT_YET_MANUALLY_VERIFIED

Use these scripts with real Gmail inboxes and production/staging credentials. Mark a script passed only after the email, link, route, dashboard, data persistence, audit entry, and cross-school isolation expectations are confirmed.

## School Creation And Principal Activation

- Script ID: MGV-01
- Primary actor: Super Admin
- Expected outcome: A clean school is created, the first principal receives an invite, accepts it, and lands on that school's activation checklist.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Staff Invitation And Acceptance

- Script ID: MGV-02
- Primary actor: Principal
- Expected outcome: A school-scoped staff invite is delivered, accepted once, and routes the new staff member to the correct role dashboard.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Admissions To Student Activation

- Script ID: MGV-03
- Primary actor: Admissions Officer
- Expected outcome: An applicant moves through inquiry, application, acceptance, admission, class placement, parent linking, and active student status.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Academic Setup, Subjects, Classes, And Streams

- Script ID: MGV-04
- Primary actor: Deputy Principal
- Expected outcome: The school defines terms, classes/forms/grades, streams, subjects, departments, and teacher assignments used by admissions and exams.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Fees, Invoicing, Receipts, And Parent Balances

- Script ID: MGV-05
- Primary actor: Accountant
- Expected outcome: Fee structures generate invoices, payments allocate correctly, receipts preview/download, and balances appear in parent and principal views.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Attendance Register And Absence Notification

- Script ID: MGV-06
- Primary actor: Teacher
- Expected outcome: A class register is marked, absence signals are visible to leadership, and parent notifications are queued or delivered truthfully.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Exams, Marks, Report Cards, And Publication

- Script ID: MGV-07
- Primary actor: Teacher, HOD, Dean, Exams Manager, Principal
- Expected outcome: Exams are configured, subjects are assigned, marks are entered and moderated, report cards are generated, approved, published, and visible to parents/students.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Library Issue, Return, Overdue, And Fine

- Script ID: MGV-08
- Primary actor: Librarian
- Expected outcome: Books are catalogued, issued, returned, marked overdue or lost, and any fine appears in finance where billable.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Health Visit And Parent Alert

- Script ID: MGV-09
- Primary actor: Nurse
- Expected outcome: A health visit is recorded, medicine stock updates if dispensed, and urgent parent/principal alerts are created where required.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Inventory And Stores Issue

- Script ID: MGV-10
- Primary actor: Storekeeper
- Expected outcome: Stock is received, requested, approved, issued, and reflected in stock ledgers and requester notifications.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Security Visitor Check-In And Check-Out

- Script ID: MGV-11
- Primary actor: Security Officer
- Expected outcome: Visitor entry is recorded, host/secretary/principal visibility updates, a visitor slip can be printed, and checkout closes the visit.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Discipline, Counselling, And Parent Summons

- Script ID: MGV-12
- Primary actor: Discipline Master and Counsellor
- Expected outcome: An incident can be logged, escalated, linked to counselling, and parent summons/report documents are truthful.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Boarding, Transport, And Laboratory Operations

- Script ID: MGV-13
- Primary actor: Boarding Master, Transport Manager, Laboratory Technician
- Expected outcome: Boarding roll call, route assignment, lab inventory/requests, and related reports persist and remain school-scoped.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Parent And Student Portal Publication

- Script ID: MGV-14
- Primary actor: Parent and Student
- Expected outcome: Only published school-scoped records are visible to linked parents/students; unpublished marks or other private records remain hidden.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## System Monitor Failure Recovery

- Script ID: MGV-15
- Primary actor: System Monitor
- Expected outcome: Failed email/SMS/jobs/payment callbacks are visible, retryable, and audited without fake success.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

## Cross-Tenant Denial And Clean School Data

- Script ID: MGV-16
- Primary actor: Any role
- Expected outcome: A user cannot reach another school's records by route or ID changes, and a new school has no demo school data.
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.

