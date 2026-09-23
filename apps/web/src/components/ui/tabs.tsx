"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function Tabs({
  items,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
}: {
  items: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const [localTab, setActiveTab] = useState(defaultTab ?? items[0]?.id ?? "");
  const activeTab = controlledTab ?? localTab;
  const id = useId();
  const tabListRef = useRef<HTMLDivElement>(null);

  function selectTab(next: string) {
    setActiveTab(next);
    onTabChange?.(next);
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Workspace sections"
        className="app-tabs flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-white p-1 sm:flex-wrap"
        onKeyDown={(event) => {
          const index = items.findIndex((item) => item.id === activeTab);
          let nextIndex = index;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
          else if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
          else if (event.key === "Home") nextIndex = 0;
          else if (event.key === "End") nextIndex = items.length - 1;
          else return;
          if (!items[nextIndex]) return;
          event.preventDefault();
          selectTab(items[nextIndex].id);
          const button = tabListRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[nextIndex];
          button?.focus();
          button?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        }}
      >
        {items.map((item) => {
          const active = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${id}-tab-${item.id}`}
              aria-controls={`${id}-panel-${item.id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(item.id)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-surface-strong hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel-${activeTab}`} aria-labelledby={`${id}-tab-${activeTab}`} tabIndex={0} className="min-w-0 outline-none">{items.find((item) => item.id === activeTab)?.panel}</div>
    </div>
  );
}
