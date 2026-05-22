"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import type {
  ExperienceNavItem,
  ExperienceProfile,
} from "@/lib/experiences/types";

type SidebarVariant = "platform" | "school" | "portal";

const variantStyles: Record<
  SidebarVariant,
  {
    shell: string;
    active: string;
    idle: string;
    profileCard: string;
  }
> = {
  platform: {
    shell:
      "enterprise-sidebar",
    active: "bg-white/10 text-white shadow-[inset_4px_0_0_var(--accent)]",
    idle: "text-white/75 hover:bg-white/10 hover:text-white",
    profileCard:
      "border-white/10 bg-white/10 text-white",
  },
  school: {
    shell:
      "enterprise-sidebar lg:rounded-[var(--radius)]",
    active: "bg-white/10 text-white shadow-[inset_4px_0_0_var(--accent)]",
    idle: "text-white/75 hover:bg-white/10 hover:text-white",
    profileCard: "border-white/10 bg-white/10 text-white",
  },
  portal: {
    shell:
      "enterprise-sidebar lg:rounded-[var(--radius)]",
    active: "bg-white/10 text-white shadow-[inset_4px_0_0_var(--accent)]",
    idle: "text-white/75 hover:bg-white/10 hover:text-white",
    profileCard: "border-white/10 bg-white/10 text-white",
  },
};

export function AppSidebar({
  variant,
  brand,
  navItems,
  activeHref,
  profile,
  mobileOpen,
  onClose,
}: {
  variant: SidebarVariant;
  brand: { title: string; subtitle: string };
  navItems: ExperienceNavItem[];
  activeHref: string;
  profile: ExperienceProfile;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const styles = variantStyles[variant];
  const groupedItems = navItems.reduce<Array<{ group: string; items: ExperienceNavItem[] }>>(
    (groups, item) => {
      const groupLabel = item.group ?? "Workspace";
      const existingGroup = groups.find((entry) => entry.group === groupLabel);

      if (existingGroup) {
        existingGroup.items.push(item);
        return groups;
      }

      groups.push({ group: groupLabel, items: [item] });
      return groups;
    },
    [],
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-[260px] transform border-r px-4 py-5 transition duration-150 lg:static lg:translate-x-0 ${styles.shell} ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Workspace
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {brand.title}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {brand.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-sm)] border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white/80 lg:hidden"
        >
          Close
        </button>
      </div>

      <nav className="mt-6 space-y-5">
        {groupedItems.map((group) => (
          <div key={group.group} className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {group.group}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition duration-150 ${
                    isActive ? styles.active : styles.idle
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/75">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Card className={`mt-6 p-4 !border-white/10 !bg-white/10 !text-white !shadow-none ${styles.profileCard}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
          Active session
        </p>
        <p className="mt-3 text-sm font-semibold text-white">
          {profile.name}
        </p>
        <p className="mt-1 text-sm text-white/70">
          {profile.roleLabel}
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">
          {profile.contextLabel}
        </p>
      </Card>
    </aside>
  );
}
