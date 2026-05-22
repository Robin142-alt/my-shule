# Implementation 400 Enterprise UI/UX Standardization

Status: validated, release-gated by frontend lint, build, design tests, and desktop/mobile render verification.

## Brand System

- [x] Primary navy blue `#071D49` is the structural color for sidebars, system chrome, headers, branding, and executive analytics.
- [x] Primary orange accent `#FF7A1A` is the action and attention color for buttons, active states, notification badges, KPI emphasis, focus states, and chart highlights.
- [x] Light neutral background `#F3F4F6` is the main workspace background.
- [x] Primary text blue `#0F2345` is the default text, heading, label, statistic, and table-header color.
- [x] White `#FFFFFF` is the default card, table, dialog, input, and panel surface.

## Implemented Source Evidence

- [x] CSS design tokens and reusable component classes: `apps/web/src/app/globals.css`
- [x] Tailwind color system: `apps/web/tailwind.config.ts`
- [x] TypeScript design-token registry: `apps/web/src/lib/design-system/tokens.ts`
- [x] Enterprise app shell background and responsive content layout: `apps/web/src/components/system/app-frame.tsx`
- [x] Navy sidebar with white navigation and orange active rail: `apps/web/src/components/system/app-sidebar.tsx`
- [x] White top navigation with search, status, and orange notification badge: `apps/web/src/components/system/app-topbar.tsx`
- [x] Reusable button system with orange primary and navy secondary variants: `apps/web/src/components/ui/button.tsx`
- [x] White card system with subtle borders and shadows: `apps/web/src/components/ui/card.tsx`
- [x] White responsive table system with navy headers and pagination: `apps/web/src/components/ui/data-table.tsx`
- [x] Dashboard KPI and analytics primitives using orange highlights and navy text: `apps/web/src/components/ui/command-primitives.tsx`
- [x] Tabs, modals, auth cards, auth forms, and auth submit controls aligned to the enterprise palette.
- [x] PWA/browser metadata colors: `apps/web/src/app/layout.tsx`, `apps/web/src/app/manifest.ts`, `apps/web/src/app/opengraph-image.tsx`

## Validation Gates

- [x] `npm.cmd --prefix apps/web run lint`
- [x] `npm.cmd --prefix apps/web run build`
- [x] `npm.cmd --prefix apps/web run test:design -- implementation100-theme implementation200-theme principal-command-center module-readiness experience-shells`
- [x] Browser verification of the school ERP shell and executive dashboard at desktop and mobile sizes.
