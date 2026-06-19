"use client";
import { PackagePlus } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type StockInData = {
  metrics: Record<string, number>;
  items: any[];
};

export function StockInWorkspace() {
  const { data, isLoading } = useSchoolQuery<StockInData>("/admin-command/storekeeper/stock-in");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <PackagePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Stock In</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">Record incoming stock deliveries.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Received Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.received_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Delivery</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_delivery ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Item</th>
              <th className="px-4 py-3 font-bold">Quantity</th>
              <th className="px-4 py-3 font-bold">Supplier</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Received By</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.item_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.quantity}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.supplier}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.received_by}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
