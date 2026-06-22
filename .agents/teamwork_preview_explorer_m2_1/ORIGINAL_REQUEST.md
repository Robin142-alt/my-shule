## 2026-06-21T21:03:08Z
Your task is to investigate how to build a professional PDF generator service `PdfGeneratorService` in NestJS using `pdfkit`.
Read `apps/api/src/common/reports/report-pdf-artifact.ts` and `apps/api/src/modules/exams/services/report-card-pdf-artifact.ts` to see how PDF documents are drawn, styled, and structured with tables, headers, footers, and alignments.
Inspect the invoices and receipts tables or models in `apps/api/src/modules/billing` and the `BillingService` class. What data fields are available for invoices and receipts? How should we retrieve them?
Suggest the exact API structure, methods, and layout drawing code for `generateInvoicePdf(invoiceId: string)` and `generateReceiptPdf(receiptId: string)`.
Your working directory is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m2_1. Write your final handoff report to `handoff.md` in your directory.
