import type { Metadata } from "next";
import { Activity, BarChart3, ClipboardCheck, Landmark, MessageSquareText, ShieldCheck } from "lucide-react";

import { ContactStrip } from "@/components/marketing/contact-strip";
import { CTAButton } from "@/components/marketing/cta-button";
import { HeroSection } from "@/components/marketing/hero-section";
import { InfoCard } from "@/components/marketing/info-card";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getPublicSeoRoute } from "@/lib/seo/public-routes";
import { buildPublicPageJsonLd } from "@/lib/seo/structured-data";

const route = getPublicSeoRoute("/dashboard")!;

export const metadata: Metadata = createPublicMetadata(route);

function DashboardPreview() {
  const rows = [
    ["Fee visibility", "Collections, balances, and reconciliation"],
    ["Academic progress", "Performance patterns and term reports"],
    ["Operational reporting", "Attendance, timetable, resources, and movement"],
    ["Communication traceability", "SMS and official messages connected to records"],
    ["Leadership accountability", "Role-aware oversight and audit trails"],
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-surface/80 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.26)] backdrop-blur">
      <div className="rounded-xl bg-[#071D49] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Dashboard</p>
            <p className="mt-1 text-xs text-white/65">Unified school visibility</p>
          </div>
          <Activity className="h-5 w-5 text-[#fed7aa]" aria-hidden="true" />
        </div>
        <div className="mt-5 space-y-3">
          {rows.map(([label, helper]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs leading-5 text-white/65">{helper}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboardPage() {
  return (
    <PublicSiteShell>
      <SeoJsonLd data={buildPublicPageJsonLd(route)} />
      <HeroSection
        title="Structured visibility across every school decision"
        description="The MyShule Dashboard turns daily school records into one operating view for financial visibility, academic progress, operational reporting, communication traceability, audit trails, and leadership accountability."
        primaryCta={{ label: "Login to Dashboard", href: "/login" }}
        secondaryCta={{ label: "Talk to Us", href: "tel:0769622589" }}
        visual={<DashboardPreview />}
      />

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard title="Financial visibility" description="Leaders see fee activity, balances, payment context, and approval records from one view." icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />} tone="orange" />
          <InfoCard title="Academic progress" description="Performance records and assessment reporting are visible without waiting for manual summaries." icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} tone="blue" />
          <InfoCard title="Operational reporting" description="Attendance, timetable, transport, resources, and assets become part of the same school picture." icon={<Activity className="h-5 w-5" aria-hidden="true" />} />
          <InfoCard title="Communication traceability" description="School messages, SMS records, and parent updates remain connected to official activity." icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />} tone="blue" />
          <InfoCard title="Audit trails" description="Important actions become easier to review because they are connected to roles and school context." icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} />
          <InfoCard title="Leadership accountability" description="Principals and administrators see the institution as one operating system, not disconnected departments." icon={<Landmark className="h-5 w-5" aria-hidden="true" />} tone="orange" />
        </div>
      </section>

      <section className="bg-transparent">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              See the three most important entry points
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              MyShule keeps Parent Portal, School Portal, and Dashboard visible because those are the routes users need most.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/parent-portal" variant="secondary">Parent Portal</CTAButton>
            <CTAButton href="/school-portal" variant="secondary">School Portal</CTAButton>
            <CTAButton href="/login">Login</CTAButton>
          </div>
        </div>
      </section>

      <ContactStrip
        title="Open a clearer school dashboard"
        description="Give leadership one place to see the records that shape daily decisions."
        primaryHref="/login"
        primaryLabel="Login to Dashboard"
      />
    </PublicSiteShell>
  );
}
