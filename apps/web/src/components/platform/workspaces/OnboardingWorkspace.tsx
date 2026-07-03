/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools, resendPlatformSchoolAdminInvite } from "@/lib/platform/school-onboarding-client";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
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

  const visibleSchools = showBlockedOnly
    ? schools.filter((school) => {
        const status = String(school.invitation_status ?? "").toLowerCase();
        return status === "blocked" || status === "failed" || status === "expired" || school.invitation_failure_code;
      })
    : schools;

  async function handleResendInvite(school: any) {
    setBusyTenantId(school.id);
    setStatusMessage(null);
    try {
      const updated = await resendPlatformSchoolAdminInvite(school.id);
      setSchools((current) => current.map((item) => item.id === school.id ? { ...item, ...updated, id: updated.tenant_id, schoolName: updated.school_name } : item));
      setStatusMessage(`Principal invite resent for ${school.schoolName}.`);
    } catch (error) {
      if (!redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to resend the principal invite.");
      }
    } finally {
      setBusyTenantId(null);
    }
  }

  function exportOnboardingReport() {
    const rows = visibleSchools.map((school) => ({
      school_name: school.schoolName,
      tenant_id: school.id,
      subdomain: school.subdomain,
      admin_email: school.admin_email,
      invitation_status: school.invitation_status ?? "pending",
      status: school.status,
      created_at: school.created_at,
    }));
    const header = Object.keys(rows[0] ?? {
      school_name: "",
      tenant_id: "",
      subdomain: "",
      admin_email: "",
      invitation_status: "",
      status: "",
      created_at: "",
    });
    const csv = [
      header.join(","),
      ...rows.map((row) => header.map((key) => `"${String(row[key as keyof typeof row] ?? "").replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `myshule-onboarding-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${rows.length} onboarding record${rows.length === 1 ? "" : "s"}.`);
  }

  const columns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    { id: "subdomain", header: "Subdomain", render: (row) => row.subdomain },
    { id: "createdDate", header: "Created Date", render: (row) => new Date(row.created_at).toLocaleDateString() },
    { id: "adminEmail", header: "Admin Email", render: (row) => row.admin_email },
    { id: "invitationStatus", header: "Invite Status", render: (row) => row.invitation_status || "Pending" },
    { id: "status", header: "Status", render: (row) => row.status },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSchool(row)}>View</Button>
          {row.can_resend_invite && <Button variant="ghost" size="sm" onClick={() => void handleResendInvite(row)} disabled={busyTenantId === row.id}>{busyTenantId === row.id ? "Sending..." : "Resend Invite"}</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="New School Onboarding" 
        description="Track new schools from tenant creation to operational readiness." 
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBlockedOnly((current) => !current)}>{showBlockedOnly ? "View All" : "View Blocked"}</Button>
            <Button variant="secondary" onClick={exportOnboardingReport}>Export Report</Button>
            <Button onClick={() => router.push("/superadmin/tenants")}>Create School</Button>
          </div>
        }
      />
      {statusMessage ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          {statusMessage}
        </div>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleSchools.slice(0, 4).map((school) => (
          <div key={school.id} className="bg-muted/50 p-4 rounded-xl border border-border">
            <h3 className="font-semibold text-sm mb-4">{school.invitation_status === "accepted" ? "Setup Complete" : "Pending Setup"}</h3>
            <div className="bg-background p-3 rounded-lg border border-border shadow-sm text-sm">
              <div className="font-medium">{school.schoolName}</div>
              <div className="text-muted-foreground text-xs mt-1">Status: {school.status}</div>
            </div>
          </div>
        ))}
      </div>
      <DataTable title={showBlockedOnly ? "Blocked Onboarding Schools" : "All Onboarding Schools"} subtitle="Detailed pipeline view." columns={columns} rows={visibleSchools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : showBlockedOnly ? "No blocked onboarding records." : "No schools are currently onboarding."} />

      <Modal open={!!selectedSchool} title="Onboarding Details" onClose={() => setSelectedSchool(null)}>
        {selectedSchool ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">School:</span> {selectedSchool.schoolName}</div>
            <div><span className="font-semibold">Tenant:</span> {selectedSchool.id}</div>
            <div><span className="font-semibold">Subdomain:</span> {selectedSchool.subdomain}</div>
            <div><span className="font-semibold">Principal email:</span> {selectedSchool.admin_email}</div>
            <div><span className="font-semibold">Invite status:</span> {selectedSchool.invitation_status ?? "Pending"}</div>
            <div><span className="font-semibold">Invite message:</span> {selectedSchool.invitation_message ?? "No invite message recorded."}</div>
            {selectedSchool.invitation_action_required ? <div><span className="font-semibold">Action required:</span> {selectedSchool.invitation_action_required}</div> : null}
            <div className="flex justify-end gap-2 pt-4">
              {selectedSchool.can_resend_invite ? <Button variant="secondary" onClick={() => void handleResendInvite(selectedSchool)} disabled={busyTenantId === selectedSchool.id}>{busyTenantId === selectedSchool.id ? "Sending..." : "Resend Invite"}</Button> : null}
              <Button onClick={() => router.push("/superadmin/tenants")}>Open Tenants</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
