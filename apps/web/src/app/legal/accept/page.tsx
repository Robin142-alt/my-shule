import { LegalGate } from '@/components/legal/legal-gate';
export const metadata = { title: 'Your agreements', robots: { index: false, follow: false } };
export default function AcceptancePage() { return <LegalGate review />; }
