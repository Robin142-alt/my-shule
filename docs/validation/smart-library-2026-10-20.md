# Smart library verification — 20 October 2026

## Scope

The librarian command centre now uses the existing catalogue, physical-copy
table, authoritative student/staff registers, circulation ledger, permissions,
tenant context and school event infrastructure. New normalized tables provide
permanent global barcode reservations, idempotent commands, active-loan
projections, incidents and stocktakes. Existing ancillary library workspaces
remain available. No test or demo records are seeded into schools.

The implementation and physical capacity/migration contract are documented in
[the operating guide](../smart-library.md).

## Pre-deployment database evidence

The read-only Railway PostgreSQL preflight found zero catalogue titles,
physical copies, historical circulation issues, global barcode collisions and
duplicate active loans. The three older library tables also contained no
records. The migration still supports existing catalogue/circulation data and
stops on conflicting identifiers instead of modifying history.

The deployed database uses text student IDs and the original Prisma fines
table. The integration fixture reproduces these types, mandatory finance
columns and the fine-status enum. The compatibility migration retains old
links and supplies the columns needed by physical-copy circulation.

## Automated verification

- Backend TypeScript compilation passed.
- 163 Node tests passed across barcode/PDF, permission enforcement, existing
  library behavior and admin-command regressions.
- 15 PostgreSQL integration tests passed with a restricted runtime role and
  forced RLS. Coverage includes concurrent global allocation, exact large
  identifiers above JavaScript's safe-integer range, purchased-number
  collisions, replay-safe commands, permanent ownership, multiple copies,
  borrower search/history, batch issue, partial returns, concurrency,
  transactional event failures, configured fines, incidents and stocktaking.
- 128 frontend tests passed across six suites covering the new scanner and
  circulation workspaces, existing library behavior, routing, permissions and
  dashboard action contracts.
- Headless Chromium exercised the shipped workspaces at 320, 390, 768 and
  1440 pixels: issue three books, return two, register a copy, prepare 1,000
  labels, scan stocktake records without losing focus, and test scanner input.
- PDF checks verified A4 MediaBoxes, exact grid measurements, 96 positions per
  complete sheet, vector bars, quiet zones and visible rejection of codes
  outside the physical print profile. 96 / 1,000 / 4,800 labels produced
  1 / 11 / 50 pages. The final 1,000-label page contains exactly 40 labels.
- Independently rendered all 11 pages at 300 dpi and decoded every one of the
  1,000 exact Code 128 identifiers with ZXing-C++. Inspected the first/final
  page and responsive workspace screenshots.

Browser and database fixtures are isolated QA data. Software decoding and
simulated keyboard input are not hardware verification. The operating guide's
printer calibration, adhesive-paper/cutting and real USB scanner checklist
requires sign-off using the school's equipment.

## Release verification

Release identifiers and deployment checks are recorded below after CI and
production rollout. No production barcode allocations are made for smoke tests.
