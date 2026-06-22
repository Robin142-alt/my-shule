# Handoff Report: Frontend Print/Download Buttons Integration with Backend PDF Endpoints

## 1. Observation

Direct observations and file paths examined in the workspace:

- **`apps/web/src/components/shared/print/DocumentControls.tsx`**:
  Line 11 defines the interface prop for downloading PDFs:
  ```typescript
  interface DocumentControlsProps {
    onClose?: () => void;
    onPrint?: () => void;
    onDownloadPdf?: () => void;
    ...
  }
  ```
  Line 49-54 renders the Download PDF button and binds it to `onDownloadPdf` click event:
  ```tsx
  <button 
    onClick={onDownloadPdf}
    className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
  >
    Download PDF
  </button>
  ```

- **`apps/web/src/components/shared/print/PrintLayout.tsx`**:
  Line 8-31 defines `PrintLayoutProps` interface:
  ```typescript
  interface PrintLayoutProps {
    children: React.ReactNode;
    documentTitle: string;
    documentNumber?: string;
    orientation?: 'portrait' | 'landscape' | 'thermal';
    schoolDetails?: { ... };
    footerDetails?: { ... };
    onClose?: () => void;
    hideHeader?: boolean;
    hideFooter?: boolean;
  }
  ```
  Line 67-69 renders `DocumentControls` inside the layout but does not pass `onDownloadPdf`:
  ```tsx
  <div className="w-full max-w-4xl mb-6 no-print flex justify-center">
    <DocumentControls onClose={onClose} />
  </div>
  ```

- **`apps/web/src/components/school/accountant/invoices-workspace.tsx`**:
  Line 403-435 defines the CSV statement export function `exportStudentStatement`:
  ```typescript
  async function exportStudentStatement(studentId: string) {
    setStatementError(null);
    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Student statement export could not be prepared.",
        );
      }

      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (caught) {
      setStatementError(caught instanceof Error ? caught.message : "Student statement export could not be prepared.");
    }
  }
  ```
  Lines 1103-1141 render the running "Statement activity" `DataTable` inside the student statement details `Modal` component. There is currently no column to view or download specific invoice or receipt PDFs from this list.

- **`apps/web/src/components/school/accountant/receipts-workspace.tsx`**:
  Lines 103-110 define a placeholder actions column in the receipts `DataTable` with an inactive View button:
  ```tsx
  {
    id: "actions",
    header: "",
    render: () => (
      <Button variant="ghost" size="sm">
        View
      </Button>
    )
  }
  ```

---

## 2. Logic Chain

From these observations, we trace the step-by-step connection strategy:

1. **`PrintLayout.tsx` Modification**:
   - `DocumentControls` already accepts `onDownloadPdf`.
   - `PrintLayout` wraps pages (like `example-report-card`) and exposes `DocumentControls`.
   - Therefore, `PrintLayoutProps` must be updated to accept `onDownloadPdf?: () => void` and forward it directly to `DocumentControls`.

2. **Invoices Workspace Integration**:
   - Currently, statement CSVs are downloaded via JSON payload mapping (using `downloadTextFile`).
   - For PDF documents, the backend endpoints return raw binary PDF streams.
   - We must declare fetch helper functions `downloadInvoicePdf(invoiceId)` and `downloadReceiptPdf(receiptId)` in `invoices-workspace.tsx`.
   - Inside the statement activity modal `DataTable`, we should add an "Actions" or "Download" column to invoke these PDF download handlers.

3. **Receipts Workspace Integration**:
   - The receipts page lists all manual receipts but has no print/view behavior wired.
   - We can define `downloadReceiptPdf(receiptId)` inside `ReceiptsWorkspace` and wire the "View" button in the `DataTable` actions column to call it.

4. **Direct Blob Download Pattern**:
   - Standard React/JS API requires reading the response stream as an `ArrayBuffer` (`await response.arrayBuffer()`).
   - Create a `new Blob([buffer], { type: 'application/pdf' })` representing the document.
   - Map it to a virtual URL via `window.URL.createObjectURL(blob)`.
   - Create an `HTMLAnchorElement` (`<a>`), click it programmatically, remove it from DOM, and revoke the URL.

---

## 3. Caveats

