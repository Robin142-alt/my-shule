"use client";
import { useState } from "react";
import { FileText, Download, Printer, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { downloadDocument, printDocument } from "./api-client";

type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  category: string;
  recipient: string;
  prepared_by: string;
  date_created: string;
  status: string;
  file_format: string;
};

type DocumentsData = {
  metrics: {
    total_documents: number;
    letters: number;
    certificates: number;
    drafts: number;
  };
  documents: DocumentRecord[];
};

export function LettersDocumentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DocumentsData>('/admin-command/secretary/letters-documents');
  const [actionId, setActionId] = useState<string | null>(null);

  const documents = data?.documents || [];
  const metrics = data?.metrics;

  const getTypeTone = (type: string): Tone => {
    switch (type) {
      case "Letter": return "info";
      case "Certificate": return "success";
      case "Memo": return "warning";
      case "Notice": return "neutral";
      case "Report": return "neutral";
      default: return "neutral";
    }
  };

  const getStatusTone = (status: string): Tone => {
    switch (status) {
      case "Final": return "success";
      case "Draft": return "warning";
      case "Sent": return "info";
      case "Archived": return "neutral";
      default: return "neutral";
    }
  };

  const handleDownload = async (id: string) => {
    setActionId(id);
    try {
      await downloadDocument(id);
      toast.success("Document download started.");
    } catch {
      toast.error("Failed to download document.");
    } finally {
      setActionId(null);
    }
  };

  const handlePrint = async (id: string) => {
    setActionId(id);
    try {
      await printDocument(id);
      toast.success("Document sent to printer.");
    } catch {
      toast.error("Failed to print document.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Letters & Documents" description="Create, manage, and print official school letters, certificates, and memos." icon={FileText}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Documents</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_documents || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Letters</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.letters || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Certificates</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.certificates || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Drafts</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.drafts || 0}</div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Category</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipient</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Prepared By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Format</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No documents created yet. Create official letters, certificates, or memos using the templates available.</td></tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#071D49]">{doc.title}</td>
                  <td className="px-4 py-3"><StatusChip label={doc.type} tone={getTypeTone(doc.type)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.recipient}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.prepared_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.date_created}</td>
                  <td className="px-4 py-3 text-[#64748B] uppercase text-xs font-mono">{doc.file_format}</td>
                  <td className="px-4 py-3"><StatusChip label={doc.status} tone={getStatusTone(doc.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button disabled={actionId === doc.id} onClick={() => handleDownload(doc.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0EC] bg-white px-3 py-1.5 text-xs font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button disabled={actionId === doc.id} onClick={() => handlePrint(doc.id)} className="inline-flex items-center gap-1 rounded-lg bg-[#071D49] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
