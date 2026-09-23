# Authenticated mobile experience

The authenticated shells share mobile typography, spacing, surfaces, touch targets,
safe-area spacing and navigation behavior through `apps/web/src/app/authenticated.css`.
The changes preserve existing routes, action handlers, API contracts, role checks,
school scope, event emission and persistence paths.

## Layout conventions

- Put `authenticated-app` on the application shell. `app-padded` gives standalone
  workspaces a 12px phone gutter. Public pages keep their own styling.
- Use `app-command-main`, `app-command-topbar` and `app-content` for command centers.
  Phones use document scrolling; desktop workspaces retain their existing layout.
- `app-workspace-panel` provides consistent compact panels. `app-metric-grid` is
  for summary metrics, with two columns on phones. Do not apply it to form grids.
- Mobile operational workspaces omit the repeated outer introduction; their own
  heading, actions and active navigation label provide context.
- `app-workspace-surface` removes a redundant mobile container around light panels.
  Dark content must retain `app-dark-workspace` or `app-principal-workspace` so that
  its light text remains readable.
- Mobile navigation is searchable and grouped. It becomes a bottom sheet on phones
  and a side panel on tablets. Selection keeps the existing role-specific routing.

## Records and overlays

`DataTable` displays compact labeled records on mobile. `RecordTable` gives existing
native table markup the same treatment without duplicating controls. It derives
labels from the header and preserves the cells, handlers, keys and table semantics.
Spanning headers and complex matrices retain their original layout. Mobile changes
are screen-only; printable tables remain tables.
Use `app-record-table-dark` for native records on the principal's dark surfaces.

The shared `useModalLayer` hook coordinates dialogs, drawers and navigation. Only
the top layer handles Escape and Tab. Closing a nested dialog keeps the underlying
scroll lock and restores focus. Sheets follow the visual viewport and safe areas;
forms retain scrollable bodies and reachable actions. Motion honors the existing
reduced-motion preference.

Metrics no longer receive a hard-coded decorative sparkline from `MetricGrid`.
`CommandMetricCard` draws a sparkline only when values are supplied.

## Repeatable verification

Run from `apps/web`:

```powershell
node tests/design/mobile-product-browser.mjs
node tests/design/mobile-roles-browser.mjs
node tests/design/mobile-roles-browser.mjs --all-workspaces
npx jest --config jest.config.ts --runInBand mobile-product mobile-workspace-navigation modal.test header-popover
npx tsc --noEmit --pretty false
npx next build
```

The shared-component browser suite covers 320px, 390px, 430px, 768px, 1024px,
1440px and phone landscape. It checks page bounds, navigation, forms, nested
overlays, focus, tab navigation and browser errors.

The role browser suite renders actual role components at 320px, 390px, 768px and
1440px. It includes long record values, loaded principal workflow fixtures, and
both empty and unavailable data states. Principal settings additionally check the
reset link's bounds and contrast, and 44px switch targets.
The `--all-workspaces` option also follows the operational role registry and the
principal and finance section registries at phone and desktop widths. It verifies
that mobile record layouts return to ordinary tables for printing.
Screenshots and machine-readable results are written to `output/mobile-product`
and `output/mobile-roles` (ignored by Git).

## Verification results — 23 September 2026

- Production build: passed, including 96 generated static pages.
- TypeScript: passed.
- Shared-component browser checks: all seven viewport configurations passed.
- Role overview and representative records: 132 checks passed across four widths.
- Expanded registry coverage: 155 workspaces, 310 phone/desktop checks passed;
  no document or detected content overflow, and no browser exceptions.
- Teacher marks entry and submission: passed at 320px, 390px, 768px and 1440px.
- Final focused Jest batch: 13 suites, 125 tests passed, including principal
  routing/workflows, tenant cleanliness, mobile navigation, overlays and PWA rules.
- Dashboard action contracts and related dean/exam suites: 123 tests passed.
  Updated the deputy contracts to verify the shared workflow read endpoint and
  its permission guard, plus the retained delay command's school scope. Dean
  contracts parse actual API calls to verify typed/multiline calls, HTTP methods,
  object bodies, moderation/transition endpoints and confirmed write counts.
  A behavior regression also checks deputy loading and refresh with the current
  school scope. The librarian contract verifies the touch/keyboard menu and its
  existing action handlers. These mobile and action contracts now run in CI.
- Targeted lint: no errors; the existing principal settings state-sync effect
  retains its `react-hooks/set-state-in-effect` warning.
- Release gates after the contract fixes: full frontend lint, backend typecheck,
  and a fresh production frontend build passed. Existing lint warnings remain
  visible; no lint rules, permission checks or tenant safeguards were weakened.

These browser fixtures run locally with isolated data; they do not certify live
provider delivery, production tenant workflows or physical iOS/Android behavior.
Installed-mode and offline behavior are additionally covered by the existing PWA
regression suites. Physical-device acceptance remains appropriate before release.
