'use client';

import PrintLayout from '@/components/shared/print/PrintLayout';

export default function DocumentPrintPage() {
  return (
    <PrintLayout
      documentTitle="REPORT CARD PREVIEW"
      orientation="portrait"
      schoolDetails={{
        name: 'Generated report required',
        motto: 'Open a published report card from Exams to print tenant-scoped learner results.',
      }}
      footerDetails={{
        printedBy: 'Current signed-in user',
        role: 'Report viewer',
        pageCount: 1,
      }}
      onClose={() => window.history.back()}
    >
      <section className="rounded border border-amber-300 bg-amber-50 p-6 text-sm text-amber-950">
        <h2 className="text-lg font-bold">No generated report card selected</h2>
        <p className="mt-2">
          Report cards are printed from generated report artifacts after exams are configured,
          marks are submitted, moderation is complete, and publishing is approved for the current school.
        </p>
        <p className="mt-2">
          Return to Exams Manager, generate or open a published report card, then use its print action.
        </p>
      </section>
    </PrintLayout>
  );
}
