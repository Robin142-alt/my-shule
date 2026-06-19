"use client";
import { useState } from "react";
import { Users, Link2, Send } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { sendParentInvitation } from "./api-client";

type ParentLinkRecord = {
  id: string;
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  relationship: string;
  link_status: string;
  invitation_sent: boolean;
};

type ParentLinkingData = {
  metrics: { total_students: number; linked: number; unlinked: number; invitations_sent: number };
  parentLinksList: ParentLinkRecord[];
};

export function ParentLinkingWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ParentLinkingData>('/admin-command/admissions/parent-linking');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const links = data?.parentLinksList || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "linked": case "active": return "success";
      case "pending": case "invited": return "info";
      case "unlinked": return "warning";
      default: return "neutral";
    }
  };

  const handleSendInvite = async (id: string) => {
    setSendingId(id);
    try {
      await sendParentInvitation(id);
      toast.success("Parent invitation sent successfully.");
      refetch();
    } catch {
      toast.error("Failed to send parent invitation.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Panel title="Parent Linking" description="Link admitted students to their parents/guardians and send portal invitations." icon={Users}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Students</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Linked</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.linked ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Unlinked</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.unlinked ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Invitations Sent</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.invitations_sent ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Grade</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent/Guardian</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Email</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Relationship</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading parent links...</td></tr>
            ) : links.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No students found for parent linking. Complete admissions first to link parents to their children.</td></tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{link.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{link.grade}</td>
                  <td className="px-4 py-3 text-[#64748B]">{link.parent_name || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{link.parent_phone || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{link.parent_email || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{link.relationship || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={link.link_status} tone={getStatusTone(link.link_status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {link.link_status?.toLowerCase() === "unlinked" && (
                        <button className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1"><Link2 className="w-3 h-3" /> Link</button>
                      )}
                      {link.link_status?.toLowerCase() !== "unlinked" && !link.invitation_sent && (
                        <button disabled={sendingId === link.id} onClick={() => handleSendInvite(link.id)}
                          className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Send className="w-3 h-3" /> Invite</button>
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
