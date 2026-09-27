# Authenticated visual system — 27 September 2026

MyShule now has a shared visual foundation for authenticated school, platform,
parent, and student experiences. The palette pairs ink-blue navigation with
bright content surfaces, warm orange accents, and restrained blue, teal, amber,
and violet metric markers. Inter is hosted locally, with its OFL license included.

## Implementation

- `apps/web/src/app/authenticated-premium.css` owns the screen-only visual layer.
  Its app rules are scoped to `.authenticated-app`; portal-mounted sheets and
  dialogs use their existing explicit component classes. Public pages and print
  layouts keep their existing appearance.
- Shared navigation, school identity, welcome headers, metric cards, buttons,
  forms, tables, tabs, empty states, and modal sheets use the new visual language.
  Existing breakpoints, navigation focus management, mobile keyboard behavior,
  safe-area handling, and reduced-motion preferences remain supported.
- The Principal overview has real workspace shortcuts, brighter metrics, a risk
  panel, and the activity already supplied by its school-scoped overview contract.
  Registry widgets retain their existing dark-surface contract.
- Finance uses a brighter workspace with corresponding loading, error, and empty
  treatments. Its existing payment, invoicing, and approval actions are preserved.
- The Teacher overview has a timetable shortcut and clearer quick actions. Header
  search now filters existing teacher workspaces, opens the selected workspace,
  supports Escape, and explains an empty search result.
- Font assets bypass experience routing as static assets. No remote font request
  is required from users' browsers.

## Governance and data boundary

This is a presentation change plus navigation to existing workspaces. It adds no
database mutations, permissions, tenant selection, seeded records, API endpoints,
or notification behavior. Existing authenticated services, tenant-aware query
keys, event subscriptions, authorization, approval, audit, and report contracts
remain in place. Principal activity is read from the existing overview response.

## Verification

- Production build and TypeScript passed during implementation.
- The final targeted workflow run passed 101 tests in five suites: Principal
  readiness, Accountant contract, Teacher routing/search, dashboard communication
  tenant isolation, and role switching. It includes the new overview shortcuts
  and activity rendering checks.
- Shared component, mobile navigation, greeting, and layout checks passed 18 tests;
  two snapshots changed only for the intended component styling hooks.
- Role identity and experience shell checks passed in the earlier targeted run.
- The isolated role browser sweep passed 310 checks: 155 role/workspace cases at
  320 and 1440 pixels, spanning 25 roles. It checks mounting, runtime errors,
  horizontal overflow, mobile record fields, selected settings interactions, and
  the library's print-table behavior.
- After the final spacing and contrast refinements, a further 40 layout checks
  passed for Principal, Teacher, Accountant, Parent, and Student views at 320,
  390, 768, and 1440 pixels.
- The shared component browser harness passed at 320, 390, 430, 768, 1024, and
  1440 pixels, plus 844-pixel landscape. It exercises navigation, modal reachability,
  nested dialogs, scroll locking, tables, keyboard tabs, and locally loaded fonts.
- Targeted lint passed with no errors; the Teacher shell retains its existing
  `react-hooks/set-state-in-effect` warning for route synchronization.

The browser fixtures render production components and CSS with isolated test data;
they do not contact live schools or persist records. This verifies presentation
and existing tested workflow behavior, not a live production deployment or a new
end-to-end certification of every backend workflow.

Screenshots and machine-readable results are in `output/mobile-roles` and
`output/mobile-product`. Reproduce with:

```powershell
cd apps/web
npm run build
npm run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx tests/design/accountant-command-center-contract.test.ts tests/design/teacher-dashboard-routing.test.tsx tests/design/dashboard-communication-tenant.test.tsx tests/design/school-dashboard-role-switcher.test.tsx
node tests/design/mobile-product-browser.mjs
node tests/design/mobile-roles-browser.mjs --all-workspaces
```

For an isolated, read-only visual review, run
`node tests/design/mobile-roles-browser.mjs --preview` and open
`http://127.0.0.1:3016/school/principal/overview`.
