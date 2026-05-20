import Link from "next/link";
import { ArrowRight, PhoneCall } from "lucide-react";

type CtaVariant = "primary" | "secondary" | "dark" | "ghost";

const variantClasses: Record<CtaVariant, string> = {
  primary:
    "bg-[#f97316] text-white shadow-[0_14px_32px_rgba(249,115,22,0.24)] hover:bg-[#ea580c]",
  secondary:
    "border border-[#cbd5e1] bg-white text-[#0b1f3a] shadow-sm hover:border-[#f97316] hover:text-[#c2410c]",
  dark: "bg-[#0b1f3a] text-white shadow-[0_14px_32px_rgba(11,31,58,0.20)] hover:bg-[#12345f]",
  ghost: "bg-transparent text-[#0b1f3a] hover:bg-[#e2e8f0]",
};

export function CTAButton({
  href,
  children,
  variant = "primary",
  showArrow = true,
  phone = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: CtaVariant;
  showArrow?: boolean;
  phone?: boolean;
}) {
  const className = [
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316]",
    variantClasses[variant],
  ].join(" ");

  if (href.startsWith("tel:") || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {phone ? <PhoneCall className="h-4 w-4" aria-hidden="true" /> : null}
        <span>{children}</span>
        {showArrow && !phone ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span>{children}</span>
      {showArrow ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}
