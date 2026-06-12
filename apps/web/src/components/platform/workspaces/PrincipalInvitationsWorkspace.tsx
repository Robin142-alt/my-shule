/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools, resendPlatformSchoolAdminInvite } from "@/lib/platform/school-onboarding-client";

export function PrincipalInvitationsWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
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
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    { id: "principalName", header: "Principal Name", render: (row) => "Pending" },
    { id: "principalEmail", header: "Email", render: (row) => "Pending" },
    { id: "status", header: "Invite Status", render: (row) => "Sent" },
    { id: "sentDate", header: "Sent Date", render: (row) => "Today" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleResend(row.id)} disabled={isSaving}>Resend</Button>
          <Button variant="ghost" size="sm">Revoke</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Principal Invitations" 
        description="Invite, resend, revoke, and track first-principal access for new schools." 
        actions={<Button onClick={() => setIsInviteOpen(true)}>Invite Principal</Button>}
      />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Pending Invites</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Accepted Invites</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Expired Invites</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Revoked Invites</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Schools Missing Principal</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Invites This Week</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
      </div>
      <DataTable title="All Invitations" subtitle="Status of all platform invites." columns={columns} rows={schools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No invitations found."} />
      
      <Modal open={isInviteOpen} title="Invite Principal" onClose={() => setIsInviteOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsInviteOpen(false); }}>
          <label className="block space-y-1"><span className="text-sm font-semibold">Select School</span><select className="input-base w-full"><option>Green Valley High</option></select></label>
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
