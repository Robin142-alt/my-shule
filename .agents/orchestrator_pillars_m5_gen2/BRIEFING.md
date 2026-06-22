# BRIEFING — 2026-06-22T15:52:00+03:00

## Mission
Coordinate implementation of the four major Phase 5 feature pillars (Offline Sync Engine, Core Approval Workflow Engine, Automated PDF Generation, E2E Tenant Security Test Suite) in the MyShule codebase.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars_m5_gen2
- Original parent: main agent
- Original parent conversation ID: 009b856f-b7f4-4395-9c51-6d43acba5dcf

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: c:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md
1. **Decompose**:
   - Milestone 1: Centralized Approvals Integration & Deprecation (Discipline controller integration, bypass endpoint deprecation)
   - Milestone 2: Automated PDF Generation (Backend controller download endpoints & frontend button wiring)
   - Milestone 3: Offline Sync Engine (Backend `/sync/flush` endpoint and frontend sync-flush loop/reconnect listeners)
   - Milestone 4: E2E Playwright Tenant Isolation Tests (E2E tests checking cross-tenant API requests)
2. **Dispatch & Execute**:
   - Direct (iteration loop): Spawn specialized worker and reviewer subagents directly from this orchestrator context.
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
  - Milestone 3: Offline Sync Engine [pending]
  - Milestone 4: Playwright E2E Tenant Isolation Tests [pending]
- **Current phase**: 1
- **Current focus**: Milestone 1 (Approvals Integration)

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Enforce strict school isolation and event-driven architecture per AGENTS.md.
- Forensic Auditor audit is a binary veto. If audit fails, iteration fails.

## Current Parent
- Conversation ID: 009b856f-b7f4-4395-9c51-6d43acba5dcf
- Updated: 2026-06-22T15:52:00+03:00

## Key Decisions Made
- Directly run implementation and review steps via specialized subagents under `.agents/` workspace.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: 4c422a35-5485-4554-8e10-2fde9cc4acf0
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-63
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md — Global index for the milestone plan
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars_m5_gen2\progress.md — Heartbeat and status check file
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars_m5_gen2\plan.md — Detailed execution steps
