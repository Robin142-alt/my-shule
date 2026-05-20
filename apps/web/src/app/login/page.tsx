import type { Metadata } from "next";
import { BarChart3, GraduationCap, Landmark, LogIn } from "lucide-react";

import { PublicSchoolLoginView } from "@/components/auth/public-school-login-view";
import { ContactStrip } from "@/components/marketing/contact-strip";
import { CTAButton } from "@/components/marketing/cta-button";
import { InfoCard } from "@/components/marketing/info-card";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getPublicSeoRoute } from "@/lib/seo/public-routes";
import { buildPublicPageJsonLd } from "@/lib/seo/structured-data";
import { redirectPublicEntryToKnownSession } from "@/lib/routing/public-entry-session";

const route = getPublicSeoRoute("/login")!;

export const metadata: Metadata = createPublicMetadata(route);

const accessCards = [
  {
    title: "Parent Portal",
    description: "Open family visibility for attendance, academics, discipline, health logs, and official school communication.",
    href: "/parent/login",
    action: "Login as Parent",
    icon: GraduationCap,
  },
  {
    title: "School Portal",
    description: "Open the institutional workspace for centralized reporting and role-aware school operations.",
    href: "/school/login",
    action: "School Portal",
    icon: Landmark,
  },
  {
    title: "Dashboard",
    description: "Use the main MyShule sign-in route for school staff and leadership dashboard access.",
    href: "#dashboard-sign-in",
    action: "Login to Dashboard",
    icon: BarChart3,
  },
];

export default async function PublicLoginPage() {
  await redirectPublicEntryToKnownSession();

  return (
    <PublicSiteShell>
      <SeoJsonLd data={buildPublicPageJsonLd(route)} />
      <section className="bg-[#f8fafc]">
        <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-[#0b1f3a] sm:text-5xl">
              Login to the MyShule visibility layer
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569]">
              Choose the right entry point for parent visibility, school operations, or the dashboard that brings reporting into one structured view.
            </p>
            <div className="mt-7 grid gap-4">
              {accessCards.map((card) => {
                const Icon = card.icon;

                return (
                  <a
                    key={card.title}
                    href={card.href}
                    className="group rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition hover:border-[#f97316] hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#0b1f3a]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold text-[#0b1f3a]">{card.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-[#475569]">{card.description}</span>
                        <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#c2410c]">
                          {card.action}
                          <LogIn className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div id="dashboard-sign-in" className="scroll-mt-28 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
            <PublicSchoolLoginView />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Parent Portal" description="Access the public parent route first, then sign in to the family portal." icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />} tone="blue" />
            <InfoCard title="School Portal" description="Open the public school route first, then sign in to the institutional workspace." icon={<Landmark className="h-5 w-5" aria-hidden="true" />} />
            <InfoCard title="Dashboard" description="View analytics in the Dashboard after your role and school context are verified." icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />} tone="orange" />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/parent-portal" variant="secondary">Parent Portal</CTAButton>
            <CTAButton href="/school-portal" variant="secondary">School Portal</CTAButton>
            <CTAButton href="/dashboard">Dashboard</CTAButton>
          </div>
        </div>
      </section>

      <ContactStrip
        title="Need help choosing the right MyShule access route?"
        description="Call for setup, access guidance, or a school demo."
        primaryHref="/school-portal"
        primaryLabel="Request Demo"
      />
    </PublicSiteShell>
  );
}
