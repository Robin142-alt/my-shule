"use client";

import { Download, File, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DownloadsWorkspace() {
  const documents = [
    { id: 1, name: "Mathematics Form 1 Syllabus", type: "PDF", size: "1.2 MB", date: "Jan 10, 2026" },
    { id: 2, name: "Physics Past Papers (2025)", type: "ZIP", size: "4.5 MB", date: "April 20, 2026" },
    { id: 3, name: "School Rules & Regulations", type: "PDF", size: "0.8 MB", date: "Jan 5, 2026" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Downloads</h2>
          <p className="text-sm text-slate-500 mt-1">Access study materials, syllabuses, and past papers.</p>
        </div>
      </div>

      <Card className="border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <FolderOpen className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-900">Study Materials</h3>
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
