# BRIEFING — 2026-06-19T11:15:57+03:00

## Mission
Coordinate the team to remediate the "facade" implementations and restore test integrity in the MyShule backend.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen6
- Original parent: main agent
- Original parent conversation ID: e2ebc06f-b690-4bbe-a4c1-81fd8d0246ca

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: C:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md
1. **Decompose**: Decompose the facade remediation into logical milestones for execution.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn sub-orchestrators for milestones or execute via Explorer -> Worker -> Reviewer loop.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at spawn count 16. Write handoff.md, spawn successor.
- **Work items**:
  1. Explore current codebase and identify 9 facade controllers and test file [pending]
  2. Implement backend logic for 9 controllers [pending]
  3. Restore exams.test.ts [pending]
  4. Run E2E and build checks [pending]
- **Current phase**: 1
- **Current focus**: Explore current codebase

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- Enforce strict tenant isolation (schoolId) and MyShule Constitution.
- Never reuse a subagent after it has delivered its handoff.

## Current Parent
- Conversation ID: e2ebc06f-b690-4bbe-a4c1-81fd8d0246ca
- Updated: not yet

## Key Decisions Made
- Initial setup

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_preview_explorer | Explore codebase for stubs & test files | completed | 5abebd53-0691-44b2-8b36-9c392f4b10fd |
| worker_ms1 | teamwork_preview_worker | Implement Milestone 1: Academics & Secretary stubs | completed | 86da2393-2cdd-4d63-b8d4-d0ce146c6733 |
| worker_ms2 | teamwork_preview_worker | Implement remaining stubs & restore exams.test.ts | completed | c246c5ca-7d23-41e8-9c18-7743746db0c7 |
| auditor | teamwork_preview_auditor | Forensic audit of backend stubs and test integrity | in-progress | a7adef91-b6de-4673-9228-920ff6b6d73e |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: [a7adef91-b6de-4673-9228-920ff6b6d73e]
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-15
- Safety timer: task-425

## Artifact Index
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen6\ORIGINAL_REQUEST.md — Original User Request
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen6\BRIEFING.md — Persistent working memory briefing
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen6\progress.md — Liveness and step tracking
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen6\plan.md — Detailed action plans
