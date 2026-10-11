import { LegalGate } from '@/components/legal/legal-gate';
export const metadata = { title: 'My agreements', robots: { index: false, follow: false } };
export default function AgreementsPage() { return <LegalGate mode="review" />; }
