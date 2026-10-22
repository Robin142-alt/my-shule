# Smart library operating contract

The library extends the existing `library_catalog_items`, `library_copies`,
`library_borrowers` and append-only `library_circulation_ledger`. No school data
is seeded. Existing titles, copies and circulation history remain intact.

CODEx Master Bootstrap, AGP Governance, Autonomous Runtime Execution, Agent
Governance Protocol, Tenant Isolation Layer, Event Bus Initialization, Database
Contract Layer, Widget Registry Initialization, Self-Healing Autonomous Agents,
Cloud-Native Execution Layer and Global Execution Loop remain the governing
application contracts.

## Identity, ownership and migration

`library_barcode_sequence` is a PostgreSQL BIGINT sequence starting at 1,
without cycling. Allocation calls `nextval` on the server and formats its decimal
text with a minimum of six digits. JavaScript never converts identifiers to
numbers. No maximum digit count is imposed on allocation. Database capacity is
9,223,372,036,854,775,807; this is enormous, finite capacity.

`library_barcode_registry.barcode` is the global primary key. All identifiers,
including imported and legacy stickers, enter the same registry. The identifier
is exact, case sensitive printable ASCII text; leading zeros remain significant.
External strings are not parsed as numbers. Numeric generated candidates that
are already reserved are skipped. A successful 1,000-label request reserves
exactly 1,000 registry records. A failed transaction can leave sequence gaps;
gaps are safe and never reclaimed.

Registry rows, ownership and assigned-copy relationships are protected by
database triggers. Identifiers cannot be deleted, recycled, moved to another
school or silently reassigned. Retirement retains both copy and barcode.
Application roles can use `nextval` but cannot reset the sequence. The registry
has forced RLS, just like every added school-owned table. Global uniqueness
checks do not return another school's ownership or book information.

The existing serialized schema bootstrap applies the additive migration.
Before release, `scripts/library-preflight.mjs` inspects production in a
read-only transaction. Global duplicate labels or multiple active loans for one
copy must be reviewed before deployment. The migration stops on collisions:
it does not delete, merge or silently renumber historical records. Resolve such
cases with an approved, audited relabelling plan, retain the original
identifier/history, physically replace affected stickers, then rerun preflight.

The new `library_copy_loans` table is a projection of existing issue/return
ledger events, using the issue event's ID as the loan ID. An insert trigger
maintains it for all circulation writes. A partial unique index permits only
one open loan per physical copy. Old routes are adapters to the same new
transactional commands. Catalogue deletion retires copies and preserves history.
Compatibility defaults support the deployed ledger's required timestamps and
the older reservation table's missing status field and text queue positions.
Existing transaction timestamps and reservation values are preserved.

## Transactions and retries

The PostgreSQL workflow tests use the production `PrismaService` and pg adapter,
including the runtime role and tenant transaction context. Keep this boundary
real: a direct pg substitute accepts PostgreSQL `void` results that Prisma
rejects. Advisory-lock queries cast their result to text without changing lock
ownership or lifetime. Allocation and borrower-lock regressions must exercise
this production client, concurrent requests and idempotent retries.

All writes run in the existing tenant transaction context. Issue commands lock
the authoritative borrower and physical copies; limits include all legacy
borrower references for that person. Returns lock copies and open loans. Each
new return names its original issue explicitly. Invalid batches roll back
entirely. Partial returns simply contain a subset of the borrower's copies.

Mutations validate UUID request IDs and save the command hash/result in
`library_commands`. Repeating the same command returns its saved result.
Reusing its ID for different details is rejected. The interface retains its ID
after a failed request. Audit rows and school operational events use the same
transaction; an event failure rolls back the mutation. Existing notification
infrastructure targets active borrower/guardian accounts and finance recipients
for configured fines. No new lost/damaged/overdue penalty amounts are invented.

## Barcode print contract and finite physical capacity

BWIPP through `bwip-js` generates genuine Code 128, automatically selecting Code
C for numeric pairs. PDFKit draws vector bars, checksummed by the encoder,
including the exact text beneath each symbol. Parsing of special FNC escape
sequences is disabled for external identifiers.

The PDF MediaBox is exactly 210 × 297 mm. The grid is 6 columns × 16 rows:
32 × 15 mm labels, 1 mm gaps, 6.5 mm side margins and 21 mm top/bottom margins.
Partial final pages leave unused slots empty. Reprinting reads the same
reservations and never allocates new identities. A calibration page uses
explicit non-inventory `TEST` symbols and a 100 mm measuring rule.

