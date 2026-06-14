import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools, resendPlatformSchoolAdminInvite, type PlatformSchool } from "@/lib/platform/school-onboarding-client";

export function PrincipalInvitationsWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) setSchools(liveRows);
      } catch (error) {
        redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  async function handleResend(tenantId: string) {
    setIsSaving(true);
    try {
      await resendPlatformSchoolAdminInvite(tenantId);
      // Reload schools after resend
      const updated = await fetchPlatformSchools();
      setSchools(updated);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<PlatformSchool>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.school_name },
    { id: "principalEmail", header: "Admin Email", render: (row) => row.admin_email },
    { id: "status", header: "Invite Status", render: (row) => row.invitation_status || (row.invitation_sent ? "Sent" : "Pending") },
    { id: "sentDate", header: "Created Date", render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : "N/A" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleResend(row.tenant_id)} disabled={isSaving || !row.can_resend_invite}>Resend</Button>
          <Button variant="ghost" size="sm" disabled={isSaving}>Revoke</Button>
        </div>
      ),
    },
  ];

  const pending = schools.filter(s => s.invitation_status === "sent" || s.invitation_status === "queued" || !s.invitation_status).length;
  const accepted = schools.filter(s => s.invitation_status === "accepted").length;
  const failed = schools.filter(s => s.invitation_status === "failed" || s.invitation_status === "blocked").length;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Principal Invitations" 
        description="Invite, resend, revoke, and track first-principal access for new schools." 
        actions={<Button onClick={() => setIsInviteOpen(true)}>Invite Principal</Button>}
      />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Pending Invites</div><div className="mt-2 text-2xl font-bold">{pending}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Accepted Invites</div><div className="mt-2 text-2xl font-bold">{accepted}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Failed Invites</div><div className="mt-2 text-2xl font-bold">{failed}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Total Invites</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
      </div>
      <DataTable title="All Invitations" subtitle="Status of all platform invites." columns={columns} rows={schools} getRowKey={(row) => row.tenant_id} emptyMessage={isLoading ? "Loading..." : "No invitations found."} />
      
      <Modal open={isInviteOpen} title="Invite Principal" onClose={() => setIsInviteOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsInviteOpen(false); }}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Select School</span>
            <select className="input-base w-full">
              {schools.map(s => <option key={s.tenant_id} value={s.tenant_id}>{s.school_name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1"><span className="text-sm font-semibold">First Name</span><input className="input-base w-full" required /></label>
            <label className="block space-y-1"><span className="text-sm font-semibold">Last Name</span><input className="input-base w-full" required /></label>
          </div>
          <label className="block space-y-1"><span className="text-sm font-semibold">Email</span><input type="email" className="input-base w-full" required /></label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsInviteOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
