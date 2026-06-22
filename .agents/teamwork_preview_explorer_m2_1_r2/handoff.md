# Handoff Report: NestJS PDF Generator Service (`PdfGeneratorService`) using PDFKit

## 1. Observation
We have inspected the following key files in the codebase to analyze existing PDF creation, styling patterns, billing entities, and data retrieval processes:

### Existing PDF Generation Patterns
1. **`apps/api/src/common/reports/report-pdf-artifact.ts` (lines 30-70):**
   - Shows how `pdfkit` is initialized and piped to capture chunks in a buffer:
     ```typescript
     const chunks: Buffer[] = [];
     const document = new PDFDocument({
       autoFirstPage: true,
       bufferPages: false,
       compress: false,
       margin: 40,
       size: 'A4',
       ...
     });
     document.on('data', (chunk: Buffer) => chunks.push(chunk));
     document.on('error', reject);
     document.on('end', () => resolve(Buffer.concat(chunks)));
     ...
     document.end();
     ```
2. **`apps/api/src/modules/exams/services/report-card-pdf-artifact.ts` (lines 24-139):**
   - Implements professional page headers, footers, double column detail structures, and vertical line tracking:
     - Sets font style: `document.fontSize(20).font('Helvetica-Bold').text(fields.school_name, { align: 'center' });`
     - Uses double column offset variables:
       ```typescript
       const startX = 50;
       let currentY = document.y;
       document.text(`Name: ${fields.learner_name}`, startX, currentY);
       document.text(`Admission: ${fields.admission_number || 'N/A'}`, startX + 250, currentY);
       ```
     - Draws tables and boundary lines:
       ```typescript
       document.moveTo(startX, currentY + 15).lineTo(545, currentY + 15).stroke();
       ```
     - Handles fixed vertical layouts for footer sections:
       ```typescript
       document.fontSize(8).font('Helvetica-Oblique').text(`Verification Code: ${verificationCode}`, startX, 750, { align: 'center' });
       ```

### Billing Entities and Schemas
3. **`apps/api/src/database/schema.sql` (lines 1254-1274, 1391-1420):**
   - Defines the raw physical tables `invoices` and `manual_fee_payments` containing the multi-tenant fields:
     - `invoices`: `id`, `tenant_id`, `subscription_id`, `invoice_number`, `status`, `currency_code`, `description`, `subtotal_amount_minor`, `tax_amount_minor`, `total_amount_minor`, `amount_paid_minor`, `billing_phone_number`, `payment_intent_id`, `issued_at`, `due_at`, `paid_at`, `voided_at`, `metadata`.
     - `manual_fee_payments`: `id`, `tenant_id`, `idempotency_key`, `receipt_number`, `payment_method`, `status`, `student_id`, `invoice_id`, `amount_minor`, `currency_code`, `payer_name`, `received_at`, `deposited_at`, `cleared_at`, `bounced_at`, `reversed_at`, `cheque_number`, `drawer_bank`, `deposit_reference`, `external_reference`, `asset_account_code`, `fee_control_account_code`, `ledger_transaction_id`, `notes`, `metadata`, `created_by_user_id`.
4. **`apps/api/src/modules/billing/entities/invoice.entity.ts` (lines 4-21):**
   - Matches the fields in `schema.sql` for the mapped billing invoice representation.
5. **`apps/api/src/modules/billing/entities/manual-fee-payment.entity.ts` (lines 17-47):**
   - Contains the corresponding TypeScript representation for the receipt/payment table.
6. **`prisma/schema.prisma` (lines 837-860, 1456-1487):**
   - Defines the relational models `School` and `Student` needed for populating the invoices and receipts PDF metadata.
     - `School` has: `id`, `name`, `address`, `phone`, `email`, `logoUrl`, etc.
     - `Student` has: `id`, `schoolId`, `admissionNumber`, `firstName`, `middleName`, `lastName`, `currentClassId`, `currentStreamId`, relations to `currentClass`, `currentStream`.

