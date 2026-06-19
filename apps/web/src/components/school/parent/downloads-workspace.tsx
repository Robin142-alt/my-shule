"use client";
import { Download } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type DownloadsData = {
  metrics: Record<string, number>;
  items: any[];
};

export function DownloadsWorkspace() {
  const { data, isLoading } = useSchoolQuery<DownloadsData>("/admin-command/parent/downloads");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Downloads</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">Download report cards, receipts, and documents.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Available Documents</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.available ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Document</th>
              <th className="px-4 py-3 font-bold">Child</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Type</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.document_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.child_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
