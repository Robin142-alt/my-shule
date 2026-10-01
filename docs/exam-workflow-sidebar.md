# Exams Manager workflow workspace

The Exams Manager sidebar and mobile menu include **Exam Workflow**, immediately
after Exam Command Center. The overview also links to this workspace.

- Public route: `/school/exams-manager/exam-workflow`.
- Hosted route: `/exam-workflow`, using the existing school route builder.
- Data: `GET /exams/workflow`, through the existing school-scoped query hook.
- Access: the Exams module and backend `exams:read` permission remain required.

The workspace reuses the shared exam tracker. It displays active cycles, their
current stage and next owner, blockers, marks readiness, and report-card counts.
Published cycles leave the active tracker; their reports remain in Report Cards.
The existing endpoint returns the latest 25 non-archived cycles by default.

Refresh retries failed reads. Empty schools can open exam setup directly. The
other shortcuts open Marks Entry and Report Cards in the same dashboard. This
workspace only reads data and navigates; mutations, approvals, notifications,
and audit events continue through the existing operational workspaces.

Verification covers direct public/hosted routing, sidebar and shortcut navigation,
module gating, school-scoped reads and retry recovery, and the shared tracker
regressions. The isolated browser harness checks desktop and mobile navigation
and layout at 320, 390, 768, 1024, and 1440 pixels using QA fixtures without school writes.
