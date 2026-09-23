import { CommandMetricCard } from "@/components/ui/command-primitives";
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
      className={`app-metric-grid grid gap-4 ${
        columns === "three" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {items.map((item) => (
        <CommandMetricCard
          key={item.id}
          label={item.label}
          value={item.value}
          helper={item.helper}
          trend={item.trend}
        />
      ))}
    </section>
  );
}
