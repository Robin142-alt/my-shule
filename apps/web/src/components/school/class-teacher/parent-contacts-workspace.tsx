"use client";
import { useState } from "react";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { messageParent } from "./api-client";

type ParentContact = {
  id: string;
  parent_name: string;
  phone: string;
  email: string;
  student_name: string;
  admission_no: string;
  relationship: string;
  last_contacted: string | null;
  contact_count_term: number;
};

type ParentContactsData = {
  metrics: {
    total_parents: number;
    contacted_this_term: number;
    never_contacted: number;
    with_email: number;
  };
  contacts: ParentContact[];
};

export function ParentContactsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ParentContactsData>('/admin-command/class-teacher/parent-contacts');
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const contacts = (data?.contacts || []).filter(
    (c) => !search || c.parent_name.toLowerCase().includes(search.toLowerCase()) || c.student_name.toLowerCase().includes(search.toLowerCase())
  );
  const metrics = data?.metrics;

  const handleMessage = async (parentId: string) => {
    setSendingTo(parentId);
    try {
      await messageParent(parentId, { channel: "sms", template: "general" });
      toast.success("Message sent to parent.");
      refetch();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Panel title="Parent Contacts" description="Directory of parents/guardians for your class with communication history." icon={Phone}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Parents</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_parents ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Contacted (Term)</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.contacted_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Never Contacted</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.never_contacted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">With Email</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.with_email ?? 0}</div>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by parent or student name..."
          className="w-full max-w-md rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Parent/Guardian</th>
              <th className="px-4 py-3 font-bold border-b border-border">Relationship</th>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-border">Email</th>
              <th className="px-4 py-3 font-bold border-b border-border">Last Contacted</th>
              <th className="px-4 py-3 font-bold border-b border-border">Contacts (Term)</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading parent contacts...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">{search ? "No contacts match your search." : "No parent contacts available. Parents are linked when students are admitted."}</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{c.parent_name}</td>
                  <td className="px-4 py-3 text-muted capitalize">{c.relationship}</td>
                  <td className="px-4 py-3 text-muted">{c.student_name} ({c.admission_no})</td>
                  <td className="px-4 py-3 text-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-muted">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.last_contacted || "Never"}</td>
                  <td className="px-4 py-3 text-center font-bold text-foreground">{c.contact_count_term}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={sendingTo === c.id}
                      onClick={() => handleMessage(c.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-info-border bg-info-soft px-3 py-1.5 text-xs font-bold text-info hover:bg-blue-100 disabled:opacity-50"
                    >
                      <MessageCircle className="w-3 h-3" /> {sendingTo === c.id ? "Sending..." : "Message"}
                    </button>
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
