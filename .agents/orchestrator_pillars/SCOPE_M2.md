# Scope: Milestone 2 — Automated PDF Generation

## Architecture
- **Backend Service**: Create a backend PDF generator using `pdfkit` (already installed and verified in dependencies).
- **Backend Controller**: Integrate endpoints to stream the generated PDFs with appropriate headers.
- **Frontend Wiring**: Connect download buttons to fetch PDF Blobs and download them instead of utilizing `window.print()` wrappers.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | PDF Generator Service | Create a service utilizing `pdfkit` to generate styled layouts, tables, and branding for receipts and invoices. | None | PLANNED |
| 2 | Billing Controller Endpoints | Add `GET /api/print/invoice/:invoiceId` and `GET /api/print/receipt/:receiptId` streaming PDF buffers as `application/pdf`. | M2.1 | PLANNED |
| 3 | Frontend Button Wiring | Bind the "Download PDF" button in `DocumentControls` and module screens to fetch from these backend endpoints as Blobs. | M2.2 | PLANNED |
| 4 | Verification & Formatting | Run visual alignment and layout formatting tests to verify PDF rendering. | M2.3 | PLANNED |

## Interface Contracts
- **Endpoints**:
  - `GET /api/print/report-card/:studentId/:termId` — Generates and downloads report card PDF.
  - `GET /api/print/invoice/:invoiceId` — Generates and downloads invoice PDF.
  - `GET /api/print/receipt/:receiptId` — Generates and downloads fee receipt PDF.
- **Headers**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename=<name>.pdf`

## Code Layout
- `apps/api/src/common/reports/report-pdf-generator.service.ts`
- `apps/api/src/modules/billing/billing.controller.ts`
- `apps/web/src/components/shared/print/DocumentControls.tsx`
- `apps/web/src/components/shared/print/PrintLayout.tsx`

## References
- Audit handoff: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_2\handoff.md`