### Data Retrieval APIs
7. **`apps/api/src/modules/billing/billing.service.ts` (lines 626-634):**
   - `getInvoice(invoiceId: string)` retrieves the invoice:
     ```typescript
     async getInvoice(invoiceId: string): Promise<InvoiceResponseDto> {
       const invoice = await this.invoicesRepository.findById(this.requireTenantId(), invoiceId);
       if (!invoice) {
         throw new NotFoundException(`Invoice "${invoiceId}" was not found`);
       }
       return this.mapInvoice(invoice);
     }
     ```
8. **`apps/api/src/modules/billing/manual-fee-payment.service.ts` (lines 138-149):**
   - `getManualFeePayment(paymentId: string)` retrieves the receipt details.
     - Additionally, allocations are listed via `manualFeePaymentsRepository.listAllocations(tenantId, paymentId)` (lines 241-245) to trace how much payment was applied to which invoice or credit balance.

---

## 2. Logic Chain
To design the new `PdfGeneratorService` in NestJS using `pdfkit`:
1. **Retrieve the data:**
   - **For Invoice PDF:** First fetch the invoice from the DB. Extract the `tenant_id` from the invoice (or context). Query the `School` entity by `id = tenant_id` to get the header details (Name, Address, Email, Phone). Extract `student_id` from `invoice.metadata` and fetch student details (including Class/Stream relations).
   - **For Receipt PDF:** Fetch the manual payment from the DB. Fetch the associated `School` by `id = tenant_id`. Fetch the `Student` details by `payment.student_id`. Query `manualFeePaymentsRepository.listAllocations(tenantId, paymentId)` to retrieve the payment allocations. If `payment.invoice_id` is present, fetch that specific `Invoice` as well to display it.
2. **Format minor units:**
   - Define a formatter helper since `subtotal_amount_minor`, `tax_amount_minor`, `total_amount_minor`, and `amount_minor` are represented as strings/integers in minor units (e.g. cents).
3. **Format Layout using PDFKit:**
   - Create a helper to initialize the `PDFDocument` (setting paper `size` to `A4`, `margin` to `50` to match `report-card-pdf-artifact.ts`).
   - Draw the header centered with the school name, контакты/contacts, and logo if available.
   - Use double column details with `startX` and `startX + 250` offsets.
   - Draw tables with header labels, line items (e.g., from `invoice.metadata.line_items`), and draw separator lines using standard coordinate positioning.
   - Add a fixed-height footer at absolute coordinates (`y: 740 - 760`) for branding, verification codes, and generation timestamps.

---

## 3. Caveats
- **PII Encryption:** The `billing_phone_number` is stored encrypted in the database. When retrieving the invoice through repositories, it must be decrypted using `PiiEncryptionService` (which is already implemented inside `InvoicesRepository.mapRow`). The suggested service should consume the decrypted model.
- **Line Items Fallback:** If an invoice was created manually without a fee structure (meaning `invoice.metadata.line_items` is empty), the drawer logic must fall back to showing a single row containing the main invoice `description` and the total amount.
- **Tenant Validation:** To ensure strict tenant isolation, the generating endpoint must verify that the requested invoice or receipt belongs to the user's active tenant (`tenant_id`).

---

## 4. Conclusion
We can build a professional `PdfGeneratorService` using the structure below.

### Exact API Structure & Methods
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../../database/prisma.service';
import { InvoicesRepository } from '../../billing/repositories/invoices.repository';
import { ManualFeePaymentsRepository } from '../../billing/repositories/manual-fee-payments.repository';
import { RequestContextService } from '../../../common/request-context/request-context.service';

