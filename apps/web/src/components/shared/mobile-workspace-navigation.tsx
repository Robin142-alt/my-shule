"use client";

import {
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useModalLayer } from "@/hooks/use-modal-layer";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Menu, Search, X } from "lucide-react";
import { MobileMenuTrigger } from "@/components/shared/mobile-menu-trigger";

export type MobileWorkspaceNavItem = {
  id: string;
  label: string;
  group?: string;
  description?: string;
  icon?: ElementType;
  badge?: ReactNode;
};

export function MobileWorkspaceNavigation({
  items,
  value,
  onValueChange,
  label,
  testId,
  footer,
  mobilePlacement = "edge",
}: {
  items: readonly MobileWorkspaceNavItem[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  testId?: string;
  footer?: ReactNode;
  mobilePlacement?: "edge" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hostRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const currentDescriptionId = useId();
  const currentItem = items.find((item) => item.id === value) ?? items[0];
  const effectiveValue = currentItem?.id;
  const CurrentIcon = currentItem?.icon;
  const requestClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredItems = normalizedQuery
      ? items.filter((item) =>
          [item.label, item.group, item.description]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(normalizedQuery)),
        )
      : items;

    return filteredItems.reduce<Array<{ name: string; items: MobileWorkspaceNavItem[] }>>(
      (groups, item) => {
        const name = item.group ?? "Workspaces";
        const existingGroup = groups.find((group) => group.name === name);
        if (existingGroup) {
          existingGroup.items.push(item);
        } else {
          groups.push({ name, items: [item] });
        }
        return groups;
      },
      [],
    );
  }, [items, query]);

  const sidebarRef = useModalLayer<HTMLElement>(open, requestClose);
  useEffect(() => {
    if (!open) return;
    function handleViewportChange() {
      if (hostRef.current?.getClientRects().length === 0) requestClose();
    }
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, [open, requestClose]);

  function chooseWorkspace(nextValue: string) {
    onValueChange(nextValue);
    requestClose();
  }

  return (
    <div ref={hostRef} data-testid={testId} data-mobile-placement={mobilePlacement} className="app-mobile-nav-host min-w-0">
      <MobileMenuTrigger
        mobilePlacement={mobilePlacement}
        type="button"
        aria-label={`Open ${label} sidebar`}
        aria-describedby={currentDescriptionId}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={items.length === 0}
        onClick={() => setOpen(true)}
        className="app-mobile-nav-trigger flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-foreground shadow-sm outline-none transition hover:border-[#8FA8CC] hover:bg-surface-muted focus-visible:border-[#FF7A1A] focus-visible:ring-4 focus-visible:ring-orange-200/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="app-mobile-nav-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </span>
        <span id={currentDescriptionId} className="min-w-0 flex-1">
          <span className="block truncate">{currentItem?.label ?? "Choose workspace"}</span>
        </span>
        <span className="app-mobile-nav-hint inline-flex shrink-0 items-center gap-1 text-xs font-black text-info">
          Menu
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </MobileMenuTrigger>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="app-modal-backdrop app-navigation-backdrop fixed inset-0 z-[70]" role="presentation">
              <div
                aria-hidden="true"
                onPointerDown={(event) => { event.preventDefault(); requestClose(); }}
                className="absolute inset-0 cursor-default bg-slate-950/30"
              />
              <aside
                ref={sidebarRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="app-navigation-sheet absolute inset-y-0 left-0 flex max-w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground outline-none"
              >
                <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-inverse-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">MyShule</p>
                    <h2 id={titleId} className="mt-1 text-sm font-semibold leading-5 text-sidebar-foreground">{label}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label={`Close ${label.toLowerCase()} sidebar`}
                    onClick={requestClose}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inverse-accent"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {items.length > 7 ? (
                  <label className="relative mx-3 mt-3 block shrink-0">
                    <span className="sr-only">Search workspaces</span>
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-muted"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search workspaces"
                      className="min-h-11 w-full rounded-xl border border-inverse-border bg-white/5 pl-10 pr-3 text-base text-sidebar-foreground outline-none placeholder:text-sidebar-muted focus:border-inverse-accent focus:ring-4 focus:ring-inverse-border"
                    />
                  </label>
                ) : null}

                <nav aria-label={`${label} sidebar options`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                  {filteredGroups.length > 0 ? (
                    <div className="space-y-3">
                      {filteredGroups.map((group) => (
                        <section key={group.name}>
                          <h3 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-muted">
                            {group.name}
                          </h3>
                          <div className="grid gap-1">
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const selected = item.id === effectiveValue;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  aria-current={selected ? "page" : undefined}
                                  onClick={() => chooseWorkspace(item.id)}
                                  className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-inverse-accent ${
                                    selected
                                      ? "bg-sidebar-active text-sidebar-foreground ring-1 ring-inset ring-inverse-border"
                                      : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                                  }`}
                                >
                                  {Icon ? (
                                    <span className={`grid h-6 w-6 shrink-0 place-items-center ${selected ? "text-inverse-accent" : "text-sidebar-muted"}`}>
                                      <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                  <span className="min-w-0 flex-1">
                                    <span className="block break-words text-sm font-semibold leading-5">{item.label}</span>
                                    {item.badge ? <span className="mt-1 block text-xs">{item.badge}</span> : null}
                                    {item.description ? (
                                      <span className={`mt-0.5 block text-xs leading-4 ${selected ? "text-sidebar-muted" : "text-sidebar-muted"}`}>
                                        {item.description}
                                      </span>
                                    ) : null}
                                  </span>
                                  {selected ? <Check className="h-4 w-4 shrink-0 text-inverse-accent" aria-hidden="true" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-inverse-border bg-white/5 px-4 py-8 text-center">
                      <p className="font-semibold text-sidebar-foreground">No matching workspace</p>
                      <p className="mt-1 text-sm text-sidebar-muted">Try a shorter search term.</p>
                    </div>
                  )}
                  {footer ? <div className="mt-3 border-t border-inverse-border px-2 pt-3 text-sm">{footer}</div> : null}
                </nav>

                <div className="shrink-0 border-t border-inverse-border bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground">
                    {CurrentIcon ? <CurrentIcon className="h-4 w-4 text-sidebar-muted" aria-hidden="true" /> : null}
                    <span className="min-w-0 break-words"><span className="font-normal text-sidebar-muted">Current: </span>{currentItem?.label ?? "Choose workspace"}</span>
                  </div>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
