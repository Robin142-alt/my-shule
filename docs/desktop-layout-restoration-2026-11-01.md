# Desktop layout restoration — 1 November 2026

## Scope and historical references

- Primary source reference requested by the user: `6debf54cd332295a60d6d71a1f54eb31e35ded8c`, 10 October 2026, 18:35 EAT.
- Additional source and compiled-browser reference: `8938d938d4e4f502d141b0b4bfcfd1ca64fc0559`, 25 October 2026, 19:36 EAT. Its successful CI build artifact was replayed locally.
- Current release baseline: `018608749eafd86f0516563bb917d8642008472b`.

The shared authenticated styles, navigation stylesheet, and AppFrame desktop geometry are unchanged between the October references and the current release. The October 10 CI artifact is no longer available; comparison with that date is from Git source, not a claimed browser replay. Later navigation persistence, new workspace routes, library functionality, examination changes, and permission logic are preserved.

## Findings and implementation

- Principal, Deputy, Accountant/Bursar, and the shared staff/portal shell used a 1280px desktop breakpoint. The mobile navigation components use 1024px. This leaves scaled laptop windows (for example, 1093 CSS pixels) in a mobile layout. The shared rail now uses 1024px consistently, retaining the historical 300px rail and the finance shell's 250px rail. Other shells retain their existing 1024px desktop behavior.
- Principal mobile-only visibility, drawer styling, controls, and resize dismissal use the same boundary.
- Extra padding outside the Principal and Deputy grids let their sticky sidebars leave the viewport at the bottom of the document. On desktop, the existing grid padding now owns that spacing.
- The newer syllabus teaching view forced mobile cards at every width. Both teaching and monitoring now use the existing table on desktop and retain cards below 1024px. Table overflow stays inside its own container.
- No backend, schema, tenant, authorization, or production data changes are required.

## Verification checklist

- [x] Inspect historical source, routing, shared shells, styles, and newer functionality.
- [x] Compare compiled October 25 and current baseline: all 30 role/portal entry points, home plus two sidebar workspaces, 1280/1366/1440/1536/1093/390px (540 measurements per build).
- [x] Confirm the baseline laptop breakpoint failure at 1093px across 18 role/portal entry points.
- [x] Implement shared rail boundary and retain historical desktop dimensions and visual tokens.
- [x] Restore desktop syllabus tables with mobile cards retained.
- [x] Verify final build at 1280/1366/1440/1536px, scaled laptop widths 1093/1024px, and 768/390px: 720 measurements across all 30 entry points, zero layout failures or page exceptions; all 30 mobile drawers opened and selected a workspace successfully.
- [ ] Verify every available sidebar workspace, scrolling, and mobile drawer navigation across all 30 entry points.
- [x] Verify populated syllabus tables, cards, editing, and failed requests in a browser: both modes at 320/390/768/1024/1280/1366/1440/1536px; saved coverage and notes, read-only monitoring, independent streams, and rejected-write recovery passed.
- [x] Run relevant component tests: 8 suites, 115 tests passed (navigation, mobile controls, role routes, syllabus, keyboard navigation).
- [x] Production build and TypeScript checks passed. Existing Next middleware deprecation warning remains unrelated to this change.
- [ ] Complete lint and the full CI gate.
- [ ] Review final changes, publish, and verify deployment.

## Evidence boundaries

Browser audits run real compiled pages with isolated routing/authentication fixtures and deliberately unavailable school-data responses. These verify layout, routing, loading/error containment, sidebar behavior, and mobile navigation without contacting or mutating a school. Populated component browser tests exercise their existing local data fixtures. These are not authenticated production workflow tests.

Raw local logs, measurements, and screenshots are under `output/desktop-restore/`; populated syllabus evidence is under `tmp/syllabus-browser/`. Final counts and deployment evidence will be recorded after checks finish.

The candidate retains the historical sidebar widths, header positions/widths, and navigation row sizes in all 356 matching laptop measurements against October 25. Local full navigation also passed all 31 Principal sidebar destinations. The CI sweep reaches 332 sidebar destinations plus 30 home views at eight widths (2,896 measurements). Its first run exposed a test synchronization issue: the deliberately failed realtime connection inserted a 37px status banner during the first scroll measurement. The test now waits for that expected banner and retains the same sidebar visibility assertion; the complete run is being repeated.

## Dashboards covered

Principal, Deputy Principal, Teacher, Accountant, Bursar, Dean of Academics, Exams Manager, HOD, Head of Subject, Class Teacher, Grade/Form Master, Admissions, Secretary, Librarian, Storekeeper, Nurse, Guidance/Counselling, Discipline Master, Laboratory Technician, ICT Manager, Security Officer, Transport Manager, Boarding Master, Procurement Officer, Admin, school Student dashboard, Parent portal, Student portal, Super Admin, and System Monitor.

## Changed files

- `apps/web/src/app/{authenticated.css,authenticated-premium.css,dashboard-navigation.css}` — consistent desktop/mobile boundary and shared sidebar geometry.
- `apps/web/src/components/school/{principal-command-center,deputy-principal-command-center,accountant-command-center,live-role-command-center}.tsx` — adopt the shared geometry and preserve mobile controls.
- `apps/web/src/components/school/syllabus-workspace.module.css` — existing desktop table/mobile card presentation.
- `apps/web/tests/{desktop-layout-audit,workspace-browser-fixture,workspace-navigation-audit}.mjs` — compiled role/workspace verification and reused local API fixture.
- `apps/web/tests/design/syllabus-browser.mjs` — both display modes at laptop/mobile sizes and saved-state checks.
- `.github/workflows/ci-cd.yml` — run the role/workspace layout audit against the compiled Worker and retain measurements.
- This evidence record.
