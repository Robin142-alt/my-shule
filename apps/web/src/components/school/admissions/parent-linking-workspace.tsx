"use client";
import { useState } from "react";
import { Users, Link2, Send } from "lucide-react";
import Link from "next/link";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { linkParent, sendParentInvitation } from "./api-client";

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
  const [linkingId, setLinkingId] = useState<string | null>(null);

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

  const handleLinkParent = async (link: ParentLinkRecord) => {
    setLinkingId(link.id);
    try {
      await linkParent({
        id: link.id,
        parent_name: link.parent_name,
        parent_phone: link.parent_phone,
        parent_email: link.parent_email,
        relationship: link.relationship || "guardian",
      });
      toast.success("Parent linked to student successfully.");
      refetch();
    } catch {
      toast.error("Failed to link parent. Confirm the parent email and phone are recorded.");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Panel title="Parent Linking" description="Link admitted students to their parents/guardians and send portal invitations." icon={Users}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Students</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Linked</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.linked ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Unlinked</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.unlinked ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Invitations Sent</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : data?.metrics?.invitations_sent ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Grade</th>
              <th className="px-4 py-3 font-bold border-b border-border">Parent/Guardian</th>
              <th className="px-4 py-3 font-bold border-b border-border">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-border">Email</th>
              <th className="px-4 py-3 font-bold border-b border-border">Relationship</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading parent links...</td></tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <p>No students found for parent linking. Start student admission, complete enrolment, then link guardians to their children here.</p>
                    <Link href="/school/admissions/applications?action=start-admission" className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-white">
                      Start student admission
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{link.student_name}</td>
                  <td className="px-4 py-3 text-muted">{link.grade}</td>
                  <td className="px-4 py-3 text-muted">{link.parent_name || "—"}</td>
                  <td className="px-4 py-3 text-muted">{link.parent_phone || "—"}</td>
                  <td className="px-4 py-3 text-muted">{link.parent_email || "—"}</td>
                  <td className="px-4 py-3 text-muted">{link.relationship || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={link.link_status} tone={getStatusTone(link.link_status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {link.link_status?.toLowerCase() === "unlinked" && (
                        <button disabled={linkingId === link.id} onClick={() => handleLinkParent(link)}
                          className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Link2 className="w-3 h-3" /> Link</button>
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
