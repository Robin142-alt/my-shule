# Keyboard navigation workstream — 28 October 2026

Specification A Part 5, coordinated with Specification B's class-specific marksheets.

## Implemented

- Shared opt-in `onFormNavigationKeyDown` and `onGridNavigationKeyDown` in `apps/web/src/lib/accessibility/keyboard-navigation.ts`.
- Form Up/Down and safe Enter; normal Tab, native text Left/Right, textarea/select/date/number/datalist/combobox and IME handling retained. Hidden, inert, disabled, read-only, collapsed details and aria-disabled fields skipped. No automatic form submission on the final text field.
- Grid coordinates come from currently rendered eligible rows. Arrows/Enter/Shift+Enter, locked-cell skipping, caret boundaries, typing/F2 edit mode and Escape navigation mode. Focus uses preventScroll and nearest scrolling only when off-screen/clipped.
- Barcode opt-out: `data-keyboard-navigation="off"`; existing child handlers/defaultPrevented retained. Library agent owns scanner integration.
- Hooked shared teacher/exams-manager marksheet and category inputs; operational forms and admissions FormSection; admission wizard/settings; parent linking; secretary entry forms; finance receipts/reversals/cheques, expenses, fee structures and invoices; storekeeper item registration/receiving/issuing, stocktake creation and damaged/lost reporting; boarding leave; transport routes; staff approval/leave and school profile.
- Exam setup form hookup owned by main agent.
- Replaced legacy exam-module custom grid navigation with the same helper, removing its unconditional caret-arrow override and obsolete input refs.
- Staff invitation name/email fields now opt in as a bounded entry group.

## Evidence so far

- Red: new keyboard Jest suite initially failed because helper did not exist.
- Green: keyboard helper 5/5 tests passed.
- Keyboard + existing teacher marksheet regression: 2 suites, 33 tests passed (before adding one extra eligible-row filtering test).
- Final affected regressions: 8 suites, 72 tests PASS. Command: `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/keyboard-navigation.test.tsx tests/design/teacher-exams-marks-workspace.test.tsx tests/design/student-admission-wizard.test.tsx tests/design/finance-human-workflows.test.tsx tests/design/storekeeper-human-workflows.test.ts tests/design/transport-human-workflows.test.ts tests/design/transport-boarding-contracts.test.tsx tests/design/exams-workspace.test.tsx`. Full output: `output/keyboard-navigation/regression.log`.
- Focused lint of changed files: 0 errors, 85 warnings, including existing loose types/effect warnings. One fixture ARIA warning was corrected afterward; final helper/fixture lint is recorded separately.
- Subsequent helper/test/browser-fixture-only lint was clean (`output/keyboard-navigation/helper-lint.log`, no diagnostics); helper Jest rerun passed 5/5 (`helper-final-tests.log`).
- Browser fixture `node apps/web/tests/design/keyboard-navigation-browser.mjs`: PASS at 375 and 1280 px, zero console errors; native caret/Tab/select/number/textarea/date, seven consecutive scanner Enter suffixes, zero implicit saves, grid arrows/edit mode/reverse Enter, no horizontal overflow.
- Screenshots: `output/keyboard-navigation/keyboard-375.png` (visually inspected) and `keyboard-1280.png`; machine results: `output/keyboard-navigation/results.json`.
- Browser is an isolated fixture importing the production helper, not a live authenticated school session. No physical scanner, assistive-technology device, deployment or production verification claimed.

## Final review and remaining verification

- Independent backend review identified enrollment year/effective-date gaps, historical placement scope in protected marks, newly eligible learners missing from the submitted-sheet predicate, unassigned manager entry, and the alternate legacy timetable-slot mutation route. These were sent to the exam backend agent and coordinator; fixes/test evidence belong to those workstreams.
- Final keyboard review found number-field Enter implicit submission and grid edit mode surviving blur/unconditionally consuming Escape. Red regression confirmed 2 failed / 5 passed (`edge-red.log`, 488.068 seconds under memory contention). Corrections landed: number Enter advances safely while arrows stay native; edit mode ends on blur; Escape remains native unless exiting edit mode. Final green rerun pending the coordinator's consolidated batch.
- Final marksheet review found the Blank filter unmounted the row on its first typed digit. Regression added for typing `7` then `74`, Enter to the next blank row, and restoring the retained draft when clearing the filter. Correction retains the focused learner row until focus leaves, including transitions between its category cells, while eligibility/search/locked-row behavior remains intact. The isolated red run was cancelled during memory recovery; this correction awaits the coordinator's consolidated test batch.
- Machine memory pressure was identified during parallel final checks. The coordinator owns sequential consolidated final Jest/type/lint checks. No further worker runs will start from this workstream until requested; no production activity occurred.

## Changed files (keyboard-owned)

- `apps/web/src/lib/accessibility/keyboard-navigation.ts`
- `apps/web/tests/design/keyboard-navigation.test.tsx`
- `apps/web/tests/design/keyboard-navigation-browser.mjs`
- `apps/web/tests/design/teacher-exams-marks-workspace.test.tsx`
- `apps/web/src/components/school/teacher-dashboard/exams-marks-workspace.tsx`
- `apps/web/src/components/school/teacher-dashboard/paper-settings.tsx`
- `apps/web/src/components/operational/operational-form-shell.tsx`
- `apps/web/src/components/modules/shared/form-section.tsx`
- `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- `apps/web/src/components/school/admissions-dashboard/student-admission-wizard.tsx`
- `apps/web/src/components/school/admissions/parent-linking-workspace.tsx`
- `apps/web/src/components/school/secretary-command-center-full.tsx`
- `apps/web/src/components/school/accountant/payment-register.tsx`
- `apps/web/src/components/school/accountant/expenses-workspace.tsx`
- `apps/web/src/components/school/accountant/invoices-workspace.tsx`
- `apps/web/src/components/school/accountant/fee-structure-form.tsx`
- `apps/web/src/components/school/storekeeper/items-workspace.tsx`
- `apps/web/src/components/school/storekeeper/stocktake-workspace.tsx`
- `apps/web/src/components/school/storekeeper/damaged-missing-workspace.tsx`
- `apps/web/src/components/school/boarding-master/leave-exit-workspace.tsx`
- `apps/web/src/components/school/transport-manager/routes-workspace.tsx`
- `apps/web/src/components/school/admin/staff-records-workspace.tsx`
- `apps/web/src/components/school/principal-dashboard/school-profile-workspace.tsx`

Existing user changes in these files were preserved. No database/API permission changes or migrations belong to this keyboard workstream.

## Consolidated completion evidence

- Final combined web batch: 14 suites / 121 tests passed (`.codex-library-exams-web-verified.log`), including number Enter, edit-mode blur/Escape and Blank-filter multi-digit entry regressions.
- Final helper browser fixture passed at 375/1280px, seven scanner Enter suffixes, zero implicit saves and console errors (`.codex-keyboard-browser-final.log`).
- Coordinator extended scoped handlers to the remaining existing staff leave, allocation, department/job-title, payroll and HR entry groups. Native selectors/dates remain native. Final TypeScript/lint/build checks are recorded in the consolidated delivery report.
- Stocktake coverage is its existing creation form; this change does not introduce a missing per-item count editor. Physical scanner and screen-reader device testing remain unverified.
- Latest consolidated status: `docs/myshule-library-exams-delivery-2026-10-28.md`.
