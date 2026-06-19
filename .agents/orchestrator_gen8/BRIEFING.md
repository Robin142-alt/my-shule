# BRIEFING — 2026-06-19T13:04:53+03:00

## Mission
Eliminate all remaining 88 backend stubs, fix 15 silent error fallbacks, and remediate the frontend bulk invoicing dead button to make MyShule production-ready.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen8\
- Original parent: Sentinel
- Original parent conversation ID: 9a8bd97a-063c-403b-b7e3-8138bbf17e35

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: C:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md
1. **Decompose**: Broken requirements down into 5 milestones (M1 to M5) covering Admin-Command, Auth/Parent Portal, remaining stubs, error catches/frontend, and E2E verification.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn a subagent/sub-orchestrator to investigate, implement, and review files for each milestone.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor.
- **Work items**:
  1. Milestone 1: Admin-Command Controller Remediation [pending]
  2. Milestone 2: Auth & Parent Portal Remediation [pending]
  3. Milestone 3: Clinic, Library, Labs, and Remaining Module Stubs [pending]
  4. Milestone 4: Error Fallbacks & Frontend Gaps [pending]
  5. Milestone 5: Verification & E2E Validation [pending]
- Current phase: 1
- Current focus: Milestone 1: Admin-Command Controller Remediation

## 🔒 Key Constraints
- Never write, modify, or create source code files directly (delegate to subagents).
- Never run build/test commands yourself (require workers to do so).
- If Forensic Auditor reports INTEGRITY VIOLATION, milestone fails unconditionally.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 9a8bd97a-063c-403b-b7e3-8138bbf17e35
- Updated: not yet

## Key Decisions Made
- Decomposed the 88 stubs, 15 fallbacks, and 1 frontend button issue into 5 sequential milestones.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Explorer M1.1 | teamwork_preview_explorer | Investigate admin-command stubs | completed | 915d3816-6bd3-478c-a708-89225a50a366 |
| Worker M1.1 | teamwork_preview_worker | Implement admin-command stubs | completed | 07016ffe-44eb-4888-b129-0b72f61a8c54 |
| Reviewer M1.1 | teamwork_preview_reviewer | Review admin-command changes | completed | 8e581e34-5a5a-4578-812e-a775e9c12f32 |
| Explorer M2.1 | teamwork_preview_explorer | Investigate auth & parent portal | completed | 5d63e51e-f105-4edd-923e-044180fd3308 |
| Worker M2.1 | teamwork_preview_worker | Implement auth & parent portal | completed | d264ea5b-f2bf-412a-96e5-c90b180a0743 |
| Reviewer M2.1 | teamwork_preview_reviewer | Review auth & parent portal | in-progress | afa72337-03e4-41fc-845d-a9f0ac98d5b2 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-47
- Safety timer: task-235
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen8\plan.md — Detailed decomposition and milestones plan.
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_gen8\progress.md — Liveness heartbeat and checklist tracker.
