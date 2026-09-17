# Cohort teaching configuration

## Investigation and design

Canonical academics uses `class_sections` (an academic-year position), `class_streams`, and `student_class_assignments`. Admissions also maintains per-student annual `student_academic_enrollments` and lifecycle history. Neither enrollment table identifies a group across years. Prisma's legacy `classes`, `streams`, and `terms` are not the canonical Academic Foundation registry.

Subject offerings require a term; teacher duties permit both term-bound and continuing rows. The existing promotion helper copies teachers per learner, gives destination duties precedence, and does not carry subjects. The admissions UI guesses the next grade from a name and keeps the old stream name. Those behaviors cannot express safe cohort progression.

The selected design adds a small tenant-owned cohort identity and explicit annual placements. Existing subject and teacher assignment tables become annual configuration snapshots linked to the cohort and placement. Annual snapshots preserve legacy timetable foreign keys and original class/period context. Terms never create, copy, delete, or filter active cohort configuration. Promotion creates a destination snapshot once per cohort placement, rather than once per learner or term. A full move retains the cohort ID; a partial move creates a child cohort so repeaters and promoted learners can subsequently be configured independently.

Alternatives considered: reusing per-student enrollment IDs cannot identify a group; inferring lineage from class names is ambiguous; replacing every historical consumer with a live placement view would change the meaning of assignment IDs referenced by historical timetable records. Explicit annual snapshots fit the existing raw-SQL repositories with less disruption.

## Integrity and legacy data

- Cohorts and placements use tenant-qualified foreign keys and row-level security. Exactly one current cohort owns an exact class/stream context. A class-wide setup command applies to each actual stream context, or the unstreamed context when no streams exist.
- Existing assignment rows and their historical foreign keys are retained. Migration records provenance, selects equivalent latest valid legacy configuration deterministically, and records incompatible equally authoritative candidates for authorized review. It never picks a conflicting primary teacher by arbitrary ID.
- Primary teacher validity ranges must not overlap in a cohort context and subject. Supporting teachers and nonoverlapping scheduled replacements remain supported.
- A new intake obtains a fresh cohort when its context is vacated. Empty prospective destination configuration is retained as retired history when a real cohort arrives; occupied unrelated destinations are blockers.
- Promotion locks the school's configuration operations, validates source expectations and all destinations, captures every source snapshot, then applies the whole batch. A stable request key and expected source placement prevent replay, duplicate enrollments, or a second grade jump.
- Historical marks, results, report cards, attendance, assessments, and timetable references are not moved. Their original class and academic period remain intact.
- Removed subjects and ended duties remain removed in the next placement. Subject deactivation also removes active teaching permission for that subject/context.

## Integration plan

1. Add cohort schema/bootstrap, migration classification, typed context resolution, common transaction lock, snapshot and governance helpers. Database tests cover migration provenance/conflicts, tenant boundaries, context uniqueness, and primary/supporting validity.
2. Route existing subject and teacher create/edit/end/reassign operations through cohort contexts. Keep permissions and response fields, add cohort/placement/stream identity, and remove term ownership throughout DTOs, services, repositories, and hidden HOD writes.
3. Add batch promotion preview/commit in the existing admissions domain and route both existing single-student promotion APIs through it. Inputs contain a request key, expected source placement, selected student IDs (optional for full cohort), and destination class/stream IDs. Validate academic chronology and school-configured hierarchy without deriving names.
4. Replace the Grade-only promotion shortcut with a reusable mapping form in admissions. Update subject offerings create/edit/display and teacher context display, preserving loading/error/retry behavior and mobile usability.
5. Adapt admissions subject availability and teaching permission consumers to continuing, stream-scoped configuration. Leave exam/timetable/history period filters on historical artifacts.
6. Verify the three-grade annual rotation, term switch, replacement, subsequent annual promotion, splits, renamed streams, new intake, stale/occupied destinations, removal/deactivation, concurrency/replay, rollback, legacy records, and historical references in real PostgreSQL. Run existing API/web regression checks and builds, then exercise the real local application with a disposable database and inspect desktop/mobile screens.

## Verification boundaries

Production inspection is read-only. No real student promotion or teacher mutation is used as a test. Local destructive fixtures require a localhost database named `my_shule_disposable_*` and the disposable harness marker. Existing unrelated untracked files are preserved. Release verification will identify the exact commit, test results, deployment state, and any remaining unrelated security gate separately.
