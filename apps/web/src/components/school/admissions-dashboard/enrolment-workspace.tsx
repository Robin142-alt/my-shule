"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Fingerprint, CheckCircle2 } from "lucide-react";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

type PendingEnrolment = {
  id: string;
  name: string;
  grade: string;
  documents: string;
  status: string;
  admissionNumber?: string;
};

export function AdmissionsEnrolmentWorkspace({ dataset }: { dataset?: any }) {
  const { data: candidatesData = [], isLoading, refetch } = useSchoolQuery<PendingEnrolment[]>("/api/admissions/applications?status=pending_enrolment");
  const candidates = candidatesData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<PendingEnrolment | null>(null);

  const enrolMutation = useSchoolMutation((id: string) => `/api/admissions/applications/${id}/enrol`, "POST");

  const handleEnrol = async () => {
    if (!selectedCandidate) return;
    
    await enrolMutation.mutateAsync(selectedCandidate.id);
    refetch();
    
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Enrolment & Admission Numbers</h2>
          <p className="text-white/60 text-sm">Finalize admissions and generate student identifiers</p>
        </div>
      </div>

      <Card className="border border-white/10 bg-white/5 p-6">
        <Table
          columns={["Name", "Assigned Grade", "Docs Status", "Admission #", "State", "Action"]}
          data={candidates}
          renderRow={(c) => (
            <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-3 text-sm text-white font-medium">{c.name}</td>
              <td className="p-3 text-sm text-white/70">{c.grade}</td>
              <td className="p-3 text-sm text-white/70">{c.documents}</td>
              <td className="p-3 text-sm text-white font-mono">{c.admissionNumber || "—"}</td>
              <td className="p-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  c.status === "Enrolled" 
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                }`}>
                  {c.status}
                </span>
              </td>
              <td className="p-3 text-sm">
                {c.status !== "Enrolled" && (
                  <Button 
                    size="sm" 
                    onClick={() => { setSelectedCandidate(c); setIsModalOpen(true); }}
                    className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Fingerprint className="h-3 w-3" />
                    Enrol
                  </Button>
                )}
                {c.status === "Enrolled" && (
                  <span className="flex items-center gap-1 text-green-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </span>
                )}
              </td>
            </tr>
          )}
          emptyState={
            <div className="py-12 text-center text-white/50">
              No candidates are pending enrolment. Ensure fee clearance is completed first.
            </div>
          }
        />
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Admission Number">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are about to officially enrol <strong>{selectedCandidate?.name}</strong> into <strong>{selectedCandidate?.grade}</strong>.
          </p>
          <div className="p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-100">
            <h4 className="font-semibold mb-1">System Action</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>An admission number will be generated.</li>
              <li>A new student profile will be created in the main database.</li>
              <li>Parents will be notified via SMS.</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEnrol}>Confirm Enrolment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
