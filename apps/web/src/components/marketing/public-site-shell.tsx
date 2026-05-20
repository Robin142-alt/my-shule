import Link from "next/link";
import { PhoneCall } from "lucide-react";

import { SITE_CONTACT_PHONE, SITE_NAME } from "@/lib/seo";
import { CTAButton } from "@/components/marketing/cta-button";

const primaryLinks = [
  { label: "Parent Portal", href: "/parent-portal" },
  { label: "School Portal", href: "/school-portal" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Login", href: "/login" },
];

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1f3a]">
      <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="MyShule home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a] text-sm font-bold text-white">
              MS
            </span>
            <span className="text-lg font-semibold text-[#0b1f3a]">{SITE_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-[#334155] transition hover:bg-[#f1f5f9] hover:text-[#0b1f3a]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={`tel:${SITE_CONTACT_PHONE}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm font-semibold text-[#0b1f3a] transition hover:border-[#f97316]"
            >
              <PhoneCall className="h-4 w-4 text-[#f97316]" aria-hidden="true" />
              {SITE_CONTACT_PHONE}
            </a>
            <CTAButton href="/school-portal" variant="dark" showArrow={false}>
              Request Demo
            </CTAButton>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 border-t border-[#e2e8f0] px-5 py-3 text-sm font-semibold sm:hidden" aria-label="Mobile navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl bg-[#f8fafc] px-3 py-2 text-center text-[#334155]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="border-t border-[#e2e8f0] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:px-10">
          <div>
            <p className="text-xl font-semibold text-[#0b1f3a]">{SITE_NAME}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#475569]">
              Structured visibility for Kenyan schools across academic, financial, operational, welfare, communication, governance, security, and intelligence layers.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#0b1f3a]">{SITE_CONTACT_PHONE}</p>
          </div>
          <div className="grid gap-3 text-sm font-semibold sm:grid-cols-2">
            {[
              ...primaryLinks,
              { label: "Login as Parent", href: "/parent/login" },
              { label: "Login to Dashboard", href: "/school/login" },
              { label: "Request Demo", href: "/school-portal" },
            ].map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href} className="text-[#334155] hover:text-[#c2410c]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
