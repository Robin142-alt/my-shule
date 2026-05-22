import Link from "next/link";
import { ArrowRight, PhoneCall } from "lucide-react";

type CtaVariant = "primary" | "secondary" | "dark" | "ghost";

const variantClasses: Record<CtaVariant, string> = {
  primary:
    "bg-[#FF7A1A] text-white shadow-[0_14px_32px_rgba(255,122,26,0.24)] hover:bg-[#E8670C] hover:shadow-[0_18px_42px_rgba(255,122,26,0.3)]",
  secondary:
    "border border-white/70 bg-white text-[#071D49] shadow-[0_12px_28px_rgba(2,6,23,0.14)] hover:border-[#FF7A1A]/60 hover:bg-[#FFF7ED] hover:text-[#E8670C]",
  dark: "bg-[#071D49] text-white shadow-[0_14px_32px_rgba(7,29,73,0.28)] hover:bg-[#0F2345]",
  ghost: "bg-transparent text-foreground hover:bg-white/[0.08]",
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
