# BRIEFING — 2026-06-20T16:06:52+03:00

## Mission
Upgrade the exams and analytics module in the MyShule platform to match and exceed the capabilities of Zeraki Analytics.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_exams_analytics\
- Original parent: main agent
- Original parent conversation ID: 6afdaa80-f898-418c-9f60-c9816acb4794

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_exams_analytics\SCOPE.md
1. **Decompose**: Decomposed the scope into 5 clear milestones targeting backend endpoints, frontend visualization, tests, and audit checks.
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: None. We will run the iteration loop directly by spawning specialized subagents (Explorer, Worker, Reviewer, Auditor).
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Decompose & Investigate [done]
  2. Implement Backend Endpoints [done]
  3. Implement Frontend Dashboard [in-progress]
  4. Write Automated Programmatic Tests [pending]
  5. Verification & Audit [pending]
- **Current phase**: 3
- **Current focus**: Implement Frontend Dashboard

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- Enforce strict tenant isolation (using `schoolId` / `tenant_id` from requestContext).
- Do not use hardcoded mock/demo data for invited tenants.
- Ensure all actions are event-emitting and AGP-compliant.

## Current Parent
- Conversation ID: 6afdaa80-f898-418c-9f60-c9816acb4794
- Updated: not yet

## Key Decisions Made
- Chose to create Tailwind CSS-based visualizations on the frontend for zero-dependency reliability and gorgeous responsive dashboard layout.
- Decided to add 4 backend analytics endpoints: summary, trends, subject-performance, and student-progress.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Explorer | teamwork_preview_explorer | Investigate exams and analytics | completed | 71183dba-62b2-495b-bba3-e9c4ef15b747 |
| Worker (Backend) | teamwork_preview_worker | Implement analytics NestJS backend | completed | 31ebb13e-d5cf-47c9-ac51-24c926b2d190 |
| Worker (Frontend) | teamwork_preview_worker | Implement analytics frontend dashboard | pending | 90b2caf1-ebfe-4280-945c-db316f572870 |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: [90b2caf1-ebfe-4280-945c-db316f572870]
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-41
- Safety timer: task-342
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- SCOPE.md — Milestone and scope planning document.
- plan.md — High-level project plan.
- progress.md — Heartbeat and progress checklist.
