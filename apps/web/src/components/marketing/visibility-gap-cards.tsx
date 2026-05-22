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
  const tone = mode === "gap" ? "text-accent bg-accent/15" : "text-sky-200 bg-sky-400/15";

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
      <h2 className="text-3xl font-semibold leading-tight text-foreground">{title}</h2>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item} className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.2)] backdrop-blur">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold leading-6 text-foreground">{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
