"use client";
import { RecordTable } from "@/components/ui/record-table";
import { Download } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type DownloadsData = {
  metrics: Record<string, number>;
  items: Array<{
    id: string;
    document_name: string;
    child_name: string;
    term?: string | null;
    date?: string | null;
    type: string;
    download_url: string;
  }>;
};

export function DownloadsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<DownloadsData>("/admin-command/parent/downloads");
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

      {error ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          Documents could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Available Documents</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.available ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Document</th>
              <th className="px-4 py-3 font-bold">Child</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No published report cards are available for your linked learners yet.</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.document_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.child_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.term || "Not recorded"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{formatDate(row.date)}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => window.open(row.download_url, "_blank", "noopener,noreferrer")}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#BDD2F5] bg-[#EEF5FF] px-3 text-xs font-black text-[#174EA6] hover:bg-[#DFEAFF]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-KE");
}
