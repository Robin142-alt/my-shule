"use client";

import { Download, FileText } from "lucide-react";
import { Panel, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ReportsDownloadsWorkspace() {
  const { data: reports = [], isLoading } = useSchoolQuery<any[]>("/api/discipline/reports-downloads");
  return (
    <Panel title="Reports & Downloads" description="Generate and download analytical discipline reports." icon={Download}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">Available Reports</h3>
        <button className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661]">
          Generate New Report
        </button>
      </div>

      <div className="mb-8">
        {reports.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Report Name</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Generated On</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {reports.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-bold">{row.name}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 text-right">
                       <button className="flex items-center justify-end gap-1 text-[#1D4ED8] hover:underline text-xs font-bold w-full"><Download className="h-3 w-3" /> Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message={isLoading ? "Loading reports..." : "No reports generated yet."} 
            icon={FileText} 
          />
        )}
      </div>
    </Panel>
  );
}