Quiet zones are at least 10 modules on each side. The supported module width
is 0.254–0.3387 mm (3–4 printer dots at 300 dpi). Barcode and quiet zones fit
within 31 mm, leaving cutting clearance. Bars are 9.2 mm tall. Identifiers that
cannot meet this density on the requested label fail with an explicit message;
the system never quietly shrinks them, truncates them, or changes their value.
Code 128-C decimal pairs are more compact than ordinary base-36 text in Code B.
The current profile fits decimal identifiers through ten digits, including odd
lengths. Printability is calculated from actual encoded modules, not a
six/eight/ten-digit storage limit.

There is no unbounded unique encoding on a finite label at a fixed optical
resolution. Before physical capacity is approached, benchmark a versioned
print profile on the school's actual higher-resolution printers/scanners, or
agree a larger label. Do not roll out a denser format from a software test alone.
Registry `encoding_version` permits a future format, but existing stickers
must remain valid indefinitely. Short aliases would consume another finite
global namespace and must never be reused.

Before BIGINT exhaustion, deploy a serialized NUMERIC allocator with a
transactionally locked counter, initialize it above the old sequence's
high-water mark, and switch allocation in one governed maintenance transaction.
Revoke the old allocator's usage. Preserve registry rows, uniqueness, text
identifiers, encoding versions and all existing lookups. Verify concurrent
allocation/import/retry behavior in a restored staging copy first. Never
`RESTART` or decrement either allocator.

Generation is bounded to 100,000 labels per transaction for resource protection;
schools can create further batches. PDFs fetch identifiers in 500-row chunks,
flush pages as generated and spool to temporary files, avoiding whole-document
buffers on the server. The browser can keep working in other workspaces.

## Scanner, inventory and stocktaking

Keyboard/HID scanners need Code 128 enabled, the correct keyboard layout and
an Enter suffix. Only an explicitly focused barcode input handles scans.
Completed scans queue serially, pending duplicates are rejected, and unrelated
inputs retain normal keyboard behavior. Manual entry and optional device-local
sound are available. Scanner settings include a non-mutating test field showing
focus readiness, arriving character count, the exact completed value, the number
of completed tests and whether Enter or the manual button completed the test.
Repeating the same sticker is allowed after its previous test finishes.

Sound preferences save automatically in this browser. Storage or audio failures
show a recovery message and cannot stop subsequent scans. The sound-test button
tests browser audio only; a scanner's own beep is controlled by its hardware.
No browser result claims that a physical scanner is connected or working.

When no characters arrive, first select **Start scanner test**, then try the
same sticker in a blank Notepad document. If Notepad is also empty, check the
USB cable/receiver and port, and use the scanner manufacturer's manual to enable
USB keyboard/HID mode and Code 128. The website cannot change these device
settings. If characters arrive without completion, configure an Enter suffix;
**Complete test** can inspect that value but does not verify an Enter suffix.
Match the scanner and computer keyboard layouts if the characters differ.

Stocktaking snapshots copies and their status when the session starts.
Scans are unique per session/barcode and retain unknown/discrepant observations.
Issued copies are distinguished from copies expected on shelves. Completion
closes scans without rewriting inventory or automatically declaring books lost.
Current status is displayed alongside snapshot status so circulation during
stocktaking is visible. The complete snapshot can be downloaded as CSV.

## Hardware acceptance checklist (requires real equipment)

- Use a representative USB HID scanner and the school's actual printer.
- Print the calibration PDF on A4 at Actual size / 100%; disable fit, scaling,
  duplex, booklet mode and printer-driver enlargement.
- Measure page dimensions, the 100 mm rule, 32 × 15 mm outlines, 1 mm gaps,
  6.5 mm side margins and 21 mm top/bottom margins with a ruler.
- Verify the first/last row and first/last column are not clipped.
- Check ordinary adhesive paper for ink spread, contrast, smearing and adhesion.
- Cut on guides without entering either barcode quiet zone.
- Scan stickers from all corners and centre of a page, including odd-length
  identifiers and the longest supported production identifier.
- Compare the received text exactly, including leading zeros, against the label.
- Scan at least 100 books consecutively; check focus, Enter suffix, feedback,
  duplicates, manual entry, scanner disconnect and browser audio restrictions.
- In an approved test school, issue three labelled copies to one borrower,
  return two, confirm the third remains issued, and run a stocktake.
- Repeat on supported desktop/mobile layouts and with the school's USB adapter
  if scanning on a tablet. Obtain librarian sign-off before mass sticker printing.

Automated PDF rendering/decoding and simulated keyboard input do not constitute
physical hardware verification.
