"use client";
import { useState } from "react";
import { ClipboardList, Search, Eye, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { updateApplicationStatus } from "./api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

type ApplicationRecord = {
  id: string;
  student_name: string;
  guardian_name: string;
  phone: string;
  grade_applied: string;
  previous_school: string;
  status: string;
  submitted_at: string;
};

type ApplicationsData = {
  metrics: { total: number; pending: number; approved: number; rejected: number };
  applicationsList: ApplicationRecord[];
};

export function ApplicationsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ApplicationsData>('/admin-command/admissions/applications');
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const applications = (data?.applicationsList || []).filter((a) =>
    !search || a.student_name.toLowerCase().includes(search.toLowerCase()) || a.guardian_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "approved": case "accepted": return "success";
      case "pending": case "under review": return "warning";
      case "rejected": return "danger";
      case "interview scheduled": return "info";
      default: return "neutral";
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setActioningId(id);
    try {
      await updateApplicationStatus(id, status);
      toast.success(`Application ${status.toLowerCase()} successfully.`);
      refetch();
    } catch {
      toast.error(`Failed to update application status.`);
    } finally {
      setActioningId(null);
    }
  };

  const handleViewApplication = (app: ApplicationRecord) => {
    openPrintDocument({
      eyebrow: "Admissions",
      title: "Application Review",
      subtitle: `${app.student_name} | ${app.grade_applied}`,
      rows: [
        { label: "Student", value: app.student_name },
        { label: "Guardian", value: app.guardian_name },
        { label: "Phone", value: app.phone },
        { label: "Grade applied", value: app.grade_applied },
        { label: "Previous school", value: app.previous_school || "-" },
        { label: "Status", value: app.status },
        { label: "Submitted", value: app.submitted_at || "-" },
      ],
      footer: "Admission decisions must be tenant-scoped and auditable.",
    });
  };

  return (
    <Panel title="Applications" description="Review and manage student admission applications." icon={ClipboardList} actions={
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input type="text" placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border bg-surface-muted py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Approved</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Rejected</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.rejected ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Guardian</th>
              <th className="px-4 py-3 font-bold border-b border-border">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-border">Grade</th>
              <th className="px-4 py-3 font-bold border-b border-border">Previous School</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading applications...</td></tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <div>
                      <p className="font-black text-foreground">No applications have been started yet.</p>
                      <p className="mt-1 text-sm leading-6">
                        Start student admission to capture the first learner, select a school-created class, and move the application through review, interview, approval, and enrolment.
                      </p>
                    </div>
                    <Link
                      href="/school/admissions/applications?action=start-admission"
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#12326C]"
                    >
                      Start student admission
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{app.student_name}</td>
                  <td className="px-4 py-3 text-muted">{app.guardian_name}</td>
                  <td className="px-4 py-3 text-muted">{app.phone}</td>
                  <td className="px-4 py-3 text-muted">{app.grade_applied}</td>
                  <td className="px-4 py-3 text-muted">{app.previous_school}</td>
                  <td className="px-4 py-3"><StatusChip label={app.status} tone={getStatusTone(app.status)} /></td>
                  <td className="px-4 py-3 text-muted">{app.submitted_at}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => handleViewApplication(app)} className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                      {app.status?.toLowerCase() === "pending" && (
                        <>
                          <button disabled={actioningId === app.id} onClick={() => handleStatusChange(app.id, "Approved")}
                            className="text-emerald-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><CheckCircle className="w-3 h-3" /> Approve</button>
                          <button disabled={actioningId === app.id} onClick={() => handleStatusChange(app.id, "Rejected")}
                            className="text-rose-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Reject</button>
                        </>
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
