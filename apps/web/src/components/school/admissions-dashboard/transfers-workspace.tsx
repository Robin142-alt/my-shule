"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsTransfersWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.transfers || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "student", header: "Student Name", render: (row) => row.studentName },
    { id: "type", header: "Transfer Type", render: (row) => <StatusPill label={row.transferType} tone="ok" /> },
    { id: "school", header: "Previous/Next School", render: (row) => row.transferSchool }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Transfers & Re-admissions</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Transfers & Re-admissions"
        subtitle="History of incoming and outgoing transfers."
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
