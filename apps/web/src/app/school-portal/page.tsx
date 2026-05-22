import type { Metadata } from "next";
import { BarChart3, ClipboardList, Database, Landmark, Layers3, MessageSquareText, ShieldCheck } from "lucide-react";

import { ContactStrip } from "@/components/marketing/contact-strip";
import { CTAButton } from "@/components/marketing/cta-button";
import { HeroSection } from "@/components/marketing/hero-section";
import { InfoCard } from "@/components/marketing/info-card";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getPublicSeoRoute } from "@/lib/seo/public-routes";
import { buildPublicPageJsonLd } from "@/lib/seo/structured-data";

const route = getPublicSeoRoute("/school-portal")!;

export const metadata: Metadata = createPublicMetadata(route);

const blindSpotGroups = [
  {
    title: "Financial Control",
    items: ["Fee Management - delayed reconciliation and incomplete payment visibility", "Procurement - untracked approvals and spending flow"],
  },
  {
    title: "Academic Systems",
    items: [
      "Student Management - fragmented student lifecycle records",
      "Admissions - scattered intake and enrollment data",
      "Academic Structure - inconsistent curriculum mapping",
      "Exams and Results - delayed grading and performance tracking",
    ],
  },
  {
    title: "Discipline and Welfare",
    items: ["Discipline - incomplete behavior history tracking", "Clinic and Health - unstructured medical logs"],
  },
  {
    title: "Operations",
    items: [
      "Timetable - conflicts and manual scheduling errors",
      "Teacher Attendance - manual errors and delayed reporting",
      "Transport - unverified student movement logs",
    ],
  },
  {
    title: "Resources",
    items: [
      "Store and Inventory - untracked items and stock gaps",
      "Library - missing book return tracking",
      "Asset Tracking - unclear asset lifecycle visibility",
      "Laboratory Management - untracked lab usage and materials",
    ],
  },
  {
    title: "Boarding",
    items: ["Hostel and Boarding - incomplete student accommodation records"],
  },
  {
    title: "Communication",
    items: ["Communication and SMS - fragmented messaging history", "Parent Portal - delayed updates and inconsistent visibility"],
  },
  {
    title: "Governance",
    items: [
      "Staff and HR - scattered staff records",
      "Reports - manually compiled and delayed insights",
      "Administrative Leadership - siloed departmental decisions",
    ],
  },
  {
    title: "Executive Control",
    items: ["Principal Dashboard - no unified school-wide visibility"],
  },
  {
    title: "Digital Learning",
    items: ["CBT Exams - unmonitored exam sessions", "eLearning and LMS - fragmented learning tracking"],
  },
  {
    title: "Intelligence Layer",
    items: ["AI Insights - underutilized or missing operational predictions"],
  },
  {
    title: "Security and Access",
    items: ["Visitor Management - manual logs and incomplete entry tracking"],
  },
];

function SchoolControlPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/80 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.26)] backdrop-blur">
      <div className="rounded-xl bg-[#071D49] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">School Portal</p>
            <p className="mt-1 text-xs text-white/65">Centralized control and structured reporting</p>
          </div>
          <span className="rounded-xl bg-[#f97316] px-3 py-1 text-xs font-semibold">Control layer</span>
        </div>
        <div className="mt-5 space-y-3">
          {[
            ["Finance", "Payment visibility and approvals"],
            ["Academics", "Results and progression clarity"],
            ["Operations", "Timetable, staff, and resources"],
            ["Communication", "SMS and parent traceability"],
          ].map(([label, helper]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs leading-5 text-white/65">{helper}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SchoolPortalPage() {
  return (
    <PublicSiteShell>
      <SeoJsonLd data={buildPublicPageJsonLd(route)} />
      <HeroSection
        title="Every decision in your school should be backed by structured data"
        description="Without centralized systems, school operations depend on delayed reporting, manual registers, and fragmented departmental updates."
        primaryCta={{ label: "Login to Dashboard", href: "/school/login" }}
        secondaryCta={{ label: "Request Demo", href: "tel:0769622589" }}
        visual={<SchoolControlPreview />}
      />

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold leading-tight text-foreground">Operational blind spots covered across the school</h2>
          <p className="mt-3 text-base leading-7 text-muted">
            MyShule connects modules to visibility outcomes, so each department contributes to a clearer institutional record.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {blindSpotGroups.map((group) => (
            <article key={group.title} className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.18)] backdrop-blur">
              <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
              <ul className="mt-4 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm leading-6 text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-foreground">
                From fragmented reporting to unified school visibility
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                The School Portal organizes daily records into a control layer that supports department heads and school leadership.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="/school/login">Login to Dashboard</CTAButton>
                <CTAButton href="/dashboard" variant="secondary">Dashboard</CTAButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard title="Real-time dashboards per department" description="Each team sees the work it owns while leadership sees the wider institution." icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />} />
              <InfoCard title="Centralized audit trail" description="Actions across important modules become easier to review and verify." icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} tone="orange" />
              <InfoCard title="Structured accountability per role" description="Staff work inside role-aware access patterns that match school responsibilities." icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} tone="blue" />
              <InfoCard title="Cross-department visibility" description="Finance, academics, welfare, operations, and communication stop living in isolation." icon={<Layers3 className="h-5 w-5" aria-hidden="true" />} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Institutional records" description="Student, staff, asset, visitor, and communication records stay tied to the school environment." icon={<Database className="h-5 w-5" aria-hidden="true" />} />
          <InfoCard title="Leadership visibility" description="Principals and administrators can see what needs review without chasing departmental reports." icon={<Landmark className="h-5 w-5" aria-hidden="true" />} tone="blue" />
          <InfoCard title="Communication traceability" description="SMS and parent communication become part of the official operational record." icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />} tone="orange" />
        </div>
      </section>

      <ContactStrip
        title="Build a clearer school control layer"
        description="Centralize reporting, accountability, and visibility across every department."
        primaryHref="/school/login"
        primaryLabel="Login to Dashboard"
      />
    </PublicSiteShell>
  );
}
