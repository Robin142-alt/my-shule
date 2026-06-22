# Handoff Report: Automated PDF Generation Audit

This report presents a thorough investigation of current frontend print/PDF interactions, backend PDF generation components, and recommends an implementation strategy for branded PDF downloads as Blobs.

## 1. Observation

### Frontend Print/PDF Implementation
We observed that the frontend contains mock print and PDF download interactions using browser `window.print()` or custom print templates.

- **File**: `apps/web/src/lib/dashboard/export.ts`
  - **Lines 164-168**: The print preview overlay handles both print and PDF downloads via native `window.print()` wrapper:
    ```typescript
    overlay.querySelector("[data-myshule-print]")?.addEventListener("click", () => {
      const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
      if (!userAgent.includes("jsdom")) {
        iframe?.contentWindow?.focus();
      }
      window.print?.();
    });
    overlay.querySelector("[data-myshule-download-pdf]")?.addEventListener("click", () => {
      window.print?.();
    });
    ```
- **File**: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
  - **Lines 1855-1861**: The report card print preview opens an iframe and triggers printing on load:
    ```typescript
    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    </script>
    ```
  - **Lines 1868-1871**: The `downloadPdf` function simply invokes this native browser print preview:
    ```typescript
    function downloadPdf(report: ReportCardDocumentData) {
      openPrintPreview(report);
      setNotice(`${report.learner.fullName}: choose "Save as PDF" in the print dialog.`);
    }
    ```
- **File**: `apps/web/src/components/shared/print/DocumentControls.tsx`
  - **Lines 30-36**: Implements fallback to `window.print()` if `onPrint` is absent:
    ```typescript
    const handlePrint = () => {
      if (onPrint) {
        onPrint();
      } else {
        window.print();
      }
    };
    ```
  - **Lines 49-54**: The "Download PDF" button is bound directly to the `onDownloadPdf` prop:
    ```typescript
    <button 
      onClick={onDownloadPdf}
      className="..."
    >
      Download PDF
    </button>
    ```
- **File**: `apps/web/src/components/shared/print/PrintLayout.tsx`
  - **Lines 67-69**: Renders `DocumentControls` but does NOT pass an `onDownloadPdf` callback. Consequently, this button remains a "dead button" (fails silently or does nothing when clicked):
    ```typescript
    <div className="w-full max-w-4xl mb-6 no-print flex justify-center">
      <DocumentControls onClose={onClose} />
    </div>
    ```

### React Document Templates on Frontend
The frontend features modular document templates under `apps/web/src/components/shared/print/templates/` that visually format documents using React components:
- `FeeReceiptTemplate.tsx` (Lines 21-35): Defines receipt structure including receipt number, payer details, voteheads, balance details, and signature area.
- `FeeStatementTemplate.tsx` (Lines 33-40): Formats student details, transactional ledgers (Debits, Credits, Balances), arrears aging buckets, and payment instructions.
- `ReportCardTemplate.tsx`: CBC/8-4-4 compatible visual layout for grades, marks, and remarks.

### Dependency Libraries in package.json
- **File**: `package.json` (Root)
  - **Line 155**: `"pdfkit": "^0.18.0"`
  - **Line 167**: `"@types/pdfkit": "^0.17.6"`
  - **Line 151**: `"exceljs": "^4.4.0"` (used for Excel artifacts)
- **File**: `apps/web/package.json`
  - No PDF libraries are installed (neither Puppeteer, jsPDF, nor html-pdf).

### Backend PDF Generation & Storage Components
We observed that the backend already contains some modules for PDF generation and storage:
- **File**: `apps/api/src/common/reports/report-pdf-artifact.ts`
  - **Lines 30-46**: Uses `pdfkit` to build simple tabular report PDFs.
- **File**: `apps/api/src/modules/exams/services/report-card-pdf-artifact.ts`
  - **Lines 48-137**: Employs `pdfkit` to draw branded, curriculum-aware, structured student report cards with school header info, tables, comments, and verification code signatures.
- **File**: `apps/api/src/common/reports/report-artifact-storage.service.ts`
  - **Lines 31-48**: Stores compiled report artifacts utilizing `DatabaseFileStorageService`.
- **File**: `apps/api/src/common/uploads/database-file-storage.service.ts`
  - **Lines 89-164**: Persists file buffers either directly in the database (`database` backend, `file_objects` table as binary data) or in an object store (`object_storage` backend).
- **File**: `apps/api/src/modules/billing/billing.controller.ts`
  - **Lines 190-232**: Implements `.csv` export endpoints for statements, reconciliation, and reports, but does not provide any `.pdf` export endpoints.

---

## 2. Logic Chain

1. **Frontend Print/PDF Status**: Observation shows that while visual templates exist for receipts and statements, clicking "Download PDF" either delegates to browser native `window.print()` (which is a UX bypass) or does not fire anything (due to missing callbacks in `PrintLayout`).
2. **Current PDF Stack**: Observation reveals that `pdfkit` is the only PDF generation library installed in the workspace (found in the root `package.json`). Therefore, any backend PDF generation should leverage `pdfkit` directly to avoid introducing new heavy runtimes (e.g. Puppeteer/Chromium, which are highly restricted in server environments).
3. **Existing Backend Work**: Investigation of the backend shows that report card generation (`report-card-pdf-artifact.ts`) already demonstrates how to use `pdfkit` to format multi-column tables, headers, and footer details.
4. **Missing Endpoints**: The database/storage layer is already equipped to store files (`database-file-storage.service.ts`), but there are no API controller endpoints to fetch, compile, and stream the generated PDF bytes back to the frontend.
5. **Conclusion**: We need to implement a unified backend PDF generator in NestJS using `pdfkit` for receipts, statements, and invoices, register controller download routes that stream the PDF buffers as `application/pdf`, and wire the frontend download buttons to trigger direct API downloads instead of calling browser print overrides.

---

## 3. Caveats

- We assumed that `pdfkit` is the desired engine for all PDF generation tasks since it is already integrated and verified by tests (`report-pdf-artifact.test.ts`).
- We did not audit the file system storage quotas or S3 compatibility settings. We assume the current `DatabaseFileStorageService` works out-of-the-box.
- We did not investigate browser support for direct Blob links; however, the standard `window.URL.createObjectURL(blob)` approach is universally compatible with modern browsers.

---

## 4. Conclusion

The application relies heavily on `window.print()` bypasses for PDF creation. However, the backend already contains robust PDFKit infrastructure and storage services. To achieve automated, branded PDF downloads:
1. Implement a `PdfGeneratorService` that draws styled headers, footers, tables, and signature blocks.
2. Develop receipt and invoice template functions mapping to this generator using `pdfkit`.
3. Add backend controller routes under `BillingController` to stream the PDF buffers with `Content-Type: application/pdf`.
4. Connect frontend download buttons (in `DocumentControls` and custom screens) to trigger API downloads.

---

## 5. Verification Method

To verify the audit findings and proposed implementation:
1. Check that the tests pass using:
   ```powershell
   npm run build
   npm test
   ```
2. Verify that `pdfkit` is registered under dependencies in the root `package.json`.
3. Inspect `apps/api/src/modules/exams/services/report-card-pdf-artifact.ts` and `apps/api/src/common/uploads/database-file-storage.service.ts` to confirm file layout and persistence logic.
