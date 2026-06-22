# BRIEFING — 2026-06-22T11:43:00+03:00

## Mission
Coordinate implementation of the four major Phase 5 feature pillars (Offline Sync Engine, Core Approval Workflow Engine, Automated PDF Generation, E2E Tenant Security Test Suite) in MyShule codebase.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars
- Original parent: main agent
- Original parent conversation ID: 80917725-7dd3-44b2-9101-9cdca0010fe3

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\PROJECT.md
1. **Decompose**: Decompose the four feature pillars into milestones, matching each to an Explorer -> Worker -> Reviewer cycle.
2. **Dispatch & Execute** (pick ONE):
   - **Direct (iteration loop)**: Spawn specialized explorer, worker, and reviewer subagents directly from this orchestrator context to execute work items.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  - Milestone 1: Centralized Approvals Integration & Deprecation [pending]
  - Milestone 2: Automated PDF Generation & Frontend Buttons [pending]
  - Milestone 3: Offline Sync Service Worker & Schema Drift Alignment [pending]
  - Milestone 4: Playwright E2E Tenant Isolation Tests [pending]
- **Current phase**: 2
- **Current focus**: Milestone 1 & Milestone 2 implementation

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Enforce strict school isolation and event-driven architecture per AGENTS.md.
- Forensic Auditor audit is a binary veto. If audit fails, iteration fails.
- Do not spawn sub-orchestrators using the 'self' archetype to avoid resource exhaustion; spawn workers, explorers, and reviewers directly.

## Current Parent
- Conversation ID: 80917725-7dd3-44b2-9101-9cdca0010fe3
- Updated: 2026-06-22T11:43:00+03:00

## Key Decisions Made
- Resume direct iteration loop (Explorer -> Worker -> Reviewer) for incomplete features.
- Avoid using 'self' archetype for sub-orchestration.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Worker 1 | teamwork_preview_worker | Implement Milestones 1 & 2 | pending | fd882d79-4326-457b-b0d4-cf67b186336e |
| Worker M1 | teamwork_preview_worker | Approvals Integration | in-progress | d8290216-d67a-4188-b299-dbe487cc93a7 |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: d8290216-d67a-4188-b299-dbe487cc93a7
- Predecessor: 3790d9e3-e636-4fb6-9af5-0f75058b7843
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: f110266d-e628-4e89-9612-20d20c4db13a/task-38
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\PROJECT.md — Global index for the milestone plan
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\progress.md — Heartbeat and status check file
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\plan.md — Detailed execution steps
