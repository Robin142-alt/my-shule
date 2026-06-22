# Scope: Milestone 3 — Offline Sync Engine

## Architecture
- **Client Queue**: Consolidate and standardize offline records inside the `sync_queue` store of `myshule-offline-db` (IndexedDB). Enforce `schoolId` on all enqueued objects to preserve client tenant isolation.
- **Service Worker Background Sync**: Implement `/sw.js` (Service Worker) registered at startup. Listen to the `sync` event to push queued items in batches to the backend.
- **Backend Sync API**: Expose `POST /api/offline-sync/sync` (or `/api/sync/push`) to process offline sync actions in batches, delegating conflict resolution to the matching resolver.
- **Diagnostics & Status Indicators**: Update Topbar indicator to show real queue size, and wire system monitor to query `/api/sync/status`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Unified IndexedDB Store | Standardize schema inside `sync_queue` store. Add client-side validation that every enqueued operation contains `schoolId`. | None | PLANNED |
| 2 | Service Worker Registration | Create `apps/web/public/sw.js` and register it at client startup to handle background `sync` and network change events. | M3.1 | PLANNED |
| 3 | Backend Push API & Conflicts | Connect NestJS sync controllers to process batches, applying conflict resolvers (LWW for attendance, rejection for finance). | M3.2 | PLANNED |
| 4 | Diagnostic UI & Indicators | Bind Topbar indicator to `sync_queue` state and connect the System Monitor diagnostic table to the live status endpoint. | M3.3 | PLANNED |

## Interface Contracts
- **Endpoints**:
  - `POST /api/sync/push` — Batch push queued operations from IndexedDB.
  - `GET /api/sync/status` — Get current synchronization status, counts, and active conflicts.
- **Service Worker Tag**: `'sync-offline-queue'`

## Code Layout
- `apps/web/public/sw.js`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/lib/offline/sync-queue.ts`
- `apps/web/src/components/layout/Topbar.tsx`
- `apps/api/src/modules/sync/sync.controller.ts`
- `apps/api/src/modules/sync/sync.service.ts`

## References
- Audit handoff: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_3\handoff.md`
