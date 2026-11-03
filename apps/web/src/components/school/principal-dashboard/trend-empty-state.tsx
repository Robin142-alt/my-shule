import { BarChart3 } from "lucide-react";

export function TrendEmptyState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface p-5 text-center"
    >
      <BarChart3 className="h-8 w-8 text-muted" aria-hidden="true" />
      <p className="max-w-sm text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}
