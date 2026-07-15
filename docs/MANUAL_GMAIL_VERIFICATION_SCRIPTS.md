# Manual Gmail Verification Scripts

Generated: 2026-07-15T14:35:23.430Z

Status: NOT_YET_MANUALLY_VERIFIED

Use these scripts with real Gmail inboxes and production/staging credentials. Mark a script passed only after the email, link, route, dashboard, data persistence, audit entry, and cross-school isolation expectations are confirmed.

## School Creation And Principal Activation

- Script ID: MGV-01
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Super Admin
- Role: Super Admin
- Invitation sender: Super Admin
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Super Admin
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: A clean school is created, the first principal receives an invite, accepts it, and lands on that school's activation checklist.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Principal
- Role: Principal
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Principal
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: A school-scoped staff invite is delivered, accepted once, and routes the new staff member to the correct role dashboard.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Admissions Officer
- Role: Admissions Officer
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Admissions Officer
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: An applicant moves through inquiry, application, acceptance, admission, class placement, parent linking, and active student status.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Deputy Principal
- Role: Deputy Principal
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Deputy Principal
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: The school defines terms, classes/forms/grades, streams, subjects, departments, and teacher assignments used by admissions and exams.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Accountant
- Role: Accountant
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Accountant
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Fee structures generate invoices, payments allocate correctly, receipts preview/download, and balances appear in parent and principal views.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Teacher
- Role: Teacher
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Teacher
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: A class register is marked, absence signals are visible to leadership, and parent notifications are queued or delivered truthfully.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Teacher, HOD, Dean, Exams Manager, Principal
- Role: Teacher, HOD, Dean, Exams Manager, Principal
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Teacher, HOD, Dean, Exams Manager, Principal
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Exams are configured, subjects are assigned, marks are entered and moderated, report cards are generated, approved, published, and visible to parents/students.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Librarian
- Role: Librarian
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Librarian
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Books are catalogued, issued, returned, marked overdue or lost, and any fine appears in finance where billable.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Nurse
- Role: Nurse
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Nurse
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: A health visit is recorded, medicine stock updates if dispensed, and urgent parent/principal alerts are created where required.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Storekeeper
- Role: Storekeeper
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Storekeeper
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Stock is received, requested, approved, issued, and reflected in stock ledgers and requester notifications.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Security Officer
- Role: Security Officer
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Security Officer
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Visitor entry is recorded, host/secretary/principal visibility updates, a visitor slip can be printed, and checkout closes the visit.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Discipline Master and Counsellor
- Role: Discipline Master and Counsellor
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Discipline Master and Counsellor
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: An incident can be logged, escalated, linked to counselling, and parent summons/report documents are truthful.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Boarding Master, Transport Manager, Laboratory Technician
- Role: Boarding Master, Transport Manager, Laboratory Technician
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Boarding Master, Transport Manager, Laboratory Technician
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Boarding roll call, route assignment, lab inventory/requests, and related reports persist and remain school-scoped.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Parent and Student
- Role: Parent and Student
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Parent and Student
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Only published school-scoped records are visible to linked parents/students; unpublished marks or other private records remain hidden.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: System Monitor
- Role: System Monitor
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for System Monitor
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: Failed email/SMS/jobs/payment callbacks are visible, retryable, and audited without fake success.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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
- Account: manual Gmail account to be supplied by the tester
- Primary actor: Any role
- Role: Any role
- Invitation sender: Role owner for the workflow
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for Any role
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: A user cannot reach another school's records by route or ID changes, and a new school has no demo school data.
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
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

