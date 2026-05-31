# Neon Usage Optimization Plan

## Goal

Reduce avoidable Neon/PostgreSQL reads, writes, connections, and wake-ups for MyShule while preserving dashboards, tenant isolation, authentication, notifications, approvals, invitations, and cross-dashboard communication.

## Current Findings

- The repo does not use Prisma; the production database path is NestJS plus direct `pg` through `DatabaseService`.
- Vercel/serverless defaults can still allow a 20-connection API pool unless explicitly capped.
- Principal dashboard currently combines SSE updates with a 45-second background refetch loop.
- School notifications poll every 30 seconds while the dashboard is open.
- Principal dashboard reads create audit log writes for each dashboard load/refresh.
- Tenant user management and billing invoice/activity paths include unbounded list queries.

## Implementation Steps

1. Cap serverless database pool defaults and add serverless-friendly pool behavior.
2. Reduce always-on dashboard polling while retaining page-load, focus, manual/SSE-driven refresh, and visible loading/error states.
3. Rate-limit noisy dashboard-view audit writes so meaningful actions remain auditable without action-history spam.
4. Add pagination defaults to hot management/list endpoints.
5. Ensure searches remain debounced on the frontend where live queries are used.
6. Add tenant-aware indexes for realtime stream and user/invite list paths.
7. Run targeted API and web tests, then build/lint where feasible.

## Safety Rules

- No dashboard, button, route, form, role permission, print preview, notification, support ticket, invitation, or approval workflow is removed.
- All query and mutation paths remain tenant-scoped through request context and explicit `tenant_id` predicates.
- Heavy reports remain on-demand only.
