"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import type { StatusTone } from "@/lib/dashboard/types";

export interface ModuleShellSection {
  id: string;
  label: string;
  description: string;
  badge?: string;
  tone?: StatusTone;
}

export function ModuleShell({
  eyebrow,
  title,
  description,
  actions,
  meta,
  sections,
  activeSection,
  onSectionChange,
  children,
  sidebarFooter,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
  sections: ModuleShellSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  children: ReactNode;
  sidebarFooter?: ReactNode;
}) {
  return (
    <div className="app-module-shell space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        meta={meta}
      />

      <div className="app-module-grid grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="xl:hidden">
          <MobileWorkspaceNavigation
            mobilePlacement="inline"
            label={`${title} sections`}
            value={activeSection}
            onValueChange={onSectionChange}
            items={sections.map((section) => ({
              ...section,
              badge: section.badge && section.tone
                ? <StatusPill label={section.badge} tone={section.tone} />
                : section.badge,
            }))}
            footer={sidebarFooter}
          />
        </div>
        <Card className="hidden h-fit p-3 xl:block xl:sticky xl:top-6">
          <div className="border-b border-border px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Module Sections
            </p>
          </div>

          <nav aria-label={`${title} sections`} className="dashboard-navigation space-y-1 px-2 py-3">
            {sections.map((section) => {
              const active = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  aria-current={active ? "page" : undefined}
                  className="dashboard-nav-item"
                >
                  <span className="dashboard-nav-label">{section.label}</span>
                  {section.badge ? (
                    section.tone ? (
                      <StatusPill label={section.badge} tone={section.tone} />
                    ) : (
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {section.badge}
                      </span>
                    )
                  ) : null}
                </button>
              );
            })}
          </nav>

          {sidebarFooter ? (
            <div className="border-t border-border px-3 py-3">{sidebarFooter}</div>
          ) : null}
        </Card>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
