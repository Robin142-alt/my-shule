# Examination marks consistency — 25 October 2026

## Proven causes

Read-only inspection of Kibabi and Kawino compared exam dates, class membership,
subject enrolment history, saved marks, and the existing teacher allocations. Neither
the detailed marksheet nor the overview was assumed to be correct.

- Kibabi's September Computer exams had 10 eligible candidates and 10 recorded
  outcomes. Two learners enrolled on 4 October were incorrectly included by the
  overview's current-enrolment query, producing 10/12.
- September CRE had two eligible candidates. Those two later admissions and a
  subject enrolment dated 19 October produced the incorrect 2/5 total.
- The CRE examination ending 8 October likewise included a later subject enrolment.
  The exam continuing through 29 October legitimately includes it: its 4/5 total
  and one unresolved blank must remain visible.
- The submitted detail query selected saved mark rows rather than the whole eligible
  roster, hiding genuine blanks. Completeness was also being used as a submission
  status, and some counters omitted explicit non-numeric outcomes.
- Inner teacher joins and a required teacher parameter prevented manager access to
  configured unassigned subjects. Historical subject-selection updates could replace
  class/stream history, and current student status could hide an eligible learner
  transferred during an ongoing exam.

## Implementation

`exam-mark-roster.ts` supplies the shared school-scoped, exam-period roster and
recorded-outcome/status expressions. Progress, markbook reads and writes, import
commit validation, report readiness, and result inputs use the same eligibility.
Class-specific papers and their existing maxima remain independent. Numeric zero,
X/Y and explicit reasons count as outcomes; genuinely absent entries remain blank.
Existing X/Y precedence and normalization calculations remain in the result policy.

Submission is tracked separately from completeness and exam lifecycle. Submitted
sheets retain their status even with blanks. Each stream's submitted rows and blanks
stay protected while another unsubmitted stream remains editable. Exam locks,
publication, entry deadlines and authorized reopening continue to apply.

The manager selects Exam → Class → Subject → Paper → Open Markbook. Teacher selection
is optional. Manager writes retain the actual actor, audit trail and assigned teacher
when unambiguous. A later assigned teacher can continue an unassigned manager draft
without duplicate marks or changing the original editor. Existing transactions,
version conflicts, unique keys and event rollback remain enforced.

Subject changes now end the previous enrolment before inserting another class/stream
membership; cohort completion records its effective end date. No historical records
are backfilled speculatively.

## Data reconciliation and safety

Counts are read projections, so correction requires no score rewrite or destructive
migration. `scripts/audit-exam-mark-rosters.ts` provides a repeatable, read-only audit:

```powershell
# Supply MARKS_AUDIT_DATABASE_URL through the operator's secret environment.
node -r ts-node/register/transpile-only scripts/audit-exam-mark-rosters.ts <tenant-id>
```

It requires an explicit tenant, applies the runtime RLS role and school context,
uses a repeatable-read read-only transaction, and always rolls back. It reports
orphaned mark memberships, conflicting active streams, legacy completion dates and
fingerprints for marks, report cards and result snapshots. Keep its output private:
review entries can contain student identifiers.

Before release, 115 Kibabi and 36 Kawino progress rows were inspected. Twenty
Computer/CRE scopes were compared using the actual repository and teacher services
against production records. All roster lengths and recorded totals agreed. A genuine
Kawino Computer blank remained visible as 10/11, with the sheet still Submitted.
Neither school had orphaned mark memberships, conflicting active streams, or missing
legacy completion dates in this audit. No production marks, snapshots or reports
were edited, regenerated or republished by this work.

## Validation

Failing PostgreSQL regressions first reproduced the 10/12 and 2/5 mismatches,
submitted/blank inconsistency, unassigned access, historical transfer and protected
stream cases. Tests exercise the guarded HTTP controller, tenant-injection rejection,
cross-school requests, teacher rejection from manager routes, zero marks, stale saves,
submissions, lifecycle restrictions, paper configuration, imports and event rollback.

Local checks passed: 104 distinct PostgreSQL integration tests across five suites,
182 backend unit tests, and 50 frontend workflow/reconnect tests. Backend compilation,
frontend TypeScript and changed-file lint also passed. The unassigned-entry browser
harness passed all four viewport widths; phone screenshots were inspected manually.
Validation logs are kept locally under `.marks-*.log`; they are not release artifacts.
The release checklist includes database integration suites, backend unit tests,
frontend workflow/reconnect tests, TypeScript, changed-file lint, and the browser
harness at 320, 390, 768 and 1440 pixels. CI runs the new roster regression suite and
the unassigned-manager browser scenario on subsequent changes.

## Limits and release verification

The existing database has no frozen examination candidate roster or independent
paper-specific candidate registry. Eligibility therefore uses the preserved class
and subject history, with existing saved marks as historical evidence when subject
selection was rewritten. Ambiguous history is reported for review rather than guessed.
No claim is made that every school's legacy data has been reconciled.

Production browser inspection was stopped because Computer Use could not establish
the browser URL. Automated local browser/API verification and read-only production
service verification are separate from an authenticated live-browser acceptance run.
Deployment status and live health checks must be recorded separately before calling
the release deployed. Rollback is the preceding application revision; no data rollback
is needed because the release does not rewrite historical scores or published results.
