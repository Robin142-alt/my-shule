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
- [ ] Verify final build at all requested laptop widths, scaled laptop widths, and mobile/tablet.
- [ ] Verify every available sidebar workspace, scrolling, and mobile drawer navigation across all 30 entry points.
- [ ] Verify populated syllabus tables, cards, editing, and failed requests in a browser.
- [ ] Run relevant component tests, lint, and production build/type checks.
- [ ] Review final changes, publish, and verify deployment.

## Evidence boundaries

Browser audits run real compiled pages with isolated routing/authentication fixtures and deliberately unavailable school-data responses. These verify layout, routing, loading/error containment, sidebar behavior, and mobile navigation without contacting or mutating a school. Populated component browser tests exercise their existing local data fixtures. These are not authenticated production workflow tests.

Raw local logs, measurements, and screenshots are under `output/desktop-restore/`; populated syllabus evidence is under `tmp/syllabus-browser/`. Final counts and deployment evidence will be recorded after checks finish.
