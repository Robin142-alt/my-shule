"use client";
import { useState } from "react";
import { FileText, CheckCircle, AlertCircle, Send } from "lucide-react";
import Link from "next/link";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { requestDocument, verifyDocument } from "./api-client";

type DocumentRecord = {
  id: string;
  student_name: string;
  document_type: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  verified_by: string;
};

type DocumentsData = {
  metrics: { total_documents: number; verified: number; pending_verification: number; missing: number };
  documentsList: DocumentRecord[];
};

export function DocumentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DocumentsData>('/admin-command/admissions/documents');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const documents = data?.documentsList || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "verified": return "success";
      case "pending": return "warning";
      case "rejected": return "danger";
      case "missing": return "danger";
      default: return "neutral";
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyDocument(id);
      toast.success("Document verified successfully.");
      refetch();
    } catch {
      toast.error("Failed to verify document.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRequestDocument = async (doc: DocumentRecord) => {
    setRequestingId(doc.id);
    try {
      await requestDocument({
        document_id: doc.id,
        student_name: doc.student_name,
        document_type: doc.document_type,
      });
      toast.success(`Document request sent for ${doc.student_name}.`);
      refetch();
    } catch {
      toast.error("Failed to send document request.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <Panel title="Documents" description="Track and verify admission documents for all applicants." icon={FileText}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Documents</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_documents ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Verified</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.verified ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Verification</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending_verification ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Missing</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.missing ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Document Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">File</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Uploaded</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Verified By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <p>No documents uploaded yet. Start student admission first, then request or verify birth certificates, photos, and previous report forms here.</p>
                    <Link href="/school/admissions/applications?action=start-admission" className="rounded-lg bg-[#071D49] px-4 py-2 text-xs font-black text-white">
                      Start student admission
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{doc.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.document_type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.file_name}</td>
                  <td className="px-4 py-3"><StatusChip label={doc.status} tone={getStatusTone(doc.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.uploaded_at}</td>
                  <td className="px-4 py-3 text-[#64748B]">{doc.verified_by || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.status?.toLowerCase() === "pending" && (
                        <button disabled={verifyingId === doc.id} onClick={() => handleVerify(doc.id)}
                          className="text-emerald-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><CheckCircle className="w-3 h-3" /> Verify</button>
                      )}
                      {doc.status?.toLowerCase() === "missing" && (
                        <button type="button" disabled={requestingId === doc.id} onClick={() => handleRequestDocument(doc)} className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Send className="w-3 h-3" /> Request</button>
                      )}
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
