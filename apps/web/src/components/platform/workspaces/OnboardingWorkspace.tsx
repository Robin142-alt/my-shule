/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools } from "@/lib/platform/school-onboarding-client";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
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

  const columns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    { id: "county", header: "County", render: (row) => row.county || "N/A" },
    { id: "createdDate", header: "Created Date", render: (row) => new Date().toLocaleDateString() },
    { id: "principal", header: "Principal", render: (row) => "Pending" },
    { id: "stage", header: "Current Stage", render: (row) => "Setup In Progress" },
    { id: "setupPercentage", header: "Setup %", render: (row) => "25%" },
    { id: "blocker", header: "Blocker", render: (row) => "None" },
    { id: "lastActivity", header: "Last Activity", render: (row) => "Today" },
    { id: "supportOwner", header: "Support Owner", render: (row) => "Unassigned" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">View</Button>
          <Button variant="ghost" size="sm">Invite Principal</Button>
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
        {["School Created", "Principal Invite Pending", "Principal Accepted", "Setup In Progress"].map((col) => (
          <div key={col} className="bg-muted/50 p-4 rounded-xl border border-border">
            <h3 className="font-semibold text-sm mb-4">{col}</h3>
            <div className="bg-background p-3 rounded-lg border border-border shadow-sm text-sm">
              <div className="font-medium">Demo High School</div>
              <div className="text-muted-foreground text-xs mt-1">Pending setup...</div>
            </div>
          </div>
        ))}
      </div>
      <DataTable title="All Onboarding Schools" subtitle="Detailed pipeline view." columns={columns} rows={schools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No schools are currently onboarding."} />
    </div>
  );
}
