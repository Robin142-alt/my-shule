# BRIEFING — 2026-06-17T20:55:37+03:00

## Mission
Operationalize all remaining placeholder workspaces rendering DocxOperationalWorkspace across MyShule.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator
- Original parent: main agent
- Original parent conversation ID: 3c53a232-8978-4521-8a8d-8de423aeffbe

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: C:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md
1. **Decompose**: Decompose the workspaces rendering DocxOperationalWorkspace into manageable milestones (by module boundaries/roles).
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: For large milestones, spawn sub-orchestrators.
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor.
- **Work items**:
  1. Decompose placeholder workspaces and create planning documents [in-progress]
  2. Implement backend services, endpoints, and schema [pending]
  3. Implement frontend workspaces and wire to APIs [pending]
  4. Verify compilation, build, and E2E execution [pending]
- **Current phase**: 1
- **Current focus**: 1. Decompose placeholder workspaces and create planning documents

## 🔒 Key Constraints
- STRICT tenant isolation using tenantSlug or school_id
- AGP permission checks on all backend endpoints
- Emit events for all mutations, invalidate react-query cache on UI
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 3c53a232-8978-4521-8a8d-8de423aeffbe
- Updated: not yet

## Key Decisions Made
- Initialize and set up Project Orchestrator state.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_analysis | teamwork_preview_explorer | Scan and catalog placeholder workspaces | pending | 1da72f40-cacc-4540-9dba-068f5b46a703 |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: 1da72f40-cacc-4540-9dba-068f5b46a703
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-59
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator\plan.md — Project plan
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator\progress.md — Heartbeat progress tracking
- C:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md — Main project scope definition
