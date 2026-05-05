import { Card } from "@/components/ui/card";
import type { ExperienceMetric } from "@/lib/experiences/types";

export function MetricGrid({
  items,
  columns = "four",
}: {
  items: ExperienceMetric[];
  columns?: "three" | "four";
}) {
  return (
    <section
      className={`grid gap-4 ${
        columns === "three" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {items.map((item) => (
        <Card key={item.id} className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {item.label}
          </p>
          <p className="mt-3 text-3xl font-bold text-foreground">{item.value}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm leading-6 text-muted">{item.helper}</p>
            {item.trend ? (
              <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-foreground">
                {item.trend}
              </span>
            ) : null}
          </div>
        </Card>
      ))}
    </section>
  );
}
