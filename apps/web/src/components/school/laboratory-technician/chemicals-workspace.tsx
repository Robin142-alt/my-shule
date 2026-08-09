"use client";

import { useMemo, useState } from "react";
import { Beaker, CalendarClock, PackagePlus, Search } from "lucide-react";

import { useSchoolQuery } from "@/lib/data/school-hooks";

import { LabQuickActions, Panel, StatusChip, WorkspaceEmpty, WorkspaceError } from "./shared";
import type { LabInventoryData, LabInventoryItem } from "./types";
import { formatKenyanDate, statusTone } from "./types";

type ChemicalFilter = "all" | "attention" | "low" | "expiring" | "expired";

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-base text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function expiryState(item: LabInventoryItem): "expired" | "expiring" | null {
  if (!item.expiry_date) return null;
  const expiryIso = item.expiry_date.slice(0, 10);
  const expiry = Date.parse(`${expiryIso}T00:00:00Z`);
  if (Number.isNaN(expiry)) return null;
  const todayParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    todayParts.find((entry) => entry.type === type)?.value ?? "";
  const todayIso = `${part("year")}-${part("month")}-${part("day")}`;
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  const days = Math.round((expiry - today) / (24 * 60 * 60 * 1000));
  if (expiryIso < todayIso) return "expired";
  return days <= 90 ? "expiring" : null;
}

function chemicalStatus(item: LabInventoryItem) {
  const expiry = expiryState(item);
  if (expiry === "expired" || item.status === "Expired") return "Expired";
  if (expiry === "expiring") return "Expiring Soon";
  return item.status;
}

function navigateToInventory(action: "add-item" | "add-stock") {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const roleIndex = segments.findIndex((segment) => segment === "laboratory-technician");
  const base = roleIndex >= 0 ? `/${segments.slice(0, roleIndex + 1).join("/")}` : "/school/laboratory-technician";
  const extra = action === "add-item" ? "&type=chemical" : "";
  window.location.assign(`${base}/lab-inventory?action=${action}${extra}`);
}

