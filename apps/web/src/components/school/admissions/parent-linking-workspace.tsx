"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useEffect, useState } from "react";
import { Users, Link2, Send } from "lucide-react";
import Link from "next/link";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { linkParent, sendParentInvitation } from "./api-client";

type ParentLinkRecord = {
  id: string;
  student_id: string;
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
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const { data, isLoading, isError, isFetching, refetch } = useSchoolQuery<ParentLinkingData>(`/admin-command/admissions/parent-linking?search=${encodeURIComponent(filter)}&limit=30&offset=${page * 30}`);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const [linkDraft, setLinkDraft] = useState<ParentLinkRecord | null>(null);
  const [editing, setEditing] = useState<ParentLinkRecord | null>(null);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const changePhone = useSchoolMutation<unknown, { student_id: string; guardian_phone: string; reason: string; confirmed: true }>(
    ({ student_id }) => `/admissions/students/${student_id}/guardian-phone`, "PATCH", { queueNetworkFailures: false },
  );
  useEffect(() => { const timer = setTimeout(() => { setFilter(search.trim()); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
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
      const result = await sendParentInvitation(id) as { status: string; message?: string };
      if (result.status === "email_failed") toast.error(result.message || "Email delivery failed. Retry the invitation.");
      else toast.success(result.message || `Invitation status: ${result.status}`);
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
        id: link.student_id,
        parent_name: link.parent_name,
        parent_phone: link.parent_phone,
        parent_email: link.parent_email,
        relationship: link.relationship || "guardian",
      });
      toast.success("Parent linked to student successfully.");
      setLinkDraft(null);
      refetch();
    } catch {
      toast.error("Failed to link parent. Confirm the parent email and phone are recorded.");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Panel title="Parents & Guardians" description="Link admitted students to their parents/guardians and send portal invitations." icon={Users}>
      <input aria-label="Search parents and learners" placeholder="Search learner or guardian" value={search} onChange={e => setSearch(e.target.value)} className="mb-4 min-h-11 w-full rounded-xl border border-border px-3" />
      {isError ? <div role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-danger">Parent records could not be loaded. <button onClick={() => void refetch()} className="underline">Retry</button></div> : null}
      {linkDraft ? <form className="mb-4 grid gap-3 rounded-xl border border-border p-3" onSubmit={e => { e.preventDefault(); void handleLinkParent(linkDraft); }}>
        <h3 className="font-bold">Link guardian to {linkDraft.student_name}</h3>
        <label className="grid gap-1">Guardian name<input required value={linkDraft.parent_name} onChange={e => setLinkDraft({ ...linkDraft, parent_name: e.target.value })} className="min-h-11 rounded-lg border p-2" /></label>
        <label className="grid gap-1">Email for portal access<input required type="email" value={linkDraft.parent_email} onChange={e => setLinkDraft({ ...linkDraft, parent_email: e.target.value })} className="min-h-11 rounded-lg border p-2" /></label>
        <label className="grid gap-1">Guardian phone (optional)<input type="tel" value={linkDraft.parent_phone} onChange={e => setLinkDraft({ ...linkDraft, parent_phone: e.target.value })} className="min-h-11 rounded-lg border p-2" /></label>
        <label className="grid gap-1">Relationship<select value={linkDraft.relationship.toLowerCase() || "guardian"} onChange={e => setLinkDraft({ ...linkDraft, relationship: e.target.value })} className="min-h-11 rounded-lg border p-2"><option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option></select></label>
        <div className="flex gap-2"><button disabled={Boolean(linkingId)} className="min-h-11 rounded-lg bg-primary px-4 text-white">{linkingId ? "Saving…" : "Save guardian link"}</button><button type="button" disabled={Boolean(linkingId)} onClick={() => setLinkDraft(null)} className="min-h-11 rounded-lg border px-4">Cancel</button></div>
      </form> : null}
      {editing ? <form className="mb-4 grid gap-3 rounded-xl border border-border p-3" onSubmit={async e => {
        e.preventDefault();
        try {
          await changePhone.mutateAsync({ student_id: editing.student_id, guardian_phone: phone, reason, confirmed: true });
          toast.success("Guardian phone updated."); setEditing(null);
        } catch (error) { toast.error(error instanceof Error ? error.message : "Phone could not be saved. Retry."); }
      }}>
        <h3 className="font-bold">Guardian contact for {editing.student_name}</h3>
        <p className="text-sm text-muted">This updates the contact for all learners linked to this guardian.</p>
        <label className="grid gap-1">Guardian phone<input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="min-h-11 rounded-lg border p-2" /></label>
        <label className="grid gap-1">Reason for update<input required minLength={5} value={reason} onChange={e => setReason(e.target.value)} className="min-h-11 rounded-lg border p-2" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={changePhone.isPending} type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-white">{changePhone.isPending ? "Saving…" : "Confirm and save phone"}</button><button disabled={changePhone.isPending} type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-lg border px-4">Cancel</button></div>
      </form> : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
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
            ) : isError && links.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Retry loading to view parents and guardians.</td></tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <p>No matching learners. Change your search or admit a student to link their guardian.</p>
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
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { setEditing(link); setPhone(link.parent_phone || ""); setReason(link.parent_phone ? "" : "Contact added after admission"); }}>{link.parent_phone ? "Edit phone" : "Add phone"}</button>
                      {link.link_status?.toLowerCase() === "unlinked" && (
                        <button disabled={linkingId === link.id} onClick={() => setLinkDraft({ ...link, relationship: ["mother", "father", "guardian"].includes(link.relationship?.toLowerCase()) ? link.relationship.toLowerCase() : "guardian" })}
                          className="min-h-11 px-3 text-blue-600 hover:underline text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Link2 className="w-4 h-4" /> Link</button>
                      )}
                      {link.link_status?.toLowerCase() !== "unlinked" && Boolean(link.parent_phone || link.parent_email) && (
                        <button disabled={sendingId === link.id} onClick={() => handleSendInvite(link.id)}
                          className="min-h-11 px-3 text-blue-600 hover:underline text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Send className="w-4 h-4" /> Send portal access</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
      <div className="mt-3 flex gap-2"><button className="min-h-11 rounded-lg border px-3" disabled={!page || isFetching} onClick={() => setPage(p => p - 1)}>Previous</button><button className="min-h-11 rounded-lg border px-3" disabled={links.length < 30 || isFetching} onClick={() => setPage(p => p + 1)}>Next</button></div>
    </Panel>
  );
}
