# Exam Analytics filters and rankings — 13 October 2026

One Grade / Form control replaces the duplicate class/grade filters. It sits beside Stream in the main filter grid, clears dependent selection, supports legacy grade bookmarks, and appears consistently in report context. The workspace owns a light reading surface inside dark dashboards. Navigation wraps on desktop and uses selectors on mobile.

Rankings has one explorer for students, subjects, grades/forms, streams and departments, with performance, improvement and decline and a separate subject-within-form student ranking. Existing analytic API identifiers remain available; bookmarked ranking aliases open the matching explorer. Averages can be ordered highest or lowest first. Search and pagination preserve positions.

Ranking requires the school's existing traditional-mode ranking permission and complete approved numeric evidence for every expected assessment in the selection. Real zeroes count; missing, absent, invalid and duplicate subject evidence do not. Competition ties use displayed precision (1, 2, 2, 4). Stream identity includes the grade/form. Group averages weight learners equally. Mixed groups with disabled ranking are not ranked by silently removing protected members.

Improvement and decline use only the same learners, subjects, class placement and saved grading policy in both exams. Performance comparisons require the same complete population. Group progress discloses excluded learners. These are descriptive analytics positions; published report-card policy and positions remain unchanged.

No migration, seed, role expansion or school-record mutation is required. Report generation retains authorized server recomputation, tenant filtering, snapshot manifests and audit/event emission. Revert this release and redeploy through the existing pipeline to roll back; no database rollback is necessary.

## Verification

- 49 analytics API tests, including ranking ties, eligibility, zeroes, population matching, filters, cache changes, pagination and complete exports.
- 71 web tests across the analytics library and role routing.
- 23 disposable PostgreSQL integration tests covering analytics authorization, tenant scope and reporting.
- Browser workflows at 320, 768, 1024 and 1440 pixels on a dark parent surface: filters, comparisons, ranking selection, tied positions, pagination, drill/back, PDF/CSV downloads, print, empty and failure states; no page overflow or browser errors.
- Desktop/mobile screenshots inspected; generated A4 ranking PDF rendered with Poppler and inspected for layout and matching values.
- Backend/frontend type checks and focused lint.

These tests use controlled fixtures and a disposable database. They do not claim reconciliation of a live school's marks.
