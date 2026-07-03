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

export function SetupProgressWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        const mapped = liveRows.map((s) => ({
          ...s,
          id: s.tenant_id,
          schoolName: s.school_name
        }));
        if (!cancelled) setSchools(mapped);
      } catch (error) {
        redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  function checklistForSchool(row: any) {
    return [
      { label: "Principal invite accepted", status: row.invitation_status === "accepted" ? "Complete" : "Pending" },
      { label: "School profile created", status: "Complete" },
      { label: "Academic year configured", status: "Pending" },
      { label: "Staff invited", status: "Pending" },
      { label: "Students imported or admitted", status: "Pending" },
      { label: "Fee structure configured", status: "Pending" },
    ];
  }

  async function sendReminder(row: any) {
    setBusyTenantId(row.id);
    setStatusMessage(null);
    try {
      const updated = await resendPlatformSchoolAdminInvite(row.id);
      setSchools((current) => current.map((school) => school.id === row.id ? { ...school, ...updated, id: updated.tenant_id, schoolName: updated.school_name } : school));
      setStatusMessage(`Setup reminder sent to ${row.schoolName}'s principal invite email.`);
    } catch (error) {
      if (!redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to send setup reminder.");
      }
    } finally {
      setBusyTenantId(null);
    }
  }

  const columns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    { id: "principal", header: "Principal", render: (row) => row.invitation_status === "accepted" ? "Complete" : "Pending" },
    { id: "schoolProfile", header: "School Profile", render: () => "Complete" },
    { id: "academicSetup", header: "Academic Setup", render: () => "Pending" },
    { id: "staffSetup", header: "Staff Setup", render: () => "Pending" },
    { id: "studentSetup", header: "Student Setup", render: () => "Pending" },
    { id: "financeSetup", header: "Finance Setup", render: () => "Pending" },
    { id: "overallProgress", header: "Overall Progress", render: (row) => row.invitation_status === "accepted" ? "40%" : "10%" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSchool(row)}>View Checklist</Button>
          <Button variant="ghost" size="sm" onClick={() => void sendReminder(row)} disabled={busyTenantId === row.id || !row.can_resend_invite}>{busyTenantId === row.id ? "Sending..." : "Send Reminder"}</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader title="Tenant Setup Progress" description="Monitor school readiness and identify setup gaps before operations begin." />
      {statusMessage ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          {statusMessage}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Setup Complete</div><div className="mt-2 text-2xl font-bold">{schools.filter(s => s.invitation_status === "accepted").length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Setup Incomplete</div><div className="mt-2 text-2xl font-bold">{schools.filter(s => s.invitation_status !== "accepted").length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Academic Year</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Staff Invited</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Students</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Fee Structure</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
      </div>
      <DataTable title="Setup Tracker" subtitle="Track readiness of all tenants." columns={columns} rows={schools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No setup records found."} />
      <Modal open={!!selectedSchool} title="Tenant Setup Checklist" onClose={() => setSelectedSchool(null)}>
        {selectedSchool ? (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold">{selectedSchool.schoolName}</div>
              <div className="text-sm text-muted-foreground">{selectedSchool.admin_email}</div>
            </div>
            <div className="space-y-2">
              {checklistForSchool(selectedSchool).map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-semibold">{item.label}</span>
                  <span className={item.status === "Complete" ? "text-green-700" : "text-amber-700"}>{item.status}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => router.push("/superadmin/tenants")}>Open Tenant</Button>
              {selectedSchool.can_resend_invite ? <Button onClick={() => void sendReminder(selectedSchool)} disabled={busyTenantId === selectedSchool.id}>{busyTenantId === selectedSchool.id ? "Sending..." : "Send Reminder"}</Button> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
