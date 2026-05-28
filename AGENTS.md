# MyShule Codex Core Bootstrap

CODEx Master Bootstrap for AGP Governance, Event Bus, Widget Registry, Tenant Isolation, Database Contracts, Microservices, Cloud-Native Scaling, Self-Healing Agents, Autonomous Runtime Execution, and governed production operations.

This repository is operated as MyShule Codex Core: a production-grade, multi-tenant, event-driven school ERP operating system. Codex agents working in this repo are not isolated page builders; they are autonomous platform maintainers responsible for preserving architectural integrity, tenant isolation, event-sourced workflows, widget-driven dashboards, and self-healing runtime behavior.

## Global Execution Principles

Never hide broken UI, silently fail, bypass governance, bypass tenant isolation, bypass event emission, couple modules directly to dashboards, mutate databases without events, or remove actions because mappings are missing.

Always repair before failing, degrade instead of hide, emit events for every state change, preserve auditability, maintain replayable workflows, isolate tenant data completely, keep dashboards operational, and preserve user-visible continuity.

## Mandatory Boot Order

1. Agent Governance Protocol
2. Tenant Isolation Layer
3. Event Bus Initialization
4. Database Contract Layer
5. Widget Registry Initialization
6. Microservices Execution Layer
7. Self-Healing Autonomous Agents
8. Cloud-Native Execution Layer
9. Dashboard Execution Rules
10. Button and Action Execution Contract

## Agent Governance Protocol

AGP is the supreme execution authority. Every action must pass identity validation, capability validation, tenant validation, policy validation, and audit binding. Nothing executes outside AGP.

AGP owns capability enforcement, execution authorization, policy evaluation, workflow governance, tenant scope validation, and audit guarantees. AGP must block unauthorized execution, cross-tenant leakage, silent execution, and untracked mutations.

## Tenant Isolation Layer

The system is fully multi-tenant. Each tenant has isolated data, event streams, capability graph, widget state, workflow execution, files, caches, queues, reports, analytics, notifications, and configuration.

Supported isolation tiers:

- L1: shared schema with `tenant_id`
- L2: schema per tenant
- L3: database per tenant

Tenant escalation path is `L1 -> L2 -> L3`. Cross-tenant access is forbidden. All queries must be tenant-scoped.

## Event Bus

The event bus is the system truth layer: if it did not pass through the event bus, it did not happen. Every state mutation must emit an event.

Event bus guarantees:

- Append-only history
- Replayability
- Tenant partitioning
- Event durability
- Ordered tenant streams

Standard event categories:

- Domain events: `STUDENT_CREATED`, `FEE_PAID`, `EXAM_PUBLISHED`
- System events: `CAPABILITY_GRANTED`, `MODULE_ENABLED`, `WIDGET_UPDATED`
- Failure events: `SERVICE_TIMEOUT`, `WIDGET_FAILED`, `EXECUTION_REJECTED`
- Repair events: `REPAIR_TRIGGERED`, `REPAIR_SUCCESS`, `FALLBACK_ACTIVATED`

## Database Contracts

The database is not the source of truth. The event bus is the source of truth. Databases provide projections, query optimization, read models, and widget hydration.

Rules:

- No direct mutation without an event
- Every table is tenant-scoped
- Row-level security is mandatory for tenant data
- Every index that serves tenant data must be tenant-aware
- Event replay must be able to rebuild projections

Write flow:

```text
Command -> Validation -> Event -> Projection -> Database
```

## Widget Registry

Dashboards are static role-based layouts composed of widgets. Dashboards are not module-driven. Modules are widget providers only.

Every widget defines:

- `widget_id`
- capabilities
- allowed roles
- event subscriptions
- fallback behavior
- failure policy
- rendering state

Widget states:

- `ACTIVE`: fully functional
- `EMPTY`: no data yet
- `DEGRADED`: partially functional
- `LOCKED`: restricted
- `FAILED`: broken but visible
- `LOADING`: pending data

Broken widgets must remain visible. Never hide widgets due to failure or missing modules.

## Microservices

Each domain is an independent microservice, such as Student, Admissions, Exams, Finance, Discipline, Communication, Transport, Boarding, Labs, Inventory, Library, and Support.

Microservices own their domain logic, emit events, and expose governed APIs. They must never directly mutate UI, bypass AGP, access another service database directly, or control dashboard layout.

Communication occurs only through:

- Event bus
- Governed APIs
- Orchestration workflows

## Self-Healing Agents

The following autonomous agents are always considered part of the runtime architecture:

- Governor Agent: capability engine and AGP authority
- Execution Agents: domain microservice workers
- Orchestration Agent: workflow coordinator
- Widget Agent: UI assembly and synchronization
- Self-Healing Agent: repair loops and fallback execution
- Audit Agent: immutable logging, drift detection, replay verification, security auditing, and execution tracing

Self-healing repair order:

1. Remap function
2. Reconstruct event binding
3. Retry execution
4. Attach fallback handler
5. Degrade safely

Never remove functionality as a repair strategy.

## Cloud-Native Execution

The platform assumes containerized services, API gateway routing, PostgreSQL storage, Redis caching, event streaming, and production monitoring. Kubernetes, KEDA, Prometheus, rolling deployments, and canary deployments are the target architecture, even when the current deployment target is Railway, Vercel, or Docker.

Scaling rules:

- Horizontal scaling only
- Tenant-aware scaling
- Event-driven autoscaling where available
- Zero-downtime deployments
- Rolling or canary deployment compatibility

## Dashboard Rules

Dashboards are role-based, widget-driven, capability-filtered, operationally focused, static-layout systems.

Modules never define dashboards. Dashboards communicate only through event subscriptions, widget state updates, and the shared capability graph. Dashboard-to-dashboard coupling is forbidden.

Sidebar navigation must switch isolated workspaces, not scroll to sections on one long page. Main content is dynamic per active workspace, while sidebar and topbar stay fixed.

## Button and Action Contract

Buttons are never removed because of missing mappings. Buttons have health states:

- `ACTIVE`: operational
- `DEGRADED`: fallback active
- `FAILED`: repair required
- `LOCKED`: restricted

If a button fails, trigger the repair agent, restore mapping, inject fallback, and keep the button visible.

## Autonomous Execution Mode

Operate in full autonomous production mode:

- Prefer execution over unnecessary waiting
- Avoid unnecessary confirmations
- Maintain continuity under failure
- Self-repair before escalation
- Preserve audit trail always

When assumptions are required, log them, proceed safely, and maintain recoverability.

## Global Execution Loop

Every operation follows:

```text
Intent
-> AGP Validation
-> Capability Resolution
-> Execution Dispatch
-> Event Emission
-> Projection Update
-> Widget Synchronization
-> Health Monitoring
-> Self-Healing
-> Audit Logging
```

## Failure Policy

If any failure occurs, never remove UI, abort silently, lose events, or hide workflows.

Always emit a failure event, preserve visibility, attempt repair, degrade safely, and maintain continuity.

## Final Identity

MyShule is a distributed autonomous ERP operating system governed by AGP, powered by event sourcing, visualized through widgets, protected by tenant isolation, healed by autonomous agents, and deployed through cloud-native microservices infrastructure.

Primary success metrics:

- Operational continuity
- Architectural integrity
- Self-healing resilience
- Deterministic governance
- Tenant-safe execution
- Production stability
