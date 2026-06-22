## 2026-06-22T06:21:56Z
Your task is to investigate how the frontend print/download buttons are currently implemented and how to connect them to the new backend endpoints.
Inspect:
- `apps/web/src/components/shared/print/DocumentControls.tsx`
- `apps/web/src/components/shared/print/PrintLayout.tsx`
- `apps/web/src/components/school/accountant/invoices-workspace.tsx`
- `apps/web/src/components/school/accountant/receipts-workspace.tsx`
Understand how the "Download PDF" button inside `DocumentControls` can be wired via `onDownloadPdf` prop and how `PrintLayout` should be modified to accept this prop.
Look at how the accountant invoices workspace handles statement modal downloads (e.g. `exportStudentStatement`) and how we should add buttons or actions to download direct invoice and receipt PDFs as Blobs.
Recommend the exact changes to be made to trigger direct Blob downloads using standard JavaScript/React APIs (using fetch, handling binary arrays, `new Blob([buffer], { type: 'application/pdf' })`, creating an object URL, and triggering a virtual anchor click).
Your working directory is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m2_3_r2. Write your final handoff report to `handoff.md` in your directory.
