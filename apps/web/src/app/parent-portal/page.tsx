import type { Metadata } from "next";
import { BellRing, BookOpenCheck, HeartPulse, MessageSquareText, ShieldCheck } from "lucide-react";

import { ContactStrip } from "@/components/marketing/contact-strip";
import { CTAButton } from "@/components/marketing/cta-button";
import { HeroSection } from "@/components/marketing/hero-section";
import { InfoCard } from "@/components/marketing/info-card";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { VisibilityGapCards } from "@/components/marketing/visibility-gap-cards";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getPublicSeoRoute } from "@/lib/seo/public-routes";
import { buildPublicPageJsonLd } from "@/lib/seo/structured-data";

const route = getPublicSeoRoute("/parent-portal")!;

export const metadata: Metadata = createPublicMetadata(route);

const visibilityGaps = [
  "Delayed academic updates after exams are already completed",
  "Missing attendance or absence context",
  "Lack of structured clinic or health feedback",
  "Fragmented communication from school staff",
];

const visibleItems = [
  "Attendance tracking history",
  "Academic performance per term",
  "Discipline records and behavior notes",
  "Clinic and health logs if enabled by school",
  "Official school announcements",
];

function ParentVisibilityPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/80 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.26)] backdrop-blur">
      <div className="rounded-xl bg-[#071D49] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Parent visibility record</p>
            <p className="mt-1 text-xs text-white/65">Structured updates from the school</p>
          </div>
          <span className="rounded-xl bg-[#f97316] px-3 py-1 text-xs font-semibold">Parent Portal</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Attendance", "96%", "Two late arrivals explained"],
            ["Academics", "B+", "Term trend improving"],
            ["Discipline", "Clear", "No active escalation"],
            ["Clinic", "Updated", "Medicine note visible"],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
              <p className="text-xs font-semibold text-white/65">{label}</p>
              <p className="mt-2 text-xl font-semibold text-[#fed7aa]">{value}</p>
              <p className="mt-1 text-xs leading-5 text-white/65">{helper}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-4">
        <p className="text-sm font-semibold text-foreground">Official announcement</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Parent meeting moved to Friday. Attendance and fee statement will be available through the portal.
        </p>
      </div>
    </div>
  );
}

export default function ParentPortalPage() {
  return (
    <PublicSiteShell>
      <SeoJsonLd data={buildPublicPageJsonLd(route)} />
      <HeroSection
        title="Know what happens at school - beyond the classroom"
        description="Parents should not rely on delayed updates or informal communication."
        secondaryDescription="This system brings structured visibility into attendance, academics, discipline, and school communication."
        primaryCta={{ label: "Login as Parent", href: "/parent/login" }}
        secondaryCta={{ label: "Request School Access", href: "/school-portal" }}
        visual={<ParentVisibilityPreview />}
      />

      <VisibilityGapCards title="Visibility gaps parents live with" items={visibilityGaps} />
      <VisibilityGapCards title="What becomes visible" items={visibleItems} mode="visible" />

      <section className="bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              title="Attendance context"
              description="Absence and lateness records become easier to verify without waiting for informal updates."
              icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
            />
            <InfoCard
              title="Academic visibility"
              description="Term performance and published results stay accessible when families need clarity."
              icon={<BookOpenCheck className="h-5 w-5" aria-hidden="true" />}
              tone="blue"
            />
            <InfoCard
              title="Health feedback"
              description="Clinic and medical logs can be shared in a structured way when the school enables them."
              icon={<HeartPulse className="h-5 w-5" aria-hidden="true" />}
              tone="orange"
            />
            <InfoCard
              title="Official communication"
              description="Announcements and SMS history stay connected to the school record."
              icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />}
            />
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-surface/80 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.18)] backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <ShieldCheck className="h-6 w-6 text-[#f97316]" aria-hidden="true" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Parent access should feel clear and official</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  The Parent Portal gives families a structured place to check what the school has published, reducing delayed updates and fragmented communication.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <CTAButton href="/parent/login">Login as Parent</CTAButton>
                <CTAButton href="/login" variant="secondary">Login</CTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactStrip
        title="Give parents structured visibility"
        description="Connect families to official updates without depending on fragmented communication."
        primaryHref="/parent/login"
        primaryLabel="Login as Parent"
      />
    </PublicSiteShell>
  );
}
