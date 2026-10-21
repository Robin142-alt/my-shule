# Librarian dashboard integration repair — 21 October 2026

The live `/school/librarian/overview` route rendered `LiveRoleCommandCenter`.
The smart-library release had connected its barcode workflows to
`LibrarianCommandCenter`, which that route did not render. The active sidebar
and workspace map therefore continued to expose the older library screens.
Component-only tests and unauthenticated deployment smoke tests did not catch
this integration gap.

The repair connects the existing smart-library components to the active
dashboard. It updates both desktop and mobile navigation, keeps the existing
catalogue/issue/return/borrower URLs, and resolves the earlier smart-library
link aliases to the corresponding active workspaces. Fines and reports remain
connected to their existing services. No backend or database change is needed.

Regression coverage now renders the actual `LiveRoleCommandCenter`, verifies
its navigation and direct links, and issues multiple books from the live
dashboard with one borrower selection. The Chromium workflow uses that same
dashboard and its actual desktop/mobile navigation with isolated API fixtures,
instead of a test-only menu around individual library components. It checks
registration, multi-book issuing, partial returns, label quantity, stocktaking
and keyboard scanner input at 320, 390, 768 and 1440 pixels. The regression
suite is included in the existing CI quality gate.

Local verification passed 73 tests across eight focused suites, covering the
live route, library workflows, module access and desktop/mobile navigation.
The Chromium checks passed at all four viewport widths with no page errors or
horizontal overflow. Changed TypeScript files passed ESLint (one existing
unused-variable warning in the older test). Full application type checking
and the production build are required in CI; the local type check was stopped
because this machine ran out of available memory, not recorded as a pass.

The fixtures never create school records or reserve production barcodes.
Production health and unauthenticated JSON/PDF access are checked separately.
Real adhesive-paper printing, cutting and USB hardware verification still use
the checklist in [the operating guide](../smart-library.md).
