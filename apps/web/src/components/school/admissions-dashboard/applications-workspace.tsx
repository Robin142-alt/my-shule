"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsApplicationsWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.applications || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "applicant", header: "Applicant", render: (row) => row.studentName || "Unknown" },
    { id: "class", header: "Target Class", render: (row) => row.className || "Unassigned" },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || "Pending"} tone={row.status === "approved" ? "ok" : "warning"} /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Applications</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Applications"
        subtitle="Review submitted admission applications."
        rows={data}
        columns={columns}
        loading={false}
        getRowId={(row) => row.id}
        totalRows={data.length}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    </div>
  );
}
