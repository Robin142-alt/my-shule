import { SITE_CONTACT_PHONE } from "@/lib/seo";
import { CTAButton } from "@/components/marketing/cta-button";

export function HeroSection({
  title,
  description,
  secondaryDescription,
  primaryCta,
  secondaryCta,
  visual,
}: {
  title: string;
  description: string;
  secondaryDescription?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  visual?: React.ReactNode;
}) {
  return (
    <section className="bg-[#f8fafc]">
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10">
        <div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#0b1f3a] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569]">{description}</p>
          {secondaryDescription ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#475569]">{secondaryDescription}</p>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CTAButton href={primaryCta.href}>{primaryCta.label}</CTAButton>
            {secondaryCta ? (
              <CTAButton href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </CTAButton>
            ) : null}
          </div>
          <p className="mt-5 text-sm font-semibold text-[#0b1f3a]">Call {SITE_CONTACT_PHONE}</p>
        </div>
        <div>{visual}</div>
      </div>
    </section>
  );
}
