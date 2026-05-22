import type { Metadata } from "next";
import { BarChart3, ClipboardCheck, Landmark, Layers3, MessageSquareText, ShieldCheck } from "lucide-react";

import { BeforeAfterComparison } from "@/components/marketing/before-after-comparison";
import { ContactStrip } from "@/components/marketing/contact-strip";
import { CTAButton } from "@/components/marketing/cta-button";
import { HeroSection } from "@/components/marketing/hero-section";
import { InfoCard } from "@/components/marketing/info-card";
import { ModuleGrid, type ModuleLayer } from "@/components/marketing/module-grid";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getPublicSeoRoute } from "@/lib/seo/public-routes";
import { buildHomeJsonLd } from "@/lib/seo/structured-data";

const homeRoute = getPublicSeoRoute("/")!;

export const metadata: Metadata = createPublicMetadata(homeRoute);

const before = [
  "Fragmented records",
  "Delayed reporting",
  "Untracked inventory and assets",
  "Poor communication traceability",
  "Manual fee tracking errors",
];

const after = [
  "Unified school dashboard",
  "Real-time reporting",
  "Full audit trails",
  "Structured communication logs",
  "Controlled financial visibility",
];

const layers: ModuleLayer[] = [
  {
    title: "Academic Layer",
    description: "Learner progress becomes visible across admission, learning, exams, and digital assessment flows.",
    modules: ["Student Management", "Admissions", "Academic Structure", "Exams and Results", "CBT Exams", "eLearning and LMS"],
  },
  {
    title: "Financial Layer",
    description: "School leaders see payment visibility, approvals, and reporting without waiting for manual summaries.",
    modules: ["Fee Management", "Procurement", "Reports"],
  },
  {
    title: "Operations Layer",
    description: "Daily school movement, resources, schedules, and assets become easier to verify and account for.",
    modules: ["Timetable", "Teacher Attendance", "Transport", "Library", "Store and Inventory", "Asset Tracking"],
  },
  {
    title: "Welfare Layer",
    description: "Student care records become structured enough for earlier follow-up and clearer accountability.",
    modules: ["Clinic and Health", "Discipline", "Hostel and Boarding"],
  },
  {
    title: "Communication Layer",
    description: "Messages, SMS history, and parent visibility stay connected to official school records.",
    modules: ["Communication and SMS", "Parent Portal"],
  },
  {
    title: "Governance Layer",
    description: "School leadership sees staff, reports, and departmental accountability in one operating view.",
    modules: ["Staff and HR", "Administrative Leadership", "Principal Dashboard"],
  },
  {
    title: "Security Layer",
    description: "Movement through the institution becomes easier to trace with structured access records.",
    modules: ["Visitor Management"],
  },
  {
    title: "Intelligence Layer",
    description: "Operational patterns become visible before manual reports are compiled.",
    modules: ["AI Insights"],
  },
];

function IntelligencePreview() {
  const metrics = [
    ["Financial visibility", "84%", "Payments, balances, and approvals in one view"],
    ["Academic progress", "12", "Class streams needing performance review"],
    ["Communication trace", "248", "Official SMS and portal messages logged"],
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-surface/80 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.26)] backdrop-blur">
      <div className="rounded-xl bg-[#071D49] p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">MyShule command view</p>
            <p className="mt-1 text-xs text-white/65">Institutional visibility across departments</p>
          </div>
          <span className="rounded-xl bg-[#f97316] px-3 py-1 text-xs font-semibold text-white">
            Live clarity
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {metrics.map(([label, value, helper]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xl font-semibold text-[#fed7aa]">{value}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/65">{helper}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {["Parent Portal", "School Portal", "Dashboard"].map((label) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-xs font-semibold text-muted-strong">{label}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Structured visibility</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  return (
    <PublicSiteShell>
      <SeoJsonLd data={buildHomeJsonLd()} />
      <HeroSection
        title="From manual school operations to structured institutional intelligence"
        description="Schools operate best when every process is visible, trackable, and accountable across departments."
        secondaryDescription="MyShule brings clarity across academic, financial, and operational systems."
        primaryCta={{ label: "Get Started", href: "/school-portal" }}
        secondaryCta={{ label: "Talk to Us", href: "tel:0769622589" }}
        visual={<IntelligencePreview />}
      />

      <section className="border-y border-white/10 bg-[#071D49]/90">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-8 sm:px-8 md:grid-cols-3 lg:px-10">
          <InfoCard
            title="Parent Portal"
            description="Give families structured visibility into attendance, academics, discipline, clinic updates, and official school communication."
            icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />}
            tone="blue"
          />
          <InfoCard
            title="School Portal"
            description="Centralize school work so leaders are not waiting for fragmented departmental updates."
            icon={<Landmark className="h-5 w-5" aria-hidden="true" />}
          />
          <InfoCard
            title="Dashboard"
            description="Turn daily records into an executive view of finance, learning, operations, welfare, and accountability."
            icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
            tone="orange"
          />
        </div>
      </section>

      <BeforeAfterComparison before={before} after={after} />
      <ModuleGrid layers={layers} />

      <section className="bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-foreground">
                Built for accountable Kenyan institutions
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                MyShule is designed for schools that need clearer records, traceable communication, and shared visibility across departments.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="/parent-portal" variant="secondary">Parent Portal</CTAButton>
                <CTAButton href="/dashboard" variant="dark">Dashboard</CTAButton>
              </div>
            </div>
            <div>
              <TrustBadges />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Accountability", icon: ClipboardCheck },
                  { title: "Visibility", icon: Layers3 },
                  { title: "Trust", icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-xl border border-white/10 bg-surface/80 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.18)]">
                      <Icon className="h-5 w-5 text-[#f97316]" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactStrip />
    </PublicSiteShell>
  );
}