@Injectable()
export class PdfGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly manualFeePaymentsRepository: ManualFeePaymentsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Generates a professional PDF for an Invoice
   */
  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context is required to generate invoice PDFs');
    }

    const invoice = await this.invoicesRepository.findById(tenantId, invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice "${invoiceId}" not found`);
    }

    const school = await this.prisma.school.findUnique({
      where: { id: tenantId },
    });

    const studentId = invoice.metadata?.student_id as string | undefined;
    const student = studentId
      ? await this.prisma.student.findUnique({
          where: { id: studentId },
          include: { currentClass: true, currentStream: true },
        })
      : null;

    return this.renderInvoicePdfDoc(invoice, school, student);
  }

  /**
   * Generates a professional PDF for a Payment Receipt
   */
  async generateReceiptPdf(receiptId: string): Promise<Buffer> {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context is required to generate receipt PDFs');
    }

    const payment = await this.manualFeePaymentsRepository.findById(tenantId, receiptId);
    if (!payment) {
      throw new NotFoundException(`Receipt payment "${receiptId}" not found`);
    }

    const school = await this.prisma.school.findUnique({
      where: { id: tenantId },
    });

    const student = payment.student_id
      ? await this.prisma.student.findUnique({
          where: { id: payment.student_id },
          include: { currentClass: true, currentStream: true },
        })
      : null;

    const allocations = await this.manualFeePaymentsRepository.listAllocations(tenantId, payment.id);
    const invoice = payment.invoice_id
      ? await this.invoicesRepository.findById(tenantId, payment.invoice_id)
      : null;

    return this.renderReceiptPdfDoc(payment, school, student, allocations, invoice);
  }

  // --- Helpers ---

  private formatAmount(minorAmount: string | bigint | number, currency = 'KES'): string {
    const amount = Number(minorAmount) / 100;
    return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  private renderInvoicePdfDoc(invoice: any, school: any, student: any): Promise<Buffer> { ... }
  private renderReceiptPdfDoc(payment: any, school: any, student: any, allocations: any[], invoice: any): Promise<Buffer> { ... }
}
```

### Layout Drawing Code
Below is the exact `pdfkit` layout drawing implementation for both rendering methods.

#### 1. `renderInvoicePdfDoc` Implementation:
```typescript
private renderInvoicePdfDoc(invoice: any, school: any, student: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: true,
      bufferPages: false,
      compress: false,
      margin: 50,
      size: 'A4',
      info: {
        Title: `${school?.name || 'School'} Invoice`,
        Author: school?.name || 'My Shule',
        Subject: `Invoice ${invoice.invoice_number}`,
        CreationDate: new Date(),
        ModDate: new Date(),
      },
    });

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    const startX = 50;

    // 1. School Header
    document.fontSize(20).font('Helvetica-Bold').text(school?.name || 'SCHOOL INVOICE', { align: 'center' });
    const schoolContacts = [school?.address, school?.phone, school?.email].filter(Boolean).join(' | ');
    document.fontSize(9).font('Helvetica').text(schoolContacts || '', { align: 'center' });
    document.moveDown(1.5);

    // Header separator line
    document.moveTo(startX, document.y).lineTo(545, document.y).stroke();
    document.moveDown(1.5);

    document.fontSize(14).font('Helvetica-Bold').text('FEE INVOICE', { align: 'center' });
    document.moveDown(1);

    // 2. Student & Invoice Details Section (Double Column)
    let currentY = document.y;
    document.fontSize(10).font('Helvetica');

    // Left Column
    document.text(`Student Name: ${student ? `${student.firstName} ${student.lastName || ''}`.trim() : invoice.metadata?.student_name || 'N/A'}`, startX, currentY);
    currentY += 15;
    document.text(`Admission No: ${student?.admissionNumber || invoice.metadata?.admission_number || 'N/A'}`, startX, currentY);
    currentY += 15;
    const className = student?.currentClass?.name || invoice.metadata?.class_name || 'N/A';
    const streamName = student?.currentStream?.custom_label || '';
    document.text(`Class/Stream: ${className} ${streamName}`.trim(), startX, currentY);
    currentY += 15;
    document.text(`Term & Academic Year: ${invoice.metadata?.term || 'N/A'} / ${invoice.metadata?.academic_year || 'N/A'}`, startX, currentY);

    // Right Column (reset Y coordinate to match left column start)
    currentY = document.y - 45;
    document.text(`Invoice Number: ${invoice.invoice_number}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Issue Date: ${new Date(invoice.issued_at).toLocaleDateString('en-KE')}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Due Date: ${new Date(invoice.due_at).toLocaleDateString('en-KE')}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Status: ${invoice.status.toUpperCase()}`, startX + 250, currentY);

    document.moveDown(2.5);

    // 3. Line Items Table Section
    currentY = document.y;
    document.font('Helvetica-Bold');
    document.text('Item Description', startX, currentY);
    document.text('Amount', startX + 350, currentY, { width: 145, align: 'right' });

    // Table Header separator line
    document.moveTo(startX, currentY + 15).lineTo(545, currentY + 15).stroke();
    document.moveDown(1);
    currentY = document.y + 5;
    document.font('Helvetica');

    // Populate rows
    const lineItems = invoice.metadata?.line_items || [
      { code: 'GEN', label: invoice.description, amount_minor: invoice.total_amount_minor }
    ];

    for (const item of lineItems) {
      document.text(item.label, startX, currentY);
      document.text(this.formatAmount(item.amount_minor, invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
      currentY += 18;
    }

    // Table Footer separator line
    document.moveTo(startX, currentY + 5).lineTo(545, currentY + 5).stroke();
    document.moveDown(1);
    currentY = document.y + 10;

    // 4. Totals Breakdown
    document.font('Helvetica-Bold');
    document.text('Subtotal:', startX + 250, currentY);
    document.text(this.formatAmount(invoice.subtotal_amount_minor, invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
    currentY += 15;

    document.text('Tax:', startX + 250, currentY);
    document.text(this.formatAmount(invoice.tax_amount_minor, invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
    currentY += 15;

    document.text('Total Amount Due:', startX + 250, currentY);
    document.text(this.formatAmount(invoice.total_amount_minor, invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
    currentY += 15;

    document.text('Amount Paid:', startX + 250, currentY);
    document.text(this.formatAmount(invoice.amount_paid_minor, invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
    currentY += 15;

    const balanceMinor = BigInt(invoice.total_amount_minor) - BigInt(invoice.amount_paid_minor);
    document.text('Outstanding Balance:', startX + 250, currentY);
    document.text(this.formatAmount(balanceMinor.toString(), invoice.currency_code), startX + 350, currentY, { width: 145, align: 'right' });

    // 5. Page Footer (Static placement at bottom)
    document.fontSize(8).font('Helvetica-Oblique').text('Generated automatically by My Shule ERP', startX, 740, { align: 'center' });
    document.text('If you have any questions, please contact the school administration.', startX, 750, { align: 'center' });
    document.text(`Generated at: ${new Date().toISOString()}`, startX, 760, { align: 'center' });

    document.end();
  });
}
```

#### 2. `renderReceiptPdfDoc` Implementation:
```typescript
private renderReceiptPdfDoc(
  payment: any,
  school: any,
  student: any,
  allocations: any[],
  invoice: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: true,
      bufferPages: false,
      compress: false,
      margin: 50,
      size: 'A4',
      info: {
        Title: `${school?.name || 'School'} Receipt`,
        Author: school?.name || 'My Shule',
        Subject: `Receipt ${payment.receipt_number}`,
        CreationDate: new Date(),
        ModDate: new Date(),
      },
    });

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    const startX = 50;

    // 1. School Header
    document.fontSize(20).font('Helvetica-Bold').text(school?.name || 'SCHOOL RECEIPT', { align: 'center' });
    const schoolContacts = [school?.address, school?.phone, school?.email].filter(Boolean).join(' | ');
    document.fontSize(9).font('Helvetica').text(schoolContacts || '', { align: 'center' });
    document.moveDown(1.5);

    // Header separator line
    document.moveTo(startX, document.y).lineTo(545, document.y).stroke();
    document.moveDown(1.5);

    document.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    document.moveDown(1);

    // 2. Student & Payment Details Section (Double Column)
    let currentY = document.y;
    document.fontSize(10).font('Helvetica');

    // Left Column
    document.text(`Student Name: ${student ? `${student.firstName} ${student.lastName || ''}`.trim() : payment.metadata?.student_name || 'N/A'}`, startX, currentY);
    currentY += 15;
    document.text(`Admission No: ${student?.admissionNumber || payment.metadata?.admission_number || 'N/A'}`, startX, currentY);
    currentY += 15;
    const className = student?.currentClass?.name || 'N/A';
    const streamName = student?.currentStream?.custom_label || '';
    document.text(`Class/Stream: ${className} ${streamName}`.trim(), startX, currentY);
    currentY += 15;
    document.text(`Payer Name: ${payment.payer_name || 'N/A'}`, startX, currentY);

    // Right Column (reset Y coordinate to match left column start)
    currentY = document.y - 45;
    document.text(`Receipt Number: ${payment.receipt_number}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Payment Date: ${new Date(payment.received_at).toLocaleDateString('en-KE')}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Payment Method: ${payment.payment_method.toUpperCase()}`, startX + 250, currentY);
    currentY += 15;
    const reference = payment.external_reference || payment.cheque_number || payment.deposit_reference || 'N/A';
    document.text(`Reference: ${reference}`, startX + 250, currentY);

    document.moveDown(2.5);

    // 3. Allocations Breakdown Table Section
    currentY = document.y;
    document.font('Helvetica-Bold');
    document.text('Allocation Target', startX, currentY);
    document.text('Type', startX + 250, currentY);
    document.text('Amount Allocated', startX + 350, currentY, { width: 145, align: 'right' });

    // Table Header separator line
    document.moveTo(startX, currentY + 15).lineTo(545, currentY + 15).stroke();
    document.moveDown(1);
    currentY = document.y + 5;
    document.font('Helvetica');

    // Populate allocations
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        const targetLabel = alloc.allocation_type === 'invoice' && alloc.invoice_id
          ? `Invoice ${invoice?.invoice_number || alloc.invoice_id}`
          : 'Credit / Overage Account';
        document.text(targetLabel, startX, currentY);
        document.text(alloc.allocation_type.toUpperCase(), startX + 250, currentY);
        document.text(this.formatAmount(alloc.amount_minor, payment.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
        currentY += 18;
      }
    } else {
      // Fallback if no allocation entries exist
      const targetLabel = payment.invoice_id ? `Invoice ${invoice?.invoice_number || payment.invoice_id}` : 'General School Fees';
      document.text(targetLabel, startX, currentY);
      document.text(payment.invoice_id ? 'INVOICE' : 'CREDIT', startX + 250, currentY);
      document.text(this.formatAmount(payment.amount_minor, payment.currency_code), startX + 350, currentY, { width: 145, align: 'right' });
      currentY += 18;
    }

    // Table Footer separator line
    document.moveTo(startX, currentY + 5).lineTo(545, currentY + 5).stroke();
    document.moveDown(1);
    currentY = document.y + 10;

    // 4. Receipt Totals
    document.font('Helvetica-Bold');
    document.text('Total Amount Received:', startX + 250, currentY);
    document.text(this.formatAmount(payment.amount_minor, payment.currency_code), startX + 350, currentY, { width: 145, align: 'right' });

    // 5. Page Footer (Static placement at bottom)
    document.fontSize(8).font('Helvetica-Oblique').text('Generated automatically by My Shule ERP', startX, 740, { align: 'center' });
    document.text('Thank you for your payment.', startX, 750, { align: 'center' });
    document.text(`Generated at: ${new Date().toISOString()}`, startX, 760, { align: 'center' });

    document.end();
  });
}
```

---

## 5. Verification Method
To verify that the service is structured correctly and operates safely within the project's boundaries, check the following files and run the test suites:

### Files to Inspect
- **`apps/api/src/modules/billing/billing.module.ts`**: Make sure `PdfGeneratorService` is imported, declared in `providers`, and listed in `exports`.
- **`apps/api/src/modules/billing/billing.controller.ts`**: Ensure the PDF download endpoints are present and verify their tenant context requirement.

### Test Commands
Ensure that standard tests and billing-specific tests continue to pass after integration:
```powershell
# Run the billing contract test suite
npm run test:api -- apps/api/src/modules/billing/billing-contract.test.ts

# Run the complete billing module unit tests
npm run test:api -- apps/api/src/modules/billing/billing.test.ts
```

### Invalidation Conditions
- If the PDF generation fails with coordinate overlapping when there are more than 15 line items, dynamic Y-coordinate pagination logic will need to be written (using `document.addPage()`) instead of a single A4 page with static footer coordinates.
