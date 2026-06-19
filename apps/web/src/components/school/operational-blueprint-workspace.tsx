"use client";
import { Map } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type OperationalBlueprintData = {
  metrics: Record<string, number>;
  items: any[];
};

export function OperationalBlueprintWorkspace({ blueprint }: { blueprint?: any }) {
  const { data, isLoading } = useSchoolQuery<OperationalBlueprintData>("/admin-command/school/operational-blueprint");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <Map className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Operational Blueprint</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">View and manage the school operational blueprint.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Modules</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_modules ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Setup</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_setup ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Module</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Owner</th>
              <th className="px-4 py-3 font-bold">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.module_name}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                  <td className="px-4 py-3 text-[#64748B]">{row.owner}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.updated_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
