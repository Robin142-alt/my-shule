# BRIEFING — 2026-06-19T18:31:00+03:00

## Mission
Implement real domain logic for the 930+ empty event consumers across the MyShule backend, ensuring all event-driven workflows complete successfully without silent failures, and prioritize critical workflows (Admissions, Finance, Discipline, Exams, Boarding).

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_phase4\
- Original parent: main agent
- Original parent conversation ID: 99d5f7f9-45e1-4ab5-b2c8-c7fc25764f45

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_phase4\PROJECT.md
1. **Decompose**: Decompose the task into milestones based on critical/non-critical consumers and execute sequentially or in parallel.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn a subagent to explore the codebase, prioritize modules, and implement changes.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor.
- **Work items**:
  1. Audit and plan [done]
  2. Implement critical event consumers (Admissions, Finance, Discipline, Exams, Boarding) [done]
  3. Log non-critical event consumers safely [done]
  4. Verify compilation and run tests [done]
- **Current phase**: 4
- **Current focus**: Complete

## 🔒 Key Constraints
- Never write, modify, or create source code files directly (delegate to subagents).
- Never run build/test commands yourself (require workers to do so).
- If Forensic Auditor reports INTEGRITY VIOLATION, milestone fails unconditionally.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 99d5f7f9-45e1-4ab5-b2c8-c7fc25764f45
- Updated: not yet

## Key Decisions Made
- Carry over the milestone decomposition and status.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
| explorer_phase4_audit | teamwork_preview_explorer | Scan codebase for stubs & empty consumers | completed | 85e6dad9-3f26-44fe-8100-a940609a193c |
| worker_phase4_remediate | teamwork_preview_worker | Remediate event consumer stubs & compile | completed | 0d3fe41c-097c-4449-bbba-e0471d1ebd8c |
| auditor_verify_phase4 | teamwork_preview_auditor | Perform forensic audit verification | completed | f406602c-9c41-4a55-8f06-8ceba3a169f8 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-23
- Safety timer: none

## Artifact Index
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_phase4\plan.md — Detailed decomposition and milestones plan.
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_phase4\progress.md — Liveness heartbeat and checklist tracker.
- C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_phase4\handoff.md — Final phase handoff report.
