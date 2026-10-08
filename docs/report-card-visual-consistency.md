# Official Report Card Rendering

## One Document

Persisted report-card previews render the official PDF bytes through PDF.js. They
do not re-create the report as responsive HTML. Download and print retain the
existing prepared-artifact workflow and use that same PDF. The preview endpoint
is authenticated, permission checked and tenant scoped, with private/no-store
headers and binary PDF delivery through the existing proxy.

Individual reports and each learner page in a bulk PDF use the same PDFKit page
renderer. PDFs contain embedded Liberation Sans fonts, vector text/tables/charts,
the original unmodified MyShule brand mark and tenant-owned uploaded images.
Image aspect ratios and the existing 130 x 32 pt signature bounds are preserved.
Unsigned areas remain blank above the signature line and role label.
The existing section arrangement remains: student information, academic table and
totals including Overall Grade, paired analytics charts with Summary Overview on
their right, followed by comments and signatures.

Readiness-only screens without a persisted report remain explicitly labelled as
such and cannot print or download their provisional HTML as an official report.

## Graph Contracts

- Term Performance Trend: current exam plus the two immediately preceding exams
  with finalized learner records, in chronological order, at most three exams.
- Subject Performance: current exam and its immediate predecessor, at most two.
- Both use actual exam names and solid lines. No dotted or dashed lines.
- Exam date, creation time and ID define deterministic chronology. Editing or
  reprocessing an older mark does not make it a newer exam.
- Missing/absent subject results are gaps, not zeroes. An absent preceding exam
  is not replaced by an older exam. First exams have current results only.
- Current plotted values come from the report's authoritative academic payload.
  Historical overall totals prefer processed snapshots; where none exists, they
  use the same weighted subject averages as report generation.
- All history queries bind school, learner and current exam, excluding future
  exams and other tenants.

Legacy snapshots hydrate named comparison/trend metadata during artifact
regeneration. They do not alter approved marks, comments, signatures, verification
codes or workflow status. Renderer version 7 invalidates older PDF cache entries;
existing source-revision and review checks still apply.

## Layout And Recovery

Every learner has a portrait A4 page (595.28 x 841.89 pt). Names, table rows,
legends and exam labels are measured and wrapped. The mobile preview scales this
page proportionally, with touch-sized zoom and fit controls, loading status,
accessible extracted text and a retryable error state.

An exceptionally large amount of text cannot fit on A4 at readable type sizes.
Generation fails with an actionable error before releasing a partial document;
it never silently clips content or shrinks the whole page. Bulk spools are removed
on failure. Printer paper/scaling/color settings still govern physical output:
use A4 and actual size to preserve the PDF's physical proportions.

## Class Teacher Name Titles

Class Teacher Settings includes a saved title selection: Mr., Mrs., Ms., Miss,
Dr., Prof., Rev. or no title. Legacy names remain unchanged until a choice is
made. Only the signed-in teacher's school-scoped staff profile can be changed,
with an active class-teacher appointment and the existing write permission.
The canonical staff display name incorporates the title once, including after
subsequent HR updates. Legal/account names and login details are not modified.
The profile update, staff audit record and settings workflow event are one atomic
database operation. Other schools are unaffected. Existing report snapshots are
not rewritten: regenerate to use the updated teacher name through the normal
report review workflow.
The settings form provides a live name preview, touch-sized selectors and a
stacked mobile signature section. Save failures remain visible without claiming
success.

## Verification

Regression coverage includes original-logo aspect ratio, solid graph lines,
embedded fonts, single-page A4 bounds, long labels, all subject keys, blank
signatures, overflow errors, identical single/bulk page geometry and text,
authorized preview bytes, mobile zoom/retry and disposable-PostgreSQL chronology,
weighted results and tenant isolation. The focused suites are wired into CI.

Local visual QA uses synthetic school/learner records, not production records.
PDF.js preview and independently rendered bulk pages were compared at 320, 768
and 1440 px viewport widths. After the logo/solid-line corrections they had zero
different pixels at all three sizes. Poppler renders were also inspected for A4
layout, typography, graph labels and signature positioning. Authenticated live
school workflows and physical printer output require post-deployment checks.
The Class Teacher settings controls were also exercised at 320, 768 and 1440 px,
including title selection, name preview, save handling and horizontal overflow.
