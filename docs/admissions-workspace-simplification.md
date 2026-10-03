# Admissions workspace consolidation

The officer has eight workspaces. Existing URLs remain valid, and saved school records are retained.

| Workspace | Daily work and consolidated tools |
| --- | --- |
| Overview | Admission totals, recent activity, resume admission, bulk admission |
| Admit Student | Student details, class and guardian, review and admit |
| Admission Records | Search and filter admissions, complete existing applications, open students; supporting documents, placement, and fee clearance are embedded tools |
| Parents & Guardians | Search learners, link legacy email accounts, add or correct a guardian phone, send portal access instructions |
| Transfers | Search learners, record transfer requests, browse transfer history |
| Bulk Admission | CSV template, validation and preview, confirmation, partial results and correction download |
| Communication | SMS composition and delivery history; existing enquiries, follow-up tasks, appointments, and templates are embedded tools |
| Reports | Admission register, allocations, documents, and transfers with preview, CSV download, and browser print |

Applicant profiles, interviews, selection, and the old enrolment stages no longer require separate sidebar visits. Their saved records are not deleted. Legacy documents, placement, fee-clearance, and communication-tool URLs select the corresponding embedded tool.

## Admission contract

The selected class supplies the academic year and curriculum. A single configured stream is selected automatically. All configured subjects are selected by default; compulsory subjects cannot be removed, and optional choices remain available in an expandable summary. Existing subject choices in drafts are preserved. The canonical admission transaction continues to create the academic enrolment, subject enrolments, configured fees, guardian links, portal records, audit, and domain events.

Guardian relationship choices are Mother, Father, and Guardian. Phone is optional for individual and bulk admission. Unknown contacts are stored as NULL, with separate internal identities; two learners without phones are never treated as siblings. Parent and student OTP access remains pending until a contact is supplied. The existing audited guardian-phone update also updates the canonical parent record and portal eligibility.

Bulk templates omit redundant year and curriculum columns. Previously downloaded templates remain accepted. Ambiguous class names require those columns to identify the intended configuration.

## Loading and reads

- Admissions queries use a 30-second school/user/role-scoped cache without focus refetching. The academic foundation uses 60 seconds and explicit refresh; its 15-second polling is removed. Drafts always refresh on entry, and failed draft reads block writes until retry succeeds.
- Only the selected embedded tool mounts and fetches. Navigation no longer prefetches every sidebar destination.
- Overview and the paginated admission register each use one SQL request instead of several sequential reads.
- Admission and guardian searches are debounced. Records use 30-row pages; transfer history uses 50-row pages.
- Preflight runs once on review. The server still validates the admission transaction. In-flight draft writes settle before admission, and repeated submission clicks are blocked while they finish.
- Report exports read bounded 50-row batches, up to 500 rows. The preview explicitly labels the 500-row cap and records report generation through the operational event service.

## Operational behavior

Transfer requests are saved as pending; requesting a transfer does not approve it or exit a learner. Tenant ownership is checked before persistence. Audit and event writes share the transfer transaction.

Parent portal instructions use the actual SMS outbox for phone-based accounts and the existing invitation service for email accounts. Provider failures remain visible; queued SMS is never labelled delivered. No messages are sent by the tests.

Deploy the API and web changes together. The schema bootstrap relaxes only guardian-contact nullability, preserving uniqueness for supplied phones. No school data backfill or demo seeding is required. Existing admissions roles need the added `school_sms:read` grant for delivery history.

## Verification

Relevant tests include:

- `admissions.test.ts`, `admissions.repository.test.ts`, `admission-input.test.ts`, and `admissions-command.test.ts` for admission, imports, academic derivation, missing contact, and truthful invitations.
- `admissions-simplification.integration-spec.ts` on disposable PostgreSQL for tenant-scoped pagination, embedded read contracts, nullable unique contacts, and transactional transfer rollback.
- Web design tests for routing, wizard validation and drafts, bulk feedback, mutation policy, guardian-phone updates, SMS feedback, and report artifacts.
- Local browser fixtures using the production components and styles at 320, 390, 768, and 1440 pixels. These check layout and interactions with isolated API fixtures, not a production school session.

Local verification on 2026-10-03 passed the API and web production builds, 60 focused API tests, 4 PostgreSQL integration tests, 14 admission wizard tests, 3 consolidated workflow tests, 12 routing tests, and 9 bulk/API/workspace tests. All 32 browser layout checks passed. Targeted lint had no errors; the wizard retains a React effect warning for hydrating draft state. No production deployment or school-data mutation was performed.
