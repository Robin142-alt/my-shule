import { notFound } from 'next/navigation';
import { LEGAL_DOCUMENTS } from '../../../../../../../shared/legal/documents';
import { LegalDocumentText } from '@/components/legal/legal-document';
import { LegalLinks } from '@/components/legal/legal-links';
import { MyShuleBrand } from '@/components/brand/myshule-brand';

export async function generateMetadata({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  return { title: LEGAL_DOCUMENTS.find((doc) => doc.id === documentId)?.title ?? 'Legal document', alternates: { canonical: `/legal/documents/${documentId}` } };
}
export default async function LegalDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const document = LEGAL_DOCUMENTS.find((doc) => doc.id === documentId);
  if (!document) notFound();
  return <main className="legal-page"><div className="legal-reading-shell">
    <MyShuleBrand markSize={36} tone="brand" />
    <header className="legal-document-header"><p className="legal-eyebrow">Orbitlane Technologies · Kenya</p><h1>{document.title}</h1><p>Version {document.version} · {document.effectiveDateStatus === 'proposed' ? 'Proposed effective date' : 'Issue date'}: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Africa/Nairobi' }).format(new Date(`${document.effectiveDate}T00:00:00Z`))}</p>
    {'sourceUrl' in document && <a className="legal-link mt-3 block text-sm" href={document.sourceUrl} target="_blank" rel="noopener noreferrer">Download the original approved PDF</a>}</header>
    <LegalDocumentText content={document.content} />
    <p className="legal-hash">Document reference: {document.id}<br />SHA-256: {document.sha256}</p>
    <LegalLinks account />
  </div></main>;
}
