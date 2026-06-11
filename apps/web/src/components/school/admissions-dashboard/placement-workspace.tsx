"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsPlacementWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.allocations || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "application", header: "Application ID", render: (row) => row.applicationId },
    { id: "class", header: "Class", render: (row) => row.assignedClass },
    { id: "stream", header: "Stream", render: (row) => row.assignedStream },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "confirmed" ? "ok" : "warning"} /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Class Allocations</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Class Allocations"
        subtitle="Class and stream allocation for new students."
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
