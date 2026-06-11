"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsTasksWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.tasks || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "task", header: "Task", render: (row) => row.title },
    { id: "due", header: "Due Date", render: (row) => row.dueDate },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="warning" /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Tasks & Follow-ups</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Tasks & Follow-ups"
        subtitle="Admission officer workflow tasks."
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
