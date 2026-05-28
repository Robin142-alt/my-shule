import { BadgeCheck, Building2, Layers3, ShieldCheck } from "lucide-react";

const defaultBadges = [
  { label: "Built for Kenyan schools", icon: Building2 },
  { label: "Designed for accountability", icon: BadgeCheck },
  { label: "Separate school data", icon: Layers3 },
  { label: "Public and private institutions", icon: ShieldCheck },
];

export function TrustBadges({
  badges = defaultBadges,
}: {
  badges?: Array<{ label: string; icon?: React.ComponentType<{ className?: string; "aria-hidden"?: true }> }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {badges.map((badge) => {
        const Icon = badge.icon;

        return (
          <div
            key={badge.label}
            className="flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-surface/80 px-4 py-3 shadow-[0_18px_60px_rgba(2,6,23,0.2)] backdrop-blur"
          >
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <p className="text-sm font-semibold leading-5 text-foreground">{badge.label}</p>
          </div>
        );
      })}
    </div>
  );
}
