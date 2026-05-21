import { SITE_CONTACT_PHONE } from "@/lib/seo";
import { CTAButton } from "@/components/marketing/cta-button";

export function ContactStrip({
  title = "Bring clarity to every layer of your school",
  description = "Talk to MyShule about structured visibility for your school operations.",
  primaryHref = "/school-portal",
  primaryLabel = "Request Demo",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="bg-[#0b1f3a] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">{description}</p>
          <p className="mt-3 text-lg font-semibold text-[#fed7aa]">{SITE_CONTACT_PHONE}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CTAButton href={primaryHref}>{primaryLabel}</CTAButton>
          <CTAButton href={`tel:${SITE_CONTACT_PHONE}`} variant="secondary" phone showArrow={false}>
            {SITE_CONTACT_PHONE}
          </CTAButton>
        </div>
      </div>
    </section>
  );
}
