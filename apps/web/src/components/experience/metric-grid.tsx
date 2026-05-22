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
      className={`grid gap-4 ${
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
          sparkline={[18, 42, 34, 58, 52, 70, 64]}
        />
      ))}
    </section>
  );
}
