import { Card } from "@/components/ui/card";
import type { ExperienceChartPoint } from "@/lib/experiences/types";

export function ChartCard({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: ExperienceChartPoint[];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-6 text-center text-sm leading-6 text-muted">
          No data available yet. {subtitle} will appear here when source records are available.
        </p>
      ) : <div className="app-table-scroll mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label={`${title} chart`}>
        <div className="flex items-end gap-3 pb-1">
          {points.map((point) => (
            <div key={point.label} className="flex min-w-12 flex-1 flex-col items-center gap-2">
              <div aria-hidden="true" className="flex h-36 w-full items-end rounded-xl bg-surface-muted p-2 sm:h-48">
                <div
                  className="w-full rounded-lg bg-accent transition-[height] duration-150"
                  style={{ height: `${Math.max((point.value / maxValue) * 100, 0)}%` }}
                />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-foreground">{point.value}</p>
                <p className="text-xs text-muted">{point.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </Card>
  );
}
