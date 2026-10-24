# Library reports repair — 24 October 2026

Status: implemented and verified locally; not deployed to myshule.online.

## Cause and repair

The librarian reports endpoint returned a flat array of saved snapshots with camelCase fields. The reports workspace expected `{ metrics, reports }` with snake_case fields. Consequently, persisted reports were discarded by the view and every metric fell back to zero. The success message said the request was accepted even though generation was synchronous. The UI also expected public download URLs that the service never supplied.

The endpoint now returns the workspace contract, including old saved snapshots. A school-scoped, permission-checked artifact endpoint verifies file size and SHA-256 before returning the stored bytes and records an access audit. The UI offers preview/print, authenticated download, refresh, generation progress, errors and retry. Both librarian report entry points use the same workspace.

Generation now validates the selected report type and file format. Circulation, borrower activity and most-borrowed reports use the complete circulation ledger within Nairobi date boundaries, including returned loans. Fines reports select fines created during the period and describe settlement status as current. Inventory, stock and overdue reports explicitly show the current position. Term reports require configured school term dates; missing configuration is an actionable error. Old snapshots retain their original files and show “Not recorded” for period metadata that was never saved.

Reports, generation audits, workflow events and leadership/librarian notifications are committed in one transaction. School ownership is enforced on every read, join and artifact access. No new database migration or production data repair is required.

## Verification

- API TypeScript compilation and web TypeScript checks passed.
- API admin-command, library and new report unit tests: 161 passed.
- Disposable PostgreSQL integration: 11 passed, covering all seven types, PDF/CSV/XLSX bytes, persistence/list/download, legacy snapshots, other-school denial, term validation, audits, notifications and rollback on event failure.
- Focused web regression tests: 23 passed across five suites.
- Browser fixture with the actual component and production stylesheet: 390px and 1440px widths passed generation, visibility after reload, download, preview and print-control checks with no page errors or horizontal page overflow. The fixture uses isolated test data and does not connect to any school.
- Broader dashboard-action-contract run: the librarian checks passed; two existing assertions failed in principal and grade-master teacher-role navigation. Those assertions expect old `buildSchoolSectionHref` calls while the current workspace uses `switchDashboardRole`. No unrelated navigation code was changed.

Reproduce database checks with `npm run test:library-reports`, browser checks with `npm run test:library-reports:browser`, and UI checks with `npm --prefix apps/web run test:design -- librarian-reports report-artifact-download librarian-human-workflows library-workspace library-module-access`.

## Rollout

Deploy the API and web changes together. Verify the signed-in librarian's existing reports first, then generate one report and open its preview/download. Production report history was not inspected or modified during this repair. No report deletion, regeneration or backfill is needed to correct the list contract. Previously generated generic reports cannot retrospectively recover the type or period selections that the old server ignored.