export function ChemicalsWorkspace() {
  const inventoryQuery = useSchoolQuery<LabInventoryData>("/labs/inventory");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChemicalFilter>("all");

  const chemicals = useMemo(
    () => (inventoryQuery.data?.items ?? []).filter((item) => item.item_source === "chemical"),
    [inventoryQuery.data?.items],
  );

  const counts = useMemo(() => ({
    low: chemicals.filter((item) => ["Low Stock", "Out of Stock"].includes(item.status)).length,
    expiring: chemicals.filter((item) => expiryState(item) === "expiring").length,
    expired: chemicals.filter((item) => expiryState(item) === "expired" || item.status === "Expired").length,
  }), [chemicals]);

  const visibleChemicals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return chemicals.filter((item) => {
      const expiry = expiryState(item);
      const matchesSearch = !normalizedSearch || [item.item_name, item.category, item.storage_location, item.safety_classification]
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
      if (!matchesSearch) return false;
      if (filter === "low") return ["Low Stock", "Out of Stock"].includes(item.status);
      if (filter === "expiring") return expiry === "expiring";
      if (filter === "expired") return expiry === "expired" || item.status === "Expired";
      if (filter === "attention") return ["Low Stock", "Out of Stock"].includes(item.status) || Boolean(expiry);
      return true;
    });
  }, [chemicals, filter, search]);

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      <Panel
        title="Chemicals Register"
        description="See chemical quantities, safety details and expiry dates without procurement fields."
        icon={Beaker}
        actions={
          <button type="button" onClick={() => navigateToInventory("add-item")} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#0F3F8A] px-4 text-sm font-black text-white">
            <PackagePlus className="h-4 w-4" aria-hidden="true" /> Add Chemical
          </button>
        }
      >
        {inventoryQuery.error ? (
          <WorkspaceError message={inventoryQuery.error.message} onRetry={() => void inventoryQuery.refetch()} />
        ) : inventoryQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-[#64748B]">Loading the chemicals register…</p>
        ) : chemicals.length === 0 ? (
          <WorkspaceEmpty
            title="No chemicals have been added yet"
            description="Add the first chemical or reagent with its quantity, unit, storage location and any known expiry or safety information."
            actions={<button type="button" onClick={() => navigateToInventory("add-item")} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 font-black text-white">Add First Chemical</button>}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => setFilter("all")} className={`rounded-xl border p-4 text-left ${filter === "all" ? "border-blue-400 bg-blue-50" : "border-[#D8E0EC] bg-white"}`}><span className="text-sm font-bold text-[#64748B]">All Chemicals</span><strong className="mt-1 block text-2xl text-[#071D49]">{chemicals.length}</strong></button>
              <button type="button" onClick={() => setFilter("low")} className={`rounded-xl border p-4 text-left ${filter === "low" ? "border-amber-400 bg-amber-50" : "border-[#D8E0EC] bg-white"}`}><span className="text-sm font-bold text-[#64748B]">Low or Out of Stock</span><strong className="mt-1 block text-2xl text-amber-800">{counts.low}</strong></button>
              <button type="button" onClick={() => setFilter("expiring")} className={`rounded-xl border p-4 text-left ${filter === "expiring" ? "border-amber-400 bg-amber-50" : "border-[#D8E0EC] bg-white"}`}><span className="text-sm font-bold text-[#64748B]">Expiring in 90 Days</span><strong className="mt-1 block text-2xl text-amber-800">{counts.expiring}</strong></button>
              <button type="button" onClick={() => setFilter("expired")} className={`rounded-xl border p-4 text-left ${filter === "expired" ? "border-rose-400 bg-rose-50" : "border-[#D8E0EC] bg-white"}`}><span className="text-sm font-bold text-[#64748B]">Expired</span><strong className="mt-1 block text-2xl text-rose-800">{counts.expired}</strong></button>
            </div>

            {counts.low + counts.expiring + counts.expired === 0 ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">All tracked chemicals are above their minimum quantities and none are approaching expiry.</p>
            ) : (
              <button type="button" onClick={() => setFilter("attention")} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 text-left text-sm font-bold text-amber-950">
                <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" /> View all chemicals needing attention
              </button>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <label className="relative block">
                <span className="sr-only">Find a chemical</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[#64748B]" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a chemical by ordinary name" className={`${fieldClass} pl-10`} />
              </label>
              <select aria-label="Filter chemical register" value={filter} onChange={(event) => setFilter(event.target.value as ChemicalFilter)} className={fieldClass}>
                <option value="all">All Chemicals</option>
                <option value="attention">Attention Required</option>
                <option value="low">Low or Out of Stock</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {visibleChemicals.length === 0 ? (
              <WorkspaceEmpty title="No chemicals match this view" description="Clear the search or choose a different attention filter." actions={<button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="min-h-11 rounded-xl border border-blue-300 bg-blue-50 px-4 font-black text-blue-900">Show All Chemicals</button>} />
            ) : (
              <>
                <div className="grid gap-3 md:hidden">
                  {visibleChemicals.map((item) => <ChemicalCard key={item.id} item={item} />)}
                </div>
                <div className="hidden overflow-hidden rounded-xl border border-[#D8E0EC] md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3">Chemical</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Storage Location</th><th className="px-4 py-3">Expiry Date</th><th className="px-4 py-3">Safety</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody>{visibleChemicals.map((item) => {
                      const status = chemicalStatus(item);
                      return <tr key={item.id} className="border-t border-[#D8E0EC]"><td className="px-4 py-3"><strong className="text-[#071D49]">{item.item_name}</strong><span className="mt-1 block text-xs text-[#64748B]">{item.concentration || item.category}</span></td><td className="px-4 py-3 font-bold text-[#071D49]">{item.quantity_available} {item.unit}</td><td className="px-4 py-3 text-[#334155]">{item.storage_location || "Not set"}</td><td className="px-4 py-3 text-[#334155]">{item.expiry_date ? formatKenyanDate(item.expiry_date) : "Not applicable"}</td><td className="px-4 py-3 text-[#334155]">{item.safety_classification || "Not classified"}</td><td className="px-4 py-3"><StatusChip label={status} tone={status === "Expiring Soon" ? "warning" : statusTone(status)} /></td></tr>;
                    })}</tbody>
                  </table>
                </div>
              </>
            )}

            <button type="button" onClick={() => navigateToInventory("add-stock")} className="min-h-11 w-full rounded-xl border border-blue-300 bg-blue-50 px-4 font-black text-blue-900 sm:w-auto">Add Stock to an Existing Chemical</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ChemicalCard({ item }: { item: LabInventoryItem }) {
  const status = chemicalStatus(item);
  return (
    <article className="rounded-xl border border-[#D8E0EC] bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#071D49]">{item.item_name}</h3><p className="mt-1 text-sm text-[#64748B]">{item.concentration || item.category}</p></div><StatusChip label={status} tone={status === "Expiring Soon" ? "warning" : statusTone(status)} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[#64748B]">Available</dt><dd className="font-black text-[#071D49]">{item.quantity_available} {item.unit}</dd></div><div><dt className="text-[#64748B]">Expiry Date</dt><dd className="font-bold text-[#071D49]">{item.expiry_date ? formatKenyanDate(item.expiry_date) : "Not applicable"}</dd></div><div><dt className="text-[#64748B]">Storage Location</dt><dd className="font-bold text-[#071D49]">{item.storage_location || "Not set"}</dd></div><div><dt className="text-[#64748B]">Safety</dt><dd className="font-bold text-[#071D49]">{item.safety_classification || "Not classified"}</dd></div></dl>
    </article>
  );
}
