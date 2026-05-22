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
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#071D49_0%,#0F2345_100%)]">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />
      <div aria-hidden="true" className="absolute left-[-12rem] top-[-12rem] h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10">
        <div className="relative z-10">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{description}</p>
          {secondaryDescription ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{secondaryDescription}</p>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CTAButton href={primaryCta.href}>{primaryCta.label}</CTAButton>
            {secondaryCta ? (
              <CTAButton href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </CTAButton>
            ) : null}
          </div>
          <p className="mt-5 text-sm font-semibold text-accent">Call {SITE_CONTACT_PHONE}</p>
        </div>
        <div className="relative z-10">{visual}</div>
      </div>
    </section>
  );
}
