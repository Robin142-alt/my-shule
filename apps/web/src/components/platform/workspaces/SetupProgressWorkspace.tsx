/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools } from "@/lib/platform/school-onboarding-client";

export function SetupProgressWorkspace() {
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
    { id: "principal", header: "Principal", render: (row) => "Pending" },
    { id: "schoolProfile", header: "School Profile", render: (row) => "Complete" },
    { id: "academicSetup", header: "Academic Setup", render: (row) => "Pending" },
    { id: "staffSetup", header: "Staff Setup", render: (row) => "Pending" },
    { id: "studentSetup", header: "Student Setup", render: (row) => "Pending" },
    { id: "financeSetup", header: "Finance Setup", render: (row) => "Pending" },
    { id: "overallProgress", header: "Overall Progress", render: (row) => "10%" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">View Checklist</Button>
          <Button variant="ghost" size="sm">Send Reminder</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader title="Tenant Setup Progress" description="Monitor school readiness and identify setup gaps before operations begin." />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Setup Complete</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Setup Incomplete</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Academic Year</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Staff Invited</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Students</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">No Fee Structure</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
      </div>
      <DataTable title="Setup Tracker" subtitle="Track readiness of all tenants." columns={columns} rows={schools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No setup records found."} />
    </div>
  );
}
