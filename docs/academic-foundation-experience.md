# Academic Foundation setup experience

The six setup areas retain their creation forms, editable records, lifecycle and bulk actions, search/filter/sort controls, curriculum and policy builders, assignment history and cohort promotion. Desktop uses vertical area navigation; mobile uses a native area selector and single-column forms. Each area has an action selector for reaching a form or saved records quickly. Filters and completion details expand on demand.

## Completion calculation

There is no combined readiness score. Each percentage averages only the checks for its own area. Coverage checks use the fraction of applicable live records configured, rather than treating a single assignment as complete coverage. Failed loading does not display a percentage.

| Area | Checks |
| --- | --- |
| Academic Calendar | Active year, current year, terms in that year, current term |
| Classes & Streams | Classes in the current year; fraction of those classes with streams |
| Subjects & Departments | Active subjects, departments, department HOD coverage, school-wide subject HOS coverage, current class subject offerings |
| Teacher Allocations | Current class teacher coverage; subject teacher coverage for the exact class/stream/cohort offerings in the current term or without term restriction |
| Roles & Curriculum | Current academic leadership appointments; active curriculum configuration |
| Grading & Policies | Active grading, attendance policy, report-card policy linked to active grading |

Archived, inactive, future and expired records do not contribute. Calendar activity periods and advanced scoped appointments remain usable without becoming mandatory setup checks. Completion is informational and does not block any workflow.

## HOS assignment

**Subjects & Departments** keeps the HOD form and adds a separate HOS form with only Subject and Head of Subject. The server derives the permanent, immediate, school-wide scope and audit reason. All active school staff are eligible, while teaching-only assignment controls retain their existing eligibility rules. See [Head of Subject](head-of-subject.md) for authorization and lifecycle behavior.

## Verification

- Frontend contracts cover completion, forms, keyboard navigation, error recovery, exact HOS payload and preserved setup workflows.
- Backend unit tests cover DTO validation, permission enforcement, school boundaries and transactional audit/event/notification wiring.
- Disposable PostgreSQL integration tests cover non-teaching staff access, unchanged primary role, reassignment, concurrent writes, rollback, expiry and tenant isolation, alongside existing authentication tests.
- `node apps/web/tests/design/academic-setup-browser.mjs` checks the real component at 1440, 768, 390 and 320 px, including all setup areas, overflow, dependent selects and HOS submission. It uses isolated fixtures and saves screenshots under `output/academic-setup-browser`.

### Release validation, 2026-09-27

Backend compilation, the production web build, 107 backend regression tests, 67 frontend tests, 18 disposable PostgreSQL integration tests and all four browser viewport checks passed. Frontend lint completed with no errors and existing repository warnings.

An additional run of `curriculum-grading.test.ts` found three existing failures: persistence of a curriculum binding, curriculum-specific report grades, and rejection of report generation without a curriculum grading policy. Running that suite with the unchanged main-branch academics service reproduced the same failures. This experience change preserves the existing grading behavior and does not claim to resolve those report-grading failures.
