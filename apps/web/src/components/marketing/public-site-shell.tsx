import Link from "next/link";
import { PhoneCall } from "lucide-react";

import { MyShuleBrand } from "@/components/brand/myshule-brand";
import { CTAButton } from "@/components/marketing/cta-button";
import { SITE_CONTACT_PHONE } from "@/lib/seo";

const primaryLinks = [
  { label: "Parent Portal", href: "/parent-portal" },
  { label: "School Portal", href: "/school-portal" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Login", href: "/login" },
];

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="command-background min-h-screen text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071D49]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="MyShule home">
            <MyShuleBrand markSize={42} preload nameClassName="text-xl" />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={`tel:${SITE_CONTACT_PHONE}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 text-sm font-semibold text-white transition hover:border-accent/50 hover:bg-white/[0.14]"
            >
              <PhoneCall className="h-4 w-4 text-[#f97316]" aria-hidden="true" />
              {SITE_CONTACT_PHONE}
            </a>
            <CTAButton href="/school-portal" variant="dark" showArrow={false}>
              Request Demo
            </CTAButton>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 border-t border-white/10 px-5 py-3 text-sm font-semibold sm:hidden" aria-label="Mobile navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl bg-white/[0.08] px-3 py-2 text-center text-white/80"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="border-t border-white/10 bg-[#071D49]/95">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:px-10">
          <div>
            <MyShuleBrand markSize={44} nameClassName="text-xl" />
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Structured visibility for Kenyan schools across academic, financial, operational, welfare, communication, governance, security, and intelligence layers.
            </p>
            <p className="mt-4 text-sm font-semibold text-accent">{SITE_CONTACT_PHONE}</p>
          </div>
          <div className="grid gap-3 text-sm font-semibold sm:grid-cols-2">
            {[
              ...primaryLinks,
              { label: "Login as Parent", href: "/parent/login" },
              { label: "Login to Dashboard", href: "/school/login" },
              { label: "Request Demo", href: "/school-portal" },
            ].map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href} className="text-white/75 hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
