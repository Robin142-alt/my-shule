# Unassigned markbooks and clear subject labels

The reported screenshot showed the earlier teacher-required interface. Public
Cloudflare assets contained the updated selector, and the user confirmed after
refreshing that the live `ter 3 / Grade 9 / Mathematics` markbook opened and showed
students with `All eligible students` selected. This verifies live discovery and
opening, not a production score mutation.

Further investigation reproduced a separate mixed-stream defect: a teacher assigned
to one stream caused discovery to omit another stream's unassigned choice. The
progress list also lacked a direct markbook action. Discovery now joins the shared
historical exam roster by stream, progress returns subject/paper/stream identifiers,
and both entry paths open the existing marks interface. A selected stream limits the
visible and submitted students; server counts and submission status use that same
scope. Authenticated Exams Manager permissions, tenant filters, per-row edit guards,
version conflicts, audits and existing reopening rules remain in force. Financial
roles receive no automatic mark-entry access.

The selected stream also uses the authorized all-results read when opened, so a
submitted stream remains visible and read-only while another stream is unfinished.
The class-level submitted query deliberately requires all streams to be submitted;
using it for a single-stream view caused an empty history view.

Verification on 25 October 2026: all 61 database regressions and 60 focused
frontend regressions passed. A read-only
comparison against live Kibabi records found 18 eligible Grade 9 White Mathematics
learners and two separate learners without a stream, with matching discovery,
detail and progress counts (0/18 and 1/2 recorded respectively). Kawino had no
unassigned markbooks in this comparison. No production rows were changed or
reconciled. Live opening was confirmed by the user; save/submission tests used an
isolated database and browser fixtures, not production scores.

Single-paper subjects display only their subject and skip the redundant Paper
selector. Multiple configured papers retain their names. A shared display helper
suppresses generated `Main Paper` labels and repeated subject prefixes in selectors,
progress, markbook lists, editor headings and print headings. Stored assessment IDs,
names, maxima, marks and report configurations are unchanged. Paper counts are scoped
to the exam, class and subject, including class-specific paper configurations.

Regression cases cover absent teacher assignments, mixed streams, zero scores,
independent submission, direct opening, selection resets, explicit and generated
paper names, and cross-school/role guards. Database scenarios exercise save, edit and
submit for never-assigned subjects in open, closed, submitted, locked and published
states through authorized reopening. Draft exams first pass the existing Exam Setup
opening workflow; archived exams remain protected. The browser fixture now truly has
no teacher instead of leaving a real teacher unselected.

No production scores or assignments are created for testing. Production browser
automation was unavailable; user-confirmed live opening, public asset checks,
read-only production query comparisons and disposable-database/browser tests are
reported separately. Deployment and final test results are recorded with the release.
