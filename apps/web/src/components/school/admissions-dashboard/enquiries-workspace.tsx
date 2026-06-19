"use client";
import { HelpCircle } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type EnquiriesData = {
  metrics: Record<string, number>;
  items: any[];
};

export function EnquiriesWorkspace() {
  const { data, isLoading } = useSchoolQuery<EnquiriesData>("/admin-command/admissions/enquiries");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Enquiries</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">Manage admission enquiries from parents.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">New</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.new ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Responded</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.responded ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Parent</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Source</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.phone}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class_interested}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.source}</td>
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
