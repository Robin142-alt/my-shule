# Compact authenticated mobile experience

## Scope

Mobile navigation uses a left drawer capped at 280px and 78vw, leaving the current workspace visible. The shared drawer retains grouped destinations, search for large menus, full labels, selected state, keyboard focus containment, Escape/backdrop dismissal, and scroll locking. Principal and platform sidebars use the same compact proportions. Admissions and Inventory module navigation uses this drawer on smaller screens while retaining descriptions, status badges, footer content, and existing selection handlers.

Shared dashboard introductions, role controls, content spacing, page headings, panels, and empty states use compact mobile spacing. Teacher and Class Teacher place navigation alongside the existing inbox controls. Greeting, school context, dashboard title, assigned-role switching, workflow actions, and desktop navigation remain available.

No API, authentication, permission, tenant, database, event, notification, approval, audit, or workflow contracts changed. The existing role-switch contract was reviewed: the backend still verifies the session, assigned role, school scope, permissions, MFA requirements, credential rotation, and audit recording.

## Verification

- Production web build passed, including TypeScript and all 96 generated pages.
- Two focused Jest batches passed: 73 and 104 tests. Coverage includes routing, role switching, leadership teaching roles, Principal workflows, Admissions, Inventory, module navigation, mobile dialogs, timetable layout, and low-bandwidth behavior.
- Final browser run passed 170 role/workspace cases at 320, 390, 768, 1024, and 1440px. Checks include overflow, runtime errors, drawer width and touch targets, last-item reachability, role dialog access, focus restoration, and scroll unlocking.
- The shared component browser suite passed seven portrait, landscape, tablet, and desktop viewports, including module navigation callbacks, badges/footer content, nested dialogs, forms, and keyboard navigation.
- A broader sweep passed 312 role/workspace cases at 320 and 1440px before the final page-header spacing and module-shell refinements. The final 170-case run and shared component suite include those refinements.
- Changed components and tests passed targeted ESLint with no errors. Three existing React effect warnings remain in the Teacher and Principal components.
- Full frontend lint completed with zero errors and 1,564 repository warnings; no lint rules or checks were weakened.
- Visual review included Teacher Lesson Log and navigation, Principal navigation/settings, and finance and academic workspaces. At 390px, the Teacher introduction measures about 88px and its combined toolbar 61px. At 320px, the introduction grows to about 126px to accommodate wrapping.

The browser suites render actual components with isolated contract-shaped fixtures and block external requests. They do not certify every live school workflow or make production school-data mutations. Existing workflow tests provide the action/contract coverage for this UI-only change.

## Reproduction

Run from `apps/web`:

```text
npm run build
node tests/design/mobile-product-browser.mjs
node tests/design/mobile-roles-browser.mjs
node tests/design/mobile-roles-browser.mjs --all-workspaces
npm run test:design -- --runTestsByPath tests/design/mobile-workspace-navigation.test.tsx tests/design/mobile-product.test.tsx tests/design/school-dashboard-role-switcher.test.tsx tests/design/leadership-teacher-role-switch.test.tsx tests/design/role-switch-consistency.test.tsx tests/design/experience-shells.test.tsx tests/design/school-command-center-routing.test.tsx
npm run test:design -- --runTestsByPath tests/design/mobile-workspace-navigation.test.tsx tests/design/admissions-workspace.test.tsx tests/design/inventory-workflow.test.ts tests/design/mobile-low-bandwidth.test.tsx tests/design/deputy-timetable-management-mobile.test.tsx tests/design/header-popover.test.tsx tests/design/principal-production-readiness.test.tsx
```

Browser screenshots and JSON results are generated under the ignored repository `output/mobile-roles` and `output/mobile-product` directories. No schema migration or data backfill is required. Rollback is a revert of this UI commit followed by the normal web deployment.

## Follow-up: fixed mobile MENU tab

Only primary mobile navigation triggers move to a fixed left-edge MENU tab below 1024px. The tab has a 52px minimum width, a 44px minimum touch height, and an 84% opaque navy background with an opaque white label. Existing top triggers remain at larger breakpoints. Module section controls remain inline to avoid overlapping the primary menu tab.

The same drawer state, items, nested destinations, icons, permissions, routes, and selection callbacks are retained. A portal keeps the tab attached to the viewport despite toolbar blur or scrolling. Outside-tap dismissal prevents the browser from moving focus away after it returns to the tab. Hidden layout markers preserve header sibling-count rules when the trigger moves out of its header. No dashboard, content, backend, or workflow redesign is included.

Verification: the final production build and TypeScript passed; 117 focused navigation, routing, Principal workflow, and tenant-cleanliness tests passed; targeted lint passed without warnings or errors. The final browser suite passed 170 cases at 320, 390, 768, 1024, and 1440px, checking one narrow translucent tab, fixed placement during scrolling, drawer dismissal, focus restoration, and resizing back to desktop. The shared component browser suite passed seven viewports before the final tab-width/opacity adjustment. Teacher, Principal, and Super Admin desktop screenshots are byte-identical to the preceding release. Browser checks use isolated fixtures rather than production school data.
