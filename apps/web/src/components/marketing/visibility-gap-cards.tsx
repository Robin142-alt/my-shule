import { AlertCircle, CheckCircle2 } from "lucide-react";

export function VisibilityGapCards({
  title,
  items,
  mode = "gap",
}: {
  title: string;
  items: string[];
  mode?: "gap" | "visible";
}) {
  const Icon = mode === "gap" ? AlertCircle : CheckCircle2;
  const tone = mode === "gap" ? "text-[#c2410c] bg-[#fff7ed]" : "text-[#1d4ed8] bg-[#eff6ff]";

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
      <h2 className="text-3xl font-semibold leading-tight text-[#0b1f3a]">{title}</h2>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item} className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#0b1f3a]">{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
