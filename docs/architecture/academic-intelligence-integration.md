# MyShule Academic Intelligence Integration

## Purpose

This document defines the production source of truth for academic operations. It
prevents new dashboard work from creating another academic data model and keeps
all reads and writes school-scoped.

## Authoritative Ownership

| Concern | Authoritative records | Notes |
| --- | --- | --- |
| Academic years, terms, calendar periods | `academics_*` tables | Created by an authorized Principal or Deputy Principal. |
| Classes, streams, subjects, departments | `academics_*` tables | Shared with admissions, attendance, teaching, exams, and reports through school-scoped APIs. |
| Teacher, class-teacher, subject, and HOD allocation | `academics_*` tables | Allocation is the authorization boundary for teacher mark entry. |
| Exam series, subjects, assessments, windows | `exam_*` tables | One operational exams engine. |
| Marks, mark versions, moderation, locking | `exam_*` tables | A mark has an explicit evidence status; missing evidence is never converted to zero. |
| Grading policy | `exam_grading_policies` and boundaries | Versioned and immutable after activation. |
| Report cards and artifacts | `student_report_cards`, `report_card_*` tables | Published revisions are immutable and retained. |
| Academic analytics | approved exam results and published report snapshots | Draft or unmoderated marks cannot drive official analytics. |
| Interventions and reassessments | `academic_interventions` and updates | Evidence-backed, school-scoped operational records. |

Legacy Prisma academic models remain compatibility declarations only where the
runtime still references them. New workflows must use the modules above and must
not create a second set of exam, mark, grading, report-card, or intervention
tables.

## Mark Evidence Contract

`score_status` is distinct from the workflow `status`.

- `entered`: a numeric score is required.
- `absent`
- `exempt`
- `not_assessed`
- `incomplete`
- `withheld`
- `medical_exception`
- `transfer_student`

Non-entered evidence states must store a null score. A missing mark row means
that no evidence has been submitted. Neither case is interpreted as zero.

The workflow state remains `draft`, `submitted`, `reviewed`, `locked`, or
`published`.

## Grading Policy Contract

A grading policy progresses through:

`draft -> validated -> scheduled -> active -> replaced -> archived`

Activation requires complete, non-overlapping coverage from 0 through 100.
Active, replaced, and archived versions are immutable. Corrections are made by
creating a successor version with effective dates and a link to the policy it
supersedes.

## Report-Card Contract

Each generated report card has an explicit revision. Publishing freezes that
revision, its grading-policy version, template version, approved result set, and
generated artifacts. A correction creates a new current revision and preserves
the previous published revision for audit and historical download.

Parents and students see only current published revisions unless a dedicated
history endpoint is used. Internal roles can inspect revision history when
authorized.

## Analytics And Intervention Contract

Official analytics use only reviewed, locked, or published numeric results.
Every aggregate reports its evidence denominator and missing/non-numeric counts.
Database failures are surfaced as failures; they are not converted into a
successful dashboard full of zero values.

Interventions retain the student, class, subject, responsible staff, evidence,
target, due date, status, before/after measures, reassessment outcome, actor, and
audit/event linkage. Creating or changing an intervention emits a school-scoped
event and cannot affect another tenant.

## Compatibility And Rollout

Schema initialization is additive and idempotent:

1. Add nullable/status/version columns.
2. Backfill existing rows to semantically equivalent values.
3. Replace constraints only after backfill.
4. Preserve existing identifiers and API routes.
5. Keep old published artifacts readable.
6. Verify tenant RLS and tenant-aware indexes.
7. Deploy API schema compatibility before web clients send new fields.

## Verification Gates

- Cross-tenant reads and writes are rejected.
- Teacher allocation is enforced by the API.
- Non-entered evidence cannot carry a numeric score.
- Active grading policies cannot be edited.
- Grading boundaries cover exactly 0-100 before activation.
- Draft marks do not affect official analytics.
- Published report revisions are not mutated.
- Parent/student downloads require a linked learner and a published revision.
- Intervention changes are persisted, audited, and event-emitting.
- Existing academic setup, exam, and published-report records remain readable.
