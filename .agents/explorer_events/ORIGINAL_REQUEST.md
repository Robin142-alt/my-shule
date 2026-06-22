## 2026-06-20T17:02:19Z

Explore the MyShule codebase to audit the Event-Driven Architecture.
Refer to the MyShule AGENTS.md rules (especially Section 8: Event-Driven Architecture Rules).
Specifically:
1. Identify if the event bus is initialized and what library/mechanism is used for it (e.g., EventEmitter2, Redis PubSub, RabbitMQ, custom bus).
2. Examine NestJS controller and service classes (`apps/api/src/**/*.ts`) to find state-changing mutations (e.g., admitting a student, submitting marks, logging health visits, processing payments) and verify if they correctly emit events.
3. Check if the emitted event payloads include the required metadata: `event_id`, `event_type`, `school_id`, `actor_user_id`, `actor_role`, `entity_type`, `entity_id`, `timestamp`, `payload`, `source_dashboard`, `correlation_id`.
4. Identify any service files or mutations where events are completely missing.
5. Document your findings in a structured report (`event_architecture_findings.md`) in your working directory `.agents/explorer_events/`.
Include specific file names, line numbers, code snippets, and matching AGENTS.md rule references for each gap.
