import { MessageSquare, ReceiptText, UserPlus } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { OperationalTimeline } from "@/components/ui/command-primitives";
import type { ActivityItem } from "@/lib/dashboard/types";

const iconMap = {
  payment: ReceiptText,
  student: UserPlus,
  communication: MessageSquare,
} as const;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card data-testid="activity-feed" className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="section-title">
          Recent activity
        </h3>
        <span className="badge badge-neutral">
          {items.length} events
        </span>
      </div>

      <OperationalTimeline
        items={items.map((item) => {
          const Icon = iconMap[item.category];

          return {
            id: item.id,
            title: item.title,
            detail: `${item.detail} - ${item.actor}`,
            timeLabel: item.timeLabel,
            icon: (
              <Link href={item.href} data-testid="activity-item" aria-label={item.title}>
                <Icon className="h-3.5 w-3.5 text-accent" />
              </Link>
            ),
          };
        })}
      />
    </Card>
  );
}
