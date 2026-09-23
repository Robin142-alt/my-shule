"use client";

import {
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { useModalLayer } from "@/hooks/use-modal-layer";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Menu, Search, X } from "lucide-react";

export type MobileWorkspaceNavItem = {
  id: string;
  label: string;
  group?: string;
  description?: string;
  icon?: ElementType;
};

export function MobileWorkspaceNavigation({
  items,
  value,
  onValueChange,
  label,
  testId,
}: {
  items: readonly MobileWorkspaceNavItem[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      if (triggerRef.current?.getClientRects().length === 0) requestClose();
    }
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, [open, requestClose]);

  function chooseWorkspace(nextValue: string) {
    onValueChange(nextValue);
    requestClose();
  }

  return (
    <div data-testid={testId} className="min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Open ${label} sidebar`}
        aria-describedby={currentDescriptionId}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={items.length === 0}
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-[#071D49] shadow-sm outline-none transition hover:border-[#8FA8CC] hover:bg-[#F8FAFC] focus-visible:border-[#FF7A1A] focus-visible:ring-4 focus-visible:ring-orange-200/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </span>
        <span id={currentDescriptionId} className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#72819A]">
            Workspace
          </span>
          <span className="block truncate">{currentItem?.label ?? "Choose workspace"}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#174EA6]">
          Menu
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="app-modal-backdrop app-navigation-backdrop fixed inset-0 z-[70]" role="presentation">
              <div
                aria-hidden="true"
                onPointerDown={requestClose}
                className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-[2px]"
              />
              <aside
                ref={sidebarRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="app-navigation-sheet absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] max-w-full flex-col overflow-hidden bg-white text-slate-900 shadow-[18px_0_60px_rgba(2,12,35,0.18)] outline-none"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">MyShule</p>
                    <h2 id={titleId} className="mt-1 truncate text-base font-semibold text-slate-900">{label}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label={`Close ${label.toLowerCase()} sidebar`}
                    onClick={requestClose}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {items.length > 7 ? (
                  <label className="relative mx-4 mt-4 block shrink-0">
                    <span className="sr-only">Search workspaces</span>
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search workspaces"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                ) : null}

                <nav aria-label={`${label} sidebar options`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                  {filteredGroups.length > 0 ? (
                    <div className="space-y-5">
                      {filteredGroups.map((group) => (
                        <section key={group.name}>
                          <h3 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
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
                                  className={`flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-blue-200 ${
                                    selected
                                      ? "bg-blue-50 text-[#071D49] ring-1 ring-inset ring-blue-100"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  {Icon ? (
                                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-[#EAF2FF] text-[#174EA6]" : "bg-slate-100 text-slate-500"}`}>
                                      <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                  <span className="min-w-0 flex-1">
                                    <span className="block break-words text-sm font-semibold leading-5">{item.label}</span>
                                    {item.description ? (
                                      <span className={`mt-0.5 block line-clamp-2 text-xs leading-4 ${selected ? "text-[#64748B]" : "text-slate-500"}`}>
                                        {item.description}
                                      </span>
                                    ) : null}
                                  </span>
                                  {selected ? <Check className="h-5 w-5 shrink-0 text-[#174EA6]" aria-hidden="true" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="font-semibold text-slate-900">No matching workspace</p>
                      <p className="mt-1 text-sm text-slate-500">Try a shorter search term.</p>
                    </div>
                  )}
                </nav>

                <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Current workspace</p>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
                    {CurrentIcon ? <CurrentIcon className="h-4 w-4 text-slate-500" aria-hidden="true" /> : null}
                    <span className="truncate">{currentItem?.label ?? "Choose workspace"}</span>
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
