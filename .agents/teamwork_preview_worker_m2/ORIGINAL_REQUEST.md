## 2026-06-22T07:19:50Z

Implement Automated PDF Generation for invoices and receipts.

### Specs & Details
1. **ReportPdfGeneratorService**:
   - Location: `apps/api/src/common/reports/report-pdf-generator.service.ts`
   - Purpose: Generates A4-size PDF documents using `pdfkit` for billing invoices and payment receipts.
   - Inject dependencies: `PrismaService`, `InvoicesRepository`, `ManualFeePaymentsRepository`, and `RequestContextService`.
   - Retrieve context-scoped `tenant_id` from `RequestContextService.requireStore().tenant_id`.
   - Implement `generateInvoicePdf(invoiceId: string): Promise<Buffer>`:
     - Query invoice details via `InvoicesRepository.findById(tenantId, invoiceId)`. Throw `NotFoundException` if not found.
     - Fetch school profile details from `PrismaService.school.findUnique({ where: { id: tenantId } })`.
     - Fetch student profile details from `PrismaService.student.findUnique` (if `studentId` is available in `invoice.metadata.student_id`). Include `currentClass` and `currentStream` relations.
     - Generate PDF with school details in header, student & invoice details in double-column offset columns, invoice line items (with fallback to description if `metadata.line_items` is empty), subtotal, tax, amount paid, and outstanding balance. Render a static branding/verification footer at the bottom of the page.
   - Implement `generateReceiptPdf(receiptId: string): Promise<Buffer>`:
     - Query manual fee payment details via `ManualFeePaymentsRepository.findById(tenantId, receiptId)`. Throw `NotFoundException` if not found.
     - Fetch school profile details.
     - Fetch student profile details using `payment.student_id`.
     - Fetch allocations via `ManualFeePaymentsRepository.listAllocations(tenantId, receiptId)`.
     - Fetch the associated invoice if `payment.invoice_id` is present.
     - Generate PDF receipt detailing school header, student & payment details, allocation targets breakdown table, totals received, and static branding footer.
   - Register `ReportPdfGeneratorService` in `apps/api/src/common/common.module.ts` as provider and export.

2. **Billing Controller Endpoints**:
   - Location: `apps/api/src/modules/billing/billing.controller.ts`
   - Add routes:
     - `GET /api/billing/invoices/:invoiceId/pdf`
     - `GET /api/billing/manual-fee-payments/:receiptId/pdf`
   - Annotate with `@Permissions('billing:read')`.
   - Inject `Response` from `express` via NestJS `@Res() res: Response` decorator.
   - Retrieve generated PDF buffer from `ReportPdfGeneratorService` (inject `ReportPdfGeneratorService` or use `PdfGeneratorService` name as imported/registered).
   - Stream back to client using `res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=Invoice-<id>.pdf' })` and `res.end(buffer)`.

3. **Frontend Wiring**:
   - `apps/web/src/components/shared/print/PrintLayout.tsx`: Add `onDownloadPdf?: () => void` to props interface, update parameters, and forward it to `DocumentControls` component.
   - `apps/web/src/components/school/accountant/invoices-workspace.tsx`:
     - Implement `downloadInvoicePdf(invoiceId: string)` and `downloadReceiptPdf(receiptId: string)`.
     - Create array buffer fetches from `/api/billing/invoices/${invoiceId}/pdf` and `/api/billing/manual-fee-payments/${receiptId}/pdf`.
     - Trigger programmatic client-side virtual Blob download for `application/pdf`.
     - Add `actions` column to the student Statement Activity DataTable modal to let users download specific invoice or receipt PDFs.
   - `apps/web/src/components/school/accountant/receipts-workspace.tsx`:
     - Implement `downloadReceiptPdf(receiptId: string)`.
     - Bind this function to the "Download PDF" button or replace the inactive "View" button in the actions column.

### Verification
Run tests to verify that typescript compilation and all tests pass:
```powershell
npm run build
npm run typecheck
```
