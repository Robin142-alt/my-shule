import Link from 'next/link';
export function LegalLinks({ account = false }: { account?: boolean }) {
  return <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-2 py-4 text-xs">
    <Link className="underline underline-offset-4" href="/privacy">Privacy Policy</Link>
    <Link className="underline underline-offset-4" href="/terms">Terms of Use</Link>
    {account && <Link className="underline underline-offset-4" href="/legal/accept">My agreements</Link>}
  </nav>;
}
