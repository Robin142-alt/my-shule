"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function Tabs({
  items,
  defaultTab,
}: {
  items: TabItem[];
  defaultTab?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? items[0]?.id ?? "");

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        className="flex flex-wrap gap-1 rounded-[var(--radius-sm)] border border-border bg-white p-1 shadow-sm"
      >
        {items.map((item) => {
          const active = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(item.id)}
              className={`rounded-[var(--radius-xs)] px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150 ${
                active
                  ? "bg-accent text-white shadow-[0_10px_22px_rgba(255,122,26,0.22)]"
                  : "text-muted hover:bg-surface-strong hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="page-enter">{items.find((item) => item.id === activeTab)?.panel}</div>
    </div>
  );
}
