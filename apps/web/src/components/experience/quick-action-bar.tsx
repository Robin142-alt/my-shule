import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function QuickActionBar({
  actions,
}: {
  actions: Array<{
    id: string;
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
  }>;
}) {
  return (
    <Card className="p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-xl border border-border bg-surface-muted px-4 py-4 transition duration-150 hover:bg-surface-strong"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-foreground shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="mt-1 text-sm text-muted">{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
