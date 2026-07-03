"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { DisciplineWorkspaceActions } from "./shared";

export function AuditTrailWorkspace() {
  const { data, isLoading } = useSchoolQuery<any[]>("/discipline/audit-trail");
  
  const records = data || [];

  const columns: DataTableColumn<any>[] = [
    { id: "id", header: "ID", render: (row: any) => <span className="font-semibold">{row.id}</span> },
    { id: "date", header: "Date", render: (row: any) => row.date },
    { id: "details", header: "Details", render: (row: any) => row.details },
    { id: "status", header: "Status", render: (row: any) => <StatusPill label={row.status || "Pending"} tone="warning" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          eyebrow="Discipline & Welfare" 
          title="Audit Trail" 
          description="Manage Audit Trail records and workflows." 
        />
        <DisciplineWorkspaceActions title="Audit Trail" records={records} />
      </div>
      
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Total Records</p>
          <p className="mt-2 text-3xl font-bold">{records.length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Action Required</p>
          <p className="mt-2 text-3xl font-bold text-warning">0</p>
        </Card>
      </section>

      <DataTable 
        title="Recent Audit Trail" 
        subtitle="Archive of all related records." 
        columns={columns} 
        rows={records} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
