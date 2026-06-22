"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { Plus, Download } from "lucide-react";

export function CasesWorkspace() {
  const eventBus = useDashboardEventBus();
  const { data, isLoading } = useSchoolQuery<any[]>("/api/discipline/incidents");
  
  const records = data || [];

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
          title="Cases" 
          description="Manage Cases records and workflows." 
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> New Record</Button>
        </div>
      </div>
      
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Total Cases</p>
          <p className="mt-2 text-3xl font-bold">{records.length}</p>
        </Card>
      </section>

      <DataTable 
        title="Recent Cases" 
        subtitle="Archive of all related records." 
        columns={columns} 
        rows={records} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
