import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";

export function BeforeAfterComparison({
  before,
  after,
}: {
  before: string[];
  after: string[];
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <ComparisonPanel title="Before" subtitle="Manual systems" items={before} icon="before" />
        <div className="hidden items-center justify-center lg:flex">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b1f3a] text-white shadow-lg">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <ComparisonPanel title="After" subtitle="MyShule" items={after} icon="after" />
      </div>
    </section>
  );
}

function ComparisonPanel({
  title,
  subtitle,
  items,
  icon,
}: {
  title: string;
  subtitle: string;
  items: string[];
  icon: "before" | "after";
}) {
  const Icon = icon === "before" ? CircleAlert : CheckCircle2;
  const tone = icon === "before" ? "text-[#c2410c] bg-[#fff7ed]" : "text-[#1d4ed8] bg-[#eff6ff]";

  return (
    <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold text-[#64748b]">{subtitle}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#0b1f3a]">{title}</h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-[#334155]">{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
