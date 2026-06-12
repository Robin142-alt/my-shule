"use client";

import { FileCog, Settings2 } from "lucide-react";
import { Panel, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function TemplatesRulesWorkspace() {
  const { data: templates = [], isLoading } = useSchoolQuery<any[]>("/api/discipline/templates");
  return (
    <Panel title="Templates & Rules" description="Manage document templates and configure school rules." icon={FileCog}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">Document Templates</h3>
        <button className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661]">
          + New Template
        </button>
      </div>

      <div className="mb-8">
        {templates.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Template Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {templates.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-bold">{row.name}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.lastUpdated}</td>
                    <td className="px-4 py-3 text-right">
                       <button className="text-[#1D4ED8] hover:underline text-xs font-bold">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message={isLoading ? "Loading templates..." : "No templates configured."} 
            icon={Settings2} 
          />
        )}
      </div>
    </Panel>
  );
}
