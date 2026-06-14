/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools } from "@/lib/platform/school-onboarding-client";

import { type PlatformSchool } from "@/lib/platform/school-onboarding-client";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const columns: DataTableColumn<PlatformSchool>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.school_name },
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
          <Button variant="ghost" size="sm">View</Button>
          {row.can_resend_invite && <Button variant="ghost" size="sm">Resend Invite</Button>}
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
            <Button variant="secondary">View Blocked</Button>
            <Button variant="secondary">Export Report</Button>
            <Button>Create School</Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {schools.slice(0, 4).map((school) => (
          <div key={school.tenant_id} className="bg-muted/50 p-4 rounded-xl border border-border">
            <h3 className="font-semibold text-sm mb-4">{school.invitation_status === "accepted" ? "Setup Complete" : "Pending Setup"}</h3>
            <div className="bg-background p-3 rounded-lg border border-border shadow-sm text-sm">
              <div className="font-medium">{school.school_name}</div>
              <div className="text-muted-foreground text-xs mt-1">Status: {school.status}</div>
            </div>
          </div>
        ))}
      </div>
      <DataTable title="All Onboarding Schools" subtitle="Detailed pipeline view." columns={columns} rows={schools} getRowKey={(row) => row.tenant_id} emptyMessage={isLoading ? "Loading..." : "No schools are currently onboarding."} />
    </div>
  );
}