- **Endpoint URL contracts**: We assume the new backend endpoints follow standard routing designs:
  - Invoices: `/api/billing/invoices/:invoiceId/pdf`
  - Receipts: `/api/billing/manual-fee-payments/:receiptId/pdf` (matching existing controller routes in `billing.controller.ts`). If the routes differ, only the endpoint path strings need adjustment.
- **Session Auth**: Assumes cookies or standard request headers (e.g., standard fetch session credentials) propagate authorization tokens, matching other requests.

---

## 4. Conclusion

We recommend the following exact changes to implement the download behaviors:

### 4.1. Modify `PrintLayout.tsx`
Add `onDownloadPdf` to the interface and component:
```typescript
interface PrintLayoutProps {
  children: React.ReactNode;
  documentTitle: string;
  documentNumber?: string;
  orientation?: 'portrait' | 'landscape' | 'thermal';
  schoolDetails?: { ... };
  footerDetails?: { ... };
  onClose?: () => void;
  onDownloadPdf?: () => void; // <-- Add here
  hideHeader?: boolean;
  hideFooter?: boolean;
}
```
Update parameters and render block:
```tsx
export default function PrintLayout({
  children,
  documentTitle,
  documentNumber,
  orientation = 'portrait',
  schoolDetails,
  footerDetails,
  onClose,
  onDownloadPdf, // <-- Add here
  hideHeader = false,
  hideFooter = false,
}: PrintLayoutProps) {
  ...
  return (
    <div className="...">
      <div className="w-full max-w-4xl mb-6 no-print flex justify-center">
        <DocumentControls onClose={onClose} onDownloadPdf={onDownloadPdf} /> {/* <-- Forward here */}
      </div>
      ...
```

### 4.2. Modify `invoices-workspace.tsx`
1. Define the PDF download handlers inside `InvoicesWorkspace`:
```typescript
async function downloadInvoicePdf(invoiceId: string) {
  try {
    const response = await fetch(
      buildBillingApiPath(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`, tenantSlug),
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to download invoice PDF.");
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    setStatementError(e.message || "Failed to download invoice PDF.");
  }
}

async function downloadReceiptPdf(receiptId: string) {
  try {
    const response = await fetch(
      buildBillingApiPath(`/api/billing/manual-fee-payments/${encodeURIComponent(receiptId)}/pdf`, tenantSlug),
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to download receipt PDF.");
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${receiptId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    setStatementError(e.message || "Failed to download receipt PDF.");
  }
}
```

2. Add the Actions column to the Statement activity `DataTable` inside the modal:
```typescript
{
  id: "actions",
  header: "Document",
  render: (row) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        if (row.kind === "invoice") {
          void downloadInvoicePdf(row.source_id);
        } else if (row.kind === "receipt") {
          void downloadReceiptPdf(row.source_id);
        }
      }}
    >
      Download PDF
    </Button>
  )
}
```

### 4.3. Modify `receipts-workspace.tsx`
1. Define the receipt PDF download handler:
```typescript
async function downloadReceiptPdf(receiptId: string) {
  try {
    const response = await fetch(
      buildBillingApiPath(`/api/billing/manual-fee-payments/${encodeURIComponent(receiptId)}/pdf`, tenantSlug),
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to download receipt PDF.");
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${receiptId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e.message || "Failed to download receipt PDF.");
  }
}
```

2. Update the columns definition of `DataTable` inside `ReceiptsWorkspace` to trigger the download:
```typescript
{
  id: "actions",
  header: "Actions",
  render: (row: any) => (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => void downloadReceiptPdf(row.id)}
    >
      Download PDF
    </Button>
  )
}
```

---

## 5. Verification Method

To independently verify this implementation:
1. **Compilation Check**:
   Run `npm run build` from the workspace root to ensure no TypeScript compilation or typing errors are introduced by adding the `onDownloadPdf` prop to `PrintLayoutProps`.
2. **Endpoint Manual Test**:
   Once backend integration is complete, click the "Download PDF" buttons inside the running browser environment. Use browser DevTools (Network tab) to inspect the outgoing request:
   - Verify it hits: `/api/billing/invoices/<uuid>/pdf` or `/api/billing/manual-fee-payments/<uuid>/pdf`.
   - Verify the response `Content-Type` header is `application/pdf`.
   - Check that a PDF file download is initiated locally.
