"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { DisciplineWorkspaceActions } from "./shared";

export function OverviewWorkspace() {
  const { data: dashboardData, isLoading: dashboardLoading } = useSchoolQuery<any>("/api/discipline/dashboard");
  const { data: incidentsData, isLoading: incidentsLoading } = useSchoolQuery<any[]>("/api/discipline/incidents");
  
  const openCases = dashboardData?.kpis?.[0]?.value ?? 0;
  const newToday = dashboardData?.kpis?.[1]?.value ?? 0;
  const pendingParent = dashboardData?.kpis?.[2]?.value ?? 0;
  const pendingApproval = dashboardData?.kpis?.[3]?.value ?? 0;

  const records = incidentsData || [];

  const columns: DataTableColumn<any>[] = [
    { id: "id", header: "Incident ID", render: (row: any) => <span className="font-semibold">{row.incident_number || row.id?.slice(-8) || row.id}</span> },
    { id: "date", header: "Date", render: (row: any) => row.occurred_at ? new Date(row.occurred_at).toLocaleDateString() : (row.date || "—") },
    { id: "details", header: "Details", render: (row: any) => row.title || row.description || row.details || "—" },
    { id: "status", header: "Status", render: (row: any) => <StatusPill label={row.status || "Pending"} tone={row.status?.toLowerCase() === 'resolved' || row.status?.toLowerCase() === 'closed' ? 'ok' : 'warning'} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          eyebrow="Discipline & Welfare" 
          title="Overview" 
          description="Overview of school discipline incidents and actions." 
        />
        <DisciplineWorkspaceActions title="Overview" records={records} />
      </div>
      
      <section className="app-metric-grid grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Open Cases</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{dashboardLoading ? "..." : openCases}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">New Today</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{dashboardLoading ? "..." : newToday}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Pending Parent</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{dashboardLoading ? "..." : pendingParent}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Pending Approval</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{dashboardLoading ? "..." : pendingApproval}</p>
        </Card>
      </section>

      <DataTable 
        title="Recent Incidents" 
        subtitle="Archive of all related records." 
        columns={columns} 
        rows={records} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
