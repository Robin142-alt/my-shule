# Student record editing — 19 October 2026

Opening a student previously dereferenced an absent sample profile. The shared student route now reads the requested school-owned student and offers a permission-aware editor.

The editor saves names, date of birth, gender, nationality, birth certificate/UPI/NEMIS identifiers, class/stream, configured subject selections, and optional guardian details. Saves use an optimistic timestamp check and a tenant-scoped transaction. Class corrections update current placement, assignments, enrolment, allocations, subject registers and timetable projections; existing marks and invoices retain their history. Cross-year changes continue through academic promotion.

Guardian changes update canonical contacts, linked primary-contact student projections, admission records, and portal recovery hashes. Existing recovery codes are invalidated through the governed contact workflow. A phone matching another guardian requires the explicit parent-linking workflow. Saving contact details does not send a portal invitation.

Each save writes an audit record and a durable `student.record.updated` event in the transaction. The school mutation refresh event and tenant query invalidation refresh other role views. Teachers can read only learners in their assigned classes; edits require student and admission write capabilities.

Validation:

- 15 disposable PostgreSQL workflow tests passed against the upgraded legacy schema: admission, editing, class and subject projections, shared guardians, partial contacts, stale edits, permissions, foreign references, compulsory subjects, and event-failure rollback.
- Five editor interaction tests passed: real records, minimal payloads, subject derivation, truthful failure recovery, read-only/error states.
- Browser workflow passed at 320, 390, 768 and 1440 pixels with no page errors or horizontal overflow. Screenshots saved under `output/student-record/`.
- Backend and web TypeScript checks and focused editor lint passed during implementation.
- A local shared-guardian update completed in 38 ms; this is a local test measurement, not a production latency guarantee.

No production student records were changed for testing. The release adds no database migrations. Rollback is the prior application release; committed student changes remain durable and compatible with existing readers.
