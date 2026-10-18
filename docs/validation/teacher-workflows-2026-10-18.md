# Teacher dashboard workflow repair

## Behavior

The Teacher sidebar contains the teaching workspaces, Exams & Marks, Exam Analytics and Learner Progress. Assessments/CATs and the duplicate role shortcuts have been removed. Invigilation remains under Duties. Existing Working As role switching and appointment permissions are retained.

Only the active Class Teacher role may read or mark student registers, and the backend requires a current school/class appointment. Teacher links formerly opening attendance now open Lesson Log. Teachers record Taught or Not taught against an active class/subject/stream allocation; missed lessons require a reason. Personal staff attendance and exam invigilation remain separate workflows.

Assignments publish into existing academics tables for the allocated class or stream. Teachers record receipt, grade (including zero), return work with feedback, and see current learner submissions. Student completion and revision feedback use the existing student portal. Reviews check current allocations, school ownership, and concurrent edits. Assignment publishing and review persist audit/events and exact-account notifications.

Discipline concerns use existing school incident categories, domain services, case history and school notifications. Teachers select learners in their allocations, raise concerns, and track their own cases as the discipline team processes them. Internal-only comments remain restricted. Failures roll back the workflow.

Other teacher workspaces now have session-scoped caches, retry states and real navigation actions. Resources open their saved URL. Teacher reports generate persisted PDF artifacts with preview, download and print.

## Compatibility and verification

Additive startup upgrades reconcile existing assignment stream/score fields, lesson delivery fields, and historical discipline schema columns/defaults. Existing records and school boundaries are preserved.

Verification includes focused frontend/backend tests; real-component browser workflows at 320, 390, 768 and 1440 pixels; and disposable PostgreSQL tests for persistence, exact recipients, zero grades, optimistic conflicts, revoked allocations, role denial, cross-school denial, PDF bytes and transactional rollback. The shared dashboard read audit exercises the legacy schema after repeated startup upgrades. No live school records are created for verification.

Production publication uses the existing GitHub CI, Railway services and gated Cloudflare Worker pipeline. Release status and post-deployment checks are recorded in the task.
