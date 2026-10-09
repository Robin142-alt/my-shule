'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { LegalDocumentText } from './legal-document';
import { LEGAL_DOCUMENTS } from '../../../../../shared/legal/documents';
import type { IncorporatedLegalDocument } from '../../../../../shared/legal/release';

export function IncorporatedDocumentLink({ document }: { document: IncorporatedLegalDocument }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="legal-link text-left text-sm" onClick={() => setOpen(true)}>{document.title} · v{document.version}</button>
    <Modal open={open} onClose={() => setOpen(false)} title={document.title} description={`Version ${document.version} · Orbitlane Technologies`} size="lg" mobileFullScreen><LegalDocumentText content={document.content}/><p className="legal-hash">SHA-256: {document.sha256}</p></Modal></>;
}

export function LegalDocumentLink({ documentId, children }: { documentId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const document = LEGAL_DOCUMENTS.find((doc) => doc.id === documentId);
  if (!document) return <Link href={`/legal/documents/${encodeURIComponent(documentId)}`}>{children}</Link>;
  return <>
    <a href={`/legal/documents/${document.id}`} className="legal-link" onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); setOpen(true); } }}>{children}</a>
    <Modal open={open} onClose={() => setOpen(false)} title={document.title} description={`Version ${document.version} · Orbitlane Technologies`} size="lg" mobileFullScreen>
      <LegalDocumentText content={document.content} />
      {'sourceUrl' in document && <a className="legal-link mb-4 block" href={document.sourceUrl} target="_blank" rel="noopener noreferrer">Download the original approved PDF</a>}
      <Link className="legal-link" target="_blank" href={`/legal/documents/${document.id}`}>Open document in a new tab</Link>
    </Modal>
  </>;
}
