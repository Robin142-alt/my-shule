import { BarChart3 } from "lucide-react";

export function TrendEmptyState({ message }: { message: string }) {
  return (
    <div role="status" className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/25 bg-white/5 p-5 text-center">
      <BarChart3 className="h-8 w-8 text-white/60" aria-hidden="true" />
      <p className="max-w-sm text-sm leading-6 text-white/80">{message}</p>
    </div>
  );
}
