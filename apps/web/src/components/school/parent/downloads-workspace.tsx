"use client";

import { Download, File, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DownloadsWorkspace() {
  const documents = [
    { id: 1, name: "Term 2 Newsletter 2026", type: "PDF", size: "2.4 MB", date: "May 5, 2026" },
    { id: 2, name: "Revised School Calendar", type: "PDF", size: "1.1 MB", date: "April 20, 2026" },
    { id: 3, name: "Fee Structure (2026-2027)", type: "PDF", size: "0.8 MB", date: "March 15, 2026" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Downloads & Documents</h2>
          <p className="text-sm text-slate-500 mt-1">Access official school letters, term dates, and policy documents.</p>
        </div>
      </div>

      <Card className="border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <FolderOpen className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-900">General Documents</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {documents.map(doc => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded">
                  <File className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{doc.name}</h4>
                  <p className="text-xs text-slate-500">{doc.type} • {doc.size} • Uploaded {doc.date}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
