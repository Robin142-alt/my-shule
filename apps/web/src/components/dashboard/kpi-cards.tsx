import { CommandMetricCard } from "@/components/ui/command-primitives";
import { maskValue } from "@/lib/dashboard/format";
import type { KpiCard } from "@/lib/dashboard/types";

export function KpiCards({ cards }: { cards: KpiCard[] }) {
  return (
    <section data-testid="kpi-strip" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        return (
          <CommandMetricCard
            key={card.id}
            href={card.href}
            label={card.label}
            value={maskValue(card.value, Boolean(card.masked))}
            helper={card.helper}
            trend={card.trendValue}
            direction={card.trendDirection}
            sparkline={card.sparkline}
            tone={card.trendDirection === "up" ? "ok" : "warning"}
            className={`widget-enter widget-enter-delay-${Math.min(index + 1, 4)}`}
          />
        );
      })}
    </section>
  );
}
